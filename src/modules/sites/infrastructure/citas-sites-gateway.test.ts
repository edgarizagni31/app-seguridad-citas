import { createHttpClient } from '@/shared/infrastructure';

import { createCitasSitesGateway } from './citas-sites-gateway';

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
    baseUrl: 'https://citas.test/api/',
    appVersion: '1.0.0',
    platform: 'android',
    createCorrelationId: () => 'corr',
    fetchFn: fetchFn as unknown as typeof fetch,
    getAccessToken: async () => 'id-token',
  });
  const request = () => {
    const [url, init] = fetchFn.mock.calls[0] ?? [];
    return { url, init, headers: (init?.headers ?? {}) as Record<string, string> };
  };
  return { gateway: createCitasSitesGateway(http), request };
}

const headquarter = (headquarterId: string, headquarterTypeDescription: string | null) => ({
  id: '00000000-0000-0000-0000-000000000000',
  headquarterId,
  headquarterTypeId: headquarterId,
  headquarterTypeDescription,
});

const envelope = (list: unknown[]) => ({
  message: null,
  data: { accessAllBusiness: true, userHeadquarterList: list, userHeadquarterDetailList: [] },
});

describe('citasSitesGateway.listMySites', () => {
  it('consulta las sedes del usuario con su token', async () => {
    const { gateway, request } = setup({ status: 200, body: envelope([]) });

    await gateway.listMySites();

    const { url, init, headers } = request();
    expect(url).toBe(
      'https://citas.test/api/operation/UserHeadquarter/ListUserHeadquarterByUserId',
    );
    expect(init?.method).toBe('GET');
    expect(headers.Authorization).toBe('Bearer id-token');
  });

  it('devuelve las sedes con nombre limpio, sin repetidas y en orden alfabético', async () => {
    const { gateway } = setup({
      status: 200,
      body: envelope([
        headquarter('hq-2', 'RANSA LURIN '),
        headquarter('hq-1', 'Ransa Apopa'),
        headquarter('hq-2', 'RANSA LURIN'),
        headquarter('hq-3', null),
      ]),
    });

    expect(await gateway.listMySites()).toEqual({
      ok: true,
      value: [
        { id: 'hq-1', name: 'Ransa Apopa' },
        { id: 'hq-2', name: 'RANSA LURIN' },
      ],
    });
  });

  it('sin red o con timeout falla con network', async () => {
    const { gateway } = setup(new TypeError('Network request failed'));

    expect(await gateway.listMySites()).toEqual({ ok: false, error: { type: 'network' } });
  });

  it('token rechazado falla con unauthorized', async () => {
    const { gateway } = setup({ status: 401 });

    expect(await gateway.listMySites()).toEqual({ ok: false, error: { type: 'unauthorized' } });
  });

  it('un error del servidor o una respuesta inesperada fallan con unknown', async () => {
    const server = await setup({ status: 500, body: { message: 'Error' } }).gateway.listMySites();
    const invalid = await setup({ status: 200, body: { data: {} } }).gateway.listMySites();

    expect(!server.ok && server.error.type).toBe('unknown');
    expect(!invalid.ok && invalid.error.type).toBe('unknown');
  });
});
