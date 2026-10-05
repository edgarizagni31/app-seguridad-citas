import type { Credentials } from '../domain';
import { createHttpClient } from '@/shared/infrastructure';
import { decodeBase64Utf8 } from '@/shared/lib';
import { buildTokens } from '@/test/factories/auth';

import { createR360AuthGateway } from './r360-auth-gateway';

type FakeResponse = { status: number; body?: unknown };

function setup(response: FakeResponse | Error) {
  const fetchFn = jest.fn(async (_url: string, _init?: RequestInit) => {
    if (response instanceof Error) throw response;
    return {
      status: response.status,
      ok: response.status >= 200 && response.status < 300,
      text: async () => (response.body === undefined ? '' : JSON.stringify(response.body)),
    } as Response;
  });
  const http = createHttpClient({
    baseUrl: 'https://api-360v2.test',
    appVersion: '1.0.0',
    platform: 'android',
    createCorrelationId: () => 'corr',
    fetchFn: fetchFn as unknown as typeof fetch,
    getAccessToken: async () => 'no-debe-usarse',
  });
  const request = () => {
    const [url, init] = fetchFn.mock.calls[0] ?? [];
    return { url, init, headers: (init?.headers ?? {}) as Record<string, string> };
  };
  return { gateway: createR360AuthGateway(http), request };
}

const credentials = { email: 'josé@empresa.com', password: 'Clave#2026' } as Credentials;

describe('r360AuthGateway.login', () => {
  const okBody = { idToken: 'id', refreshToken: 'refresh', newPasswordRequired: false, user: {} };

  it('envía las credenciales como Base64 de JSON y sin cuerpo', async () => {
    const { gateway, request } = setup({ status: 200, body: okBody });

    await gateway.login(credentials);

    const { url, init, headers } = request();
    expect(url).toBe('https://api-360v2.test/auth/login');
    expect(init?.method).toBe('POST');
    expect(init?.body).toBeUndefined();
    const encoded = headers.Authorization?.replace('Bearer ', '') ?? '';
    expect(JSON.parse(decodeBase64Utf8(encoded))).toEqual({
      email: 'josé@empresa.com',
      password: 'Clave#2026',
    });
  });

  it('devuelve los tokens', async () => {
    const { gateway } = setup({ status: 200, body: okBody });

    expect(await gateway.login(credentials)).toEqual({
      ok: true,
      value: { idToken: 'id', refreshToken: 'refresh' },
    });
  });

  it('exige cambio de contraseña cuando R360 lo indica', async () => {
    const { gateway } = setup({ status: 200, body: { ...okBody, newPasswordRequired: true } });

    expect(await gateway.login(credentials)).toEqual({
      ok: false,
      error: { type: 'password-change-required' },
    });
  });

  it.each([400, 401, 403])('traduce %s a credenciales inválidas', async (status) => {
    const { gateway } = setup({ status, body: { message: 'Usuario o clave incorrectos' } });

    expect(await gateway.login(credentials)).toEqual({
      ok: false,
      error: { type: 'invalid-credentials' },
    });
  });

  it('traduce fallos de red', async () => {
    const { gateway } = setup(new TypeError('Network request failed'));

    expect(await gateway.login(credentials)).toMatchObject({
      ok: false,
      error: { type: 'network' },
    });
  });

  it.each([
    ['error del servidor', { status: 500 }],
    ['demasiadas solicitudes', { status: 429 }],
    ['respuesta inesperada', { status: 200, body: { token: 'x' } }],
  ])('traduce %s a error desconocido', async (_case, response) => {
    const { gateway } = setup(response);

    expect(await gateway.login(credentials)).toMatchObject({
      ok: false,
      error: { type: 'unknown' },
    });
  });
});

describe('r360AuthGateway.refresh', () => {
  it('envía idToken y refreshToken en sus headers sin token de sesión', async () => {
    const { gateway, request } = setup({
      status: 200,
      body: { idToken: 'nuevo', refreshToken: 'r2' },
    });

    const result = await gateway.refresh(buildTokens());

    expect(request().url).toBe('https://api-360v2.test/auth/refresh-token');
    expect(request().headers).toMatchObject({
      Authorization: 'Bearer id-token-1',
      authorizationrefresh: 'Bearer refresh-token-1',
    });
    expect(result).toEqual({ ok: true, value: { idToken: 'nuevo', refreshToken: 'r2' } });
  });

  it('conserva el refreshToken si R360 no envía uno nuevo', async () => {
    const { gateway } = setup({ status: 200, body: { idToken: 'nuevo' } });

    expect(await gateway.refresh(buildTokens())).toEqual({
      ok: true,
      value: { idToken: 'nuevo', refreshToken: 'refresh-token-1' },
    });
  });

  it('un rechazo significa sesión expirada', async () => {
    const { gateway } = setup({ status: 401 });

    expect(await gateway.refresh(buildTokens())).toEqual({
      ok: false,
      error: { type: 'session-expired' },
    });
  });
});
