import { createHttpClient } from '@/shared/infrastructure';

import { createCitasGateGateway } from './citas-gate-gateway';

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
    return { url, body: JSON.parse(String(init?.body ?? 'null')) as unknown };
  };
  return { gateway: createCitasGateGateway(http), request };
}

const data = (value: unknown) => ({ status: 200, body: { data: value } });

const document = (overrides: Record<string, unknown> = {}) => ({
  id: 'doc-1',
  documentConfigurationId: null,
  documentName: 'SOAT',
  status: 3,
  expiresAt: '2027-01-01T00:00:00',
  fileUrl: 'https://s3.test/soat.jpg',
  uploadedAt: null,
  ...overrides,
});

const VALIDATE = {
  found: true,
  reason: null,
  displayMessage: 'Cita encontrada.',
  voucher: {
    id: 'voucher-1',
    code: 'APPASP0000000000000093',
    stateId: 'state',
    isEligible: true,
    headquarterId: 'hq',
    countryId: 'pe',
    timeZoneId: 'America/Lima',
    scheduledStartUtc: '2026-10-28T14:30:00Z',
    scheduledEndUtc: '2026-10-28T16:00:00Z',
    scheduledStartLocal: '2026-10-28T09:30:00',
    scheduledEndLocal: '2026-10-28T11:00:00',
    withinWindow: true,
  },
  client: { id: 'c', name: 'DELOSI', documentNumber: '20100' },
  supplier: null,
  units: [
    {
      voucherTransportUnitId: 'vtu-1',
      transportUnitId: 'tu-1',
      plateNumber: 'ABC-123',
      normalizedPlate: 'ABC123',
      hasDriver: true,
      driverVoucherVisitorId: 'vv-luis',
      driverVisitorId: 'v-luis',
      driverName: 'Luis Hernández',
      driverDocumentNumber: '04512378',
      documents: [document()],
    },
    {
      voucherTransportUnitId: 'vtu-2',
      transportUnitId: 'tu-2',
      plateNumber: null,
      normalizedPlate: 'XYZ789',
      hasDriver: false,
      driverVoucherVisitorId: null,
      driverVisitorId: null,
      driverName: null,
      driverDocumentNumber: null,
      documents: [],
    },
  ],
  visitors: [
    {
      voucherVisitorId: 'vv-luis',
      visitorId: 'v-luis',
      name: 'Luis Hernández',
      documentNumber: '04512378',
      visitorStatus: 'Enabled',
      isEnabled: true,
      isConductor: true,
      documents: [document({ id: 'dni', documentName: 'DNI', fileUrl: null })],
    },
    {
      voucherVisitorId: 'vv-ana',
      visitorId: 'v-ana',
      name: null,
      documentNumber: null,
      visitorStatus: 'Disabled',
      isEnabled: false,
      isConductor: false,
      documents: null,
    },
  ],
};

describe('citasGateGateway.lookup', () => {
  it('envía el QR y traduce la cita al dominio', async () => {
    const { gateway, request } = setup(data(VALIDATE));

    const result = await gateway.lookup('442c766389044391b4f59d2d5518c4a0');

    expect(request()).toEqual({
      url: 'https://citas.test/api/appointment/AccessControl/ValidateGatePresentation',
      body: { qrCode: '442c766389044391b4f59d2d5518c4a0' },
    });
    if (!result.ok || !result.value.found) throw new Error('se esperaba la cita');
    const { appointment } = result.value;
    expect(appointment).toMatchObject({
      voucherId: 'voucher-1',
      code: 'APPASP0000000000000093',
      eligible: true,
      timeZoneId: 'America/Lima',
      windowStart: '2026-10-28T09:30:00',
      windowEnd: '2026-10-28T11:00:00',
      withinWindow: true,
      clientName: 'DELOSI',
      supplierName: null,
    });
    expect(appointment.units).toEqual([
      {
        id: 'vtu-1',
        transportUnitId: 'tu-1',
        plate: 'ABC-123',
        normalizedPlate: 'ABC123',
        driver: { personId: 'vv-luis', name: 'Luis Hernández', documentNumber: '04512378' },
        documents: [
          {
            id: 'doc-1',
            name: 'SOAT',
            status: 3,
            expiresAt: '2027-01-01T00:00:00',
            fileUrl: 'https://s3.test/soat.jpg',
          },
        ],
      },
      expect.objectContaining({ id: 'vtu-2', plate: 'XYZ789', driver: null, documents: [] }),
    ]);
    expect(appointment.people).toEqual([
      expect.objectContaining({ id: 'vv-luis', isConductor: true, enabled: true }),
      {
        id: 'vv-ana',
        name: '—',
        documentNumber: null,
        status: 'Disabled',
        enabled: false,
        isConductor: false,
        documents: [],
      },
    ]);
  });

  it('una cita no encontrada llega con 200 y su mensaje', async () => {
    const { gateway } = setup(
      data({
        found: false,
        reason: 'VOUCHER_NOT_FOUND',
        displayMessage: 'No se encontró la cita.',
        voucher: null,
        client: null,
        supplier: null,
        units: [],
        visitors: [],
      }),
    );

    expect(await gateway.lookup('x')).toEqual({
      ok: true,
      value: { found: false, reason: 'VOUCHER_NOT_FOUND', message: 'No se encontró la cita.' },
    });
  });
});

describe('citasGateGateway.register', () => {
  it('manda los modos como número y ordena los resultados por índice', async () => {
    const { gateway, request } = setup(
      data({
        allRegistered: false,
        registeredCount: 1,
        rejectedCount: 1,
        results: [
          {
            index: 1,
            registered: false,
            rejectionReason: 'VISITOR_BLACKLISTED',
            displayMessage: 'Tiene un veto vigente.',
            visitorAccessId: null,
            transportUnitAccessId: null,
            scanLogId: null,
          },
          {
            index: 0,
            registered: true,
            rejectionReason: null,
            displayMessage: 'Llegada registrada.',
            visitorAccessId: 'va-luis',
            transportUnitAccessId: 'tua-1',
            scanLogId: 'log',
          },
        ],
      }),
    );

    const result = await gateway.register('voucher-1', [
      { mode: 'vehicular', unitId: 'vtu-1', driverDocument: null },
      { mode: 'pedestrian', personId: 'vv-raul' },
    ]);

    expect(request()).toEqual({
      url: 'https://citas.test/api/appointment/AccessControl/RegisterGatePresentation',
      body: {
        voucherId: 'voucher-1',
        items: [
          {
            mode: 1,
            voucherTransportUnitId: 'vtu-1',
            driverDocumentNumber: null,
            voucherVisitorId: null,
            documentNumber: null,
          },
          {
            mode: 2,
            voucherTransportUnitId: null,
            driverDocumentNumber: null,
            voucherVisitorId: 'vv-raul',
            documentNumber: null,
          },
        ],
      },
    });
    expect(result).toEqual({
      ok: true,
      value: [
        {
          registered: true,
          unitAccessId: 'tua-1',
          personAccessId: 'va-luis',
          message: 'Llegada registrada.',
        },
        { registered: false, reason: 'VISITOR_BLACKLISTED', message: 'Tiene un veto vigente.' },
      ],
    });
  });
});

describe('citasGateGateway.confirm', () => {
  it('envía los ids de acceso y devuelve la hora de ingreso', async () => {
    const { gateway, request } = setup(
      data({
        confirmedUnits: 1,
        confirmedVisitors: 2,
        entryDateTime: '2026-10-28T15:40:00+00:00',
        displayMessage: 'Ingreso confirmado.',
      }),
    );

    const result = await gateway.confirm({
      voucherId: 'voucher-1',
      unitAccessIds: ['tua-1'],
      personAccessIds: ['va-luis', 'va-ana'],
    });

    expect(request()).toEqual({
      url: 'https://citas.test/api/appointment/AccessControl/ConfirmEntrySession',
      body: {
        voucherId: 'voucher-1',
        transportUnitAccessIds: ['tua-1'],
        visitorAccessIds: ['va-luis', 'va-ana'],
      },
    });
    expect(result).toEqual({
      ok: true,
      value: {
        confirmedUnits: 1,
        confirmedVisitors: 2,
        enteredAt: '2026-10-28T15:40:00+00:00',
        message: 'Ingreso confirmado.',
      },
    });
  });

  it('un 400 del negocio (fuera de ventana) llega como rechazo con su mensaje', async () => {
    const { gateway } = setup({
      status: 400,
      body: { statusCode: 400, message: 'Fuera de la ventana de ingreso.', warning: false },
    });

    expect(
      await gateway.confirm({ voucherId: 'v', unitAccessIds: ['a'], personAccessIds: [] }),
    ).toEqual({
      ok: false,
      error: { type: 'rejected', message: 'Fuera de la ventana de ingreso.' },
    });
  });
});

describe('errores de transporte', () => {
  it.each([
    ['sin red', new TypeError('Network request failed'), 'network'],
    ['token rechazado', { status: 401 }, 'unauthorized'],
    ['error del servidor', { status: 500, body: { message: 'boom' } }, 'unknown'],
    ['respuesta inesperada', { status: 200, body: { data: { found: 'sí' } } }, 'unknown'],
  ] as const)('%s', async (_case, response, type) => {
    const { gateway } = setup(response as FakeResponse | Error);

    const lookup = await gateway.lookup('x');
    const register = await gateway.register('v', [{ mode: 'pedestrian', personId: 'p' }]);

    expect(!lookup.ok && lookup.error.type).toBe(type);
    expect(!register.ok && register.error.type).toBe(type);
  });
});
