import type {
  GateAppointment,
  GateDocument,
  GatePerson,
  GatePresentationGateway,
  GateUnit,
  PresentationItem,
  PresentationResult,
} from '../domain';
import { err, normalizeDocument, ok, type Clock } from '@/shared/domain';

// QR de cita de la demo (32 hex, como AppointmentScheduledVoucher.QrCode); los usa scripts/generate-test-qrs.mjs
export const DEMO_APPOINTMENT_QRS = {
  delosi: 'd0e1051000000000000000000000a093',
  dollarCity: 'd0e1051000000000000000000000a087',
  notEligible: 'd0e1051000000000000000000000a094',
  outsideWindow: 'd0e1051000000000000000000000a095',
} as const;

const doc = (id: string, name: string, overrides: Partial<GateDocument> = {}): GateDocument => ({
  id,
  name,
  status: 3,
  expiresAt: '2027-06-30T00:00:00',
  fileUrl: null,
  ...overrides,
});

const person = (
  id: string,
  name: string,
  documentNumber: string,
  overrides: Partial<GatePerson> = {},
): GatePerson => ({
  id,
  name,
  documentNumber,
  status: 'Enabled',
  enabled: true,
  isConductor: false,
  documents: [doc(`${id}-dni`, 'DNI')],
  ...overrides,
});

const driver = (id: string, name: string, documentNumber: string) =>
  person(id, name, documentNumber, {
    isConductor: true,
    documents: [
      doc(`${id}-dni`, 'DNI'),
      doc(`${id}-lic`, 'Licencia de conducir'),
      doc(`${id}-med`, 'Examen médico'),
    ],
  });

const unit = (
  id: string,
  plate: string,
  driverOf: GatePerson | null,
  documents?: GateDocument[],
): GateUnit => ({
  id,
  transportUnitId: `tu-${id}`,
  plate,
  normalizedPlate: plate.replace(/[^A-Z0-9]/gi, '').toUpperCase(),
  driver: driverOf
    ? { personId: driverOf.id, name: driverOf.name, documentNumber: driverOf.documentNumber }
    : null,
  documents: documents ?? [
    doc(`${id}-tc`, 'Tarjeta de circulación'),
    doc(`${id}-soat`, 'SOAT'),
    doc(`${id}-rt`, 'Revisión técnica'),
  ],
});

const LUIS = driver('vv-luis', 'Luis Hernández', '04512378');
const MARIO = driver('vv-mario', 'Mario Rivas', '05873214');
const JORGE_D = driver('vv-jorge-d', 'Jorge Molina', '02345678');

const appointment = (
  voucherId: string,
  code: string,
  clientName: string,
  overrides: Partial<GateAppointment>,
): GateAppointment => ({
  voucherId,
  code,
  eligible: true,
  message: 'Cita encontrada.',
  timeZoneId: 'America/El_Salvador',
  windowStart: null,
  windowEnd: null,
  withinWindow: true,
  clientName,
  supplierName: null,
  units: [],
  people: [],
  ...overrides,
});

const APPOINTMENTS: Record<string, GateAppointment> = {
  [DEMO_APPOINTMENT_QRS.delosi]: appointment('v-delosi', 'APPASP0000000000000093', 'DELOSI', {
    units: [
      unit('vtu-abc', 'ABC-123', LUIS),
      unit('vtu-xyz', 'XYZ-789', MARIO, [
        doc('vtu-xyz-tc', 'Tarjeta de circulación'),
        doc('vtu-xyz-soat', 'SOAT', { status: 6, expiresAt: '2026-09-30T00:00:00' }),
        doc('vtu-xyz-old', 'SOAT', { status: 5 }),
      ]),
      // Sin conductor asignado: el backend pide su documento al presentarla
      unit('vtu-lmn', 'LMN-321', null),
      unit('vtu-qwe', 'QWE-456', JORGE_D),
    ],
    people: [
      LUIS,
      MARIO,
      JORGE_D,
      person('vv-pedro', 'Pedro Aguilar', '01987654'),
      person('vv-raul', 'Raúl Pineda', '09876543'),
      person('vv-rosa', 'Rosa Méndez', '06123456', { status: 'Disabled', enabled: false }),
    ],
  }),
  [DEMO_APPOINTMENT_QRS.dollarCity]: appointment(
    'v-dollar',
    'APPASP0000000000000087',
    'DOLLAR CITY',
    {
      people: [
        person('vv-ana', 'Ana Torres', '12345678', {
          documents: [
            doc('ana-dni', 'DNI'),
            doc('ana-carne', 'Carné corporativo'),
            doc('ana-aut', 'Autorización de ingreso', { status: 2 }),
          ],
        }),
        person('vv-pedro-r', 'Pedro Rojas', '87654321'),
        person('vv-maria', 'María López', '11223344'),
        person('vv-jorge', 'Jorge Castillo', '99887766'),
        person('vv-lucia', 'Lucía Paz', '55667788', {
          status: 'PendingDocumentation',
          enabled: false,
        }),
      ],
    },
  ),
  [DEMO_APPOINTMENT_QRS.notEligible]: appointment(
    'v-pricesmart',
    'APPASP0000000000000094',
    'PRICESMART',
    {
      eligible: false,
      message: 'La cita no está vigente.',
      people: [person('vv-carla', 'Carla Ruiz', '33445566')],
    },
  ),
  [DEMO_APPOINTMENT_QRS.outsideWindow]: appointment(
    'v-inkafarma',
    'APPASP0000000000000095',
    'INKAFARMA',
    {
      withinWindow: false,
      units: [unit('vtu-def', 'DEF-654', MARIO)],
      people: [MARIO, person('vv-sofia', 'Sofía Lara', '44556677')],
    },
  ),
};

// Con veto vigente: «habilitado» en la cita pero rechazado al registrar, como el backend
const BLACKLISTED = new Set(['vv-raul']);

type MockOptions = {
  readonly clock: Clock;
  readonly isOnline: () => Promise<boolean>;
  readonly latencyMs?: number;
};

export function createMockGateGateway({
  clock,
  isOnline,
  latencyMs = 400,
}: MockOptions): GatePresentationGateway {
  // Un acceso por unidad y por persona: reintentar devuelve el mismo id
  const accesses = new Map<string, string>();
  const entered = new Set<string>();
  let sequence = 0;
  const accessFor = (key: string) => {
    const existing = accesses.get(key);
    if (existing) return existing;
    const id = `acc-${(sequence += 1)}`;
    accesses.set(key, id);
    return id;
  };

  const wait = () => new Promise((resolve) => setTimeout(resolve, latencyMs));
  const byVoucher = (voucherId: string) =>
    Object.values(APPOINTMENTS).find((candidate) => candidate.voucherId === voucherId);

  const rejected = (reason: string, message: string): PresentationResult => ({
    registered: false,
    reason,
    message,
  });

  function registerOne(appt: GateAppointment, item: PresentationItem): PresentationResult {
    if (!appt.eligible) return rejected('VOUCHER_NOT_ELIGIBLE', 'La cita no está vigente.');
    if (item.mode === 'vehicular') {
      const found = appt.units.find((candidate) => candidate.id === item.unitId);
      if (!found) return rejected('UNIT_NOT_IN_VOUCHER', 'La unidad no pertenece a la cita.');
      const driverDocument = item.driverDocument ? normalizeDocument(item.driverDocument) : null;
      if (!found.driver && !driverDocument) {
        return rejected('DRIVER_DOCUMENT_REQUIRED', 'Ingresa el documento del conductor.');
      }
      return {
        registered: true,
        unitAccessId: accessFor(`unit:${found.id}`),
        personAccessId: accessFor(`person:${found.driver?.personId ?? `doc-${driverDocument}`}`),
        message: `Llegada de ${found.plate} registrada.`,
      };
    }
    const visitor = appt.people.find((candidate) => candidate.id === item.personId);
    if (!visitor) return rejected('VISITOR_NOT_IN_VOUCHER', 'La persona no pertenece a la cita.');
    if (!visitor.enabled) {
      return rejected('VISITOR_NOT_ENABLED', `${visitor.name} no está habilitado para ingresar.`);
    }
    if (BLACKLISTED.has(visitor.id)) {
      return rejected('VISITOR_BLACKLISTED', `${visitor.name} tiene un veto vigente en la sede.`);
    }
    return {
      registered: true,
      unitAccessId: null,
      personAccessId: accessFor(`person:${visitor.id}`),
      message: `Llegada de ${visitor.name} registrada.`,
    };
  }

  return {
    async lookup(qrCode) {
      await wait();
      if (!(await isOnline())) return err({ type: 'network' });
      const found = APPOINTMENTS[qrCode.toLowerCase()];
      if (!found) {
        return ok({
          found: false,
          reason: 'VOUCHER_NOT_FOUND',
          message: 'No se encontró una cita con este QR.',
        });
      }
      return ok({ found: true, appointment: found });
    },
    async register(voucherId, items) {
      await wait();
      if (!(await isOnline())) return err({ type: 'network' });
      const appt = byVoucher(voucherId);
      if (!appt) return ok(items.map(() => rejected('VOUCHER_NOT_FOUND', 'La cita no existe.')));
      return ok(items.map((item) => registerOne(appt, item)));
    },
    async confirm(request) {
      await wait();
      if (!(await isOnline())) return err({ type: 'network' });
      const appt = byVoucher(request.voucherId);
      if (!appt?.eligible) return err({ type: 'rejected', message: 'La cita no está vigente.' });
      if (!appt.withinWindow) {
        return err({ type: 'rejected', message: 'La cita está fuera de la ventana de ingreso.' });
      }
      const known = new Set(accesses.values());
      const pending = (ids: readonly string[]) =>
        ids.filter((id) => known.has(id) && !entered.has(id));
      const units = pending(request.unitAccessIds);
      const people = pending(request.personAccessIds);
      if (units.length + people.length === 0) {
        return err({
          type: 'rejected',
          message: 'No hay unidades ni visitantes presentados pendientes de ingreso.',
        });
      }
      [...units, ...people].forEach((id) => entered.add(id));
      return ok({
        confirmedUnits: units.length,
        confirmedVisitors: people.length,
        enteredAt: clock.now().toISOString(),
        message: 'Ingreso confirmado.',
      });
    },
  };
}
