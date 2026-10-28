import type {
  GateAppointment,
  GateDocument,
  GatePerson,
  GateUnit,
} from '@/modules/access-control/domain';

export const buildDocument = (overrides: Partial<GateDocument> = {}): GateDocument => ({
  id: 'doc-1',
  name: 'DNI',
  status: 3,
  expiresAt: null,
  fileUrl: 'https://files.test/dni.jpg',
  ...overrides,
});

export const buildPerson = (overrides: Partial<GatePerson> = {}): GatePerson => ({
  id: 'vv-ana',
  name: 'Ana Torres',
  documentNumber: '12345678',
  status: 'Enabled',
  enabled: true,
  isConductor: false,
  documents: [buildDocument()],
  ...overrides,
});

export const buildUnit = (overrides: Partial<GateUnit> = {}): GateUnit => ({
  id: 'vtu-1',
  transportUnitId: 'tu-1',
  plate: 'ABC-123',
  normalizedPlate: 'ABC123',
  driver: { personId: 'vv-luis', name: 'Luis Hernández', documentNumber: '04512378' },
  documents: [buildDocument({ id: 'doc-tc', name: 'Tarjeta de circulación' })],
  ...overrides,
});

const LUIS = buildPerson({
  id: 'vv-luis',
  name: 'Luis Hernández',
  documentNumber: '04512378',
  isConductor: true,
});

export const buildAppointment = (overrides: Partial<GateAppointment> = {}): GateAppointment => ({
  voucherId: 'voucher-1',
  code: 'APPASP0000000000000093',
  eligible: true,
  message: 'Cita encontrada.',
  timeZoneId: 'America/El_Salvador',
  windowStart: '2026-10-28T09:30:00',
  windowEnd: '2026-10-28T11:00:00',
  withinWindow: true,
  clientName: 'DELOSI',
  supplierName: null,
  units: [
    buildUnit(),
    buildUnit({
      id: 'vtu-2',
      transportUnitId: 'tu-2',
      plate: 'XYZ-789',
      normalizedPlate: 'XYZ789',
      driver: null,
    }),
  ],
  people: [
    LUIS,
    buildPerson(),
    buildPerson({ id: 'vv-pedro', name: 'Pedro Rojas', documentNumber: '87654321' }),
    buildPerson({
      id: 'vv-raul',
      name: 'Raúl Pineda',
      documentNumber: '99887766',
      status: 'Disabled',
      enabled: false,
    }),
  ],
  ...overrides,
});
