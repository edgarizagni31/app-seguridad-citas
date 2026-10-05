import { z } from 'zod';

import { createHttpClient, type HttpClientConfig } from './http-client';

type FakeResponse = { status: number; body?: unknown };

const serialize = (body: unknown) =>
  body === undefined ? '' : typeof body === 'string' ? body : JSON.stringify(body);

const toResponse = ({ status, body }: FakeResponse) =>
  ({ status, ok: status >= 200 && status < 300, text: async () => serialize(body) }) as Response;

function setup(responses: FakeResponse[], overrides: Partial<HttpClientConfig> = {}) {
  const queue = [...responses];
  const fetchFn = jest.fn(async (_url: string, _init?: RequestInit) =>
    toResponse(queue.shift() ?? { status: 500 }),
  );
  const client = createHttpClient({
    baseUrl: 'https://api.test/api/',
    appVersion: '1.0.0',
    platform: 'android',
    createCorrelationId: () => 'corr-1',
    fetchFn: fetchFn as unknown as typeof fetch,
    ...overrides,
  });
  const call = (index = 0) => {
    const [url, init] = fetchFn.mock.calls[index] ?? [];
    return { url, init, headers: (init?.headers ?? {}) as Record<string, string> };
  };
  return { client, fetchFn, call };
}

const itemSchema = z.object({ id: z.number() });
const get = { method: 'GET', url: 'items', schema: itemSchema } as const;

describe('createHttpClient', () => {
  it('une baseUrl y ruta, agrega query y omite valores undefined', async () => {
    const { client, call } = setup([{ status: 200, body: { id: 1 } }]);

    await client.request({ ...get, url: '/items', query: { q: 'a b', page: 2, x: undefined } });

    expect(call().url).toBe('https://api.test/api/items?q=a+b&page=2');
  });

  it('respeta URLs absolutas', async () => {
    const { client, call } = setup([{ status: 200, body: { id: 1 } }]);

    await client.request({ ...get, url: 'https://otro.test/x' });

    expect(call().url).toBe('https://otro.test/x');
  });

  it('envía headers de trazabilidad, token y cuerpo JSON', async () => {
    const { client, call } = setup([{ status: 200, body: { id: 1 } }], {
      getAccessToken: async () => 'token-1',
    });

    await client.request({ ...get, method: 'POST', body: { a: 1 } });

    expect(call().headers).toMatchObject({
      'X-Correlation-Id': 'corr-1',
      'X-App-Version': '1.0.0',
      'X-Platform': 'android',
      'Content-Type': 'application/json',
      Authorization: 'Bearer token-1',
    });
    expect(call().init?.body).toBe('{"a":1}');
  });

  it('no envía token en peticiones no autenticadas', async () => {
    const { client, call } = setup([{ status: 200, body: { id: 1 } }], {
      getAccessToken: async () => 'token-1',
    });

    await client.request({ ...get, authenticated: false });

    expect(call().headers.Authorization).toBeUndefined();
  });

  it('valida y devuelve el cuerpo tipado', async () => {
    const { client } = setup([{ status: 200, body: { id: 7 } }]);

    expect(await client.request(get)).toEqual({ ok: true, value: { id: 7 } });
  });

  it('desenvuelve JsonSuccessResult', async () => {
    const { client } = setup([{ status: 200, body: { data: { id: 3 }, message: null } }]);

    const result = await client.request({ ...get, unwrapEnvelope: true });

    expect(result).toEqual({ ok: true, value: { id: 3 } });
  });

  it('devuelve invalid-response si el cuerpo no cumple el esquema', async () => {
    const { client } = setup([{ status: 200, body: { id: 'x' } }]);

    expect(await client.request(get)).toMatchObject({
      ok: false,
      error: { type: 'invalid-response' },
    });
  });

  it('devuelve invalid-response si el cuerpo no es JSON', async () => {
    const { client } = setup([{ status: 200, body: '<html>' }]);

    expect(await client.request(get)).toMatchObject({
      ok: false,
      error: { type: 'invalid-response' },
    });
  });

  it('traduce errores HTTP con el mensaje del backend', async () => {
    const { client } = setup([
      { status: 400, body: { statusCode: 400, message: 'Placa inválida' } },
    ]);

    expect(await client.request(get)).toEqual({
      ok: false,
      error: { type: 'http', status: 400, message: 'Placa inválida' },
    });
  });

  it('traduce fallos de red', async () => {
    const failingFetch = async () => {
      throw new TypeError('Network request failed');
    };
    const { client } = setup([], { fetchFn: failingFetch as unknown as typeof fetch });

    expect(await client.request(get)).toMatchObject({ ok: false, error: { type: 'network' } });
  });

  it('corta por timeout', async () => {
    const hangingFetch = (_url: string, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
      });
    const { client } = setup([], { fetchFn: hangingFetch as unknown as typeof fetch });

    const result = await client.request({ ...get, timeoutMs: 10 });

    expect(result).toEqual({ ok: false, error: { type: 'timeout' } });
  });

  describe('ante un 401', () => {
    it('renueva la sesión una vez y reintenta', async () => {
      const onUnauthorized = jest.fn(async () => true);
      const { client, fetchFn } = setup([{ status: 401 }, { status: 200, body: { id: 1 } }], {
        onUnauthorized,
      });

      expect(await client.request(get)).toEqual({ ok: true, value: { id: 1 } });
      expect(onUnauthorized).toHaveBeenCalledTimes(1);
      expect(fetchFn).toHaveBeenCalledTimes(2);
    });

    it('no reintenta más de una vez', async () => {
      const { client, fetchFn } = setup([{ status: 401 }, { status: 401 }], {
        onUnauthorized: async () => true,
      });

      expect(await client.request(get)).toMatchObject({
        ok: false,
        error: { type: 'unauthorized' },
      });
      expect(fetchFn).toHaveBeenCalledTimes(2);
    });

    it('no reintenta si la renovación falla', async () => {
      const { client, fetchFn } = setup([{ status: 401 }], { onUnauthorized: async () => false });

      expect(await client.request(get)).toMatchObject({
        ok: false,
        error: { type: 'unauthorized' },
      });
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    it('no intenta renovar en peticiones no autenticadas', async () => {
      const onUnauthorized = jest.fn(async () => true);
      const { client } = setup([{ status: 401 }], { onUnauthorized });

      await client.request({ ...get, authenticated: false });

      expect(onUnauthorized).not.toHaveBeenCalled();
    });
  });
});
