import { buildAppointment, buildDocument, buildPerson, buildUnit } from '@/test/factories/gate';

import {
  availableModes,
  checkDocument,
  chooseMode,
  companionItems,
  driverOf,
  isDriver,
  markCompanion,
  matchesPerson,
  matchesUnit,
  nonDrivers,
  pedestrianConfirmRequest,
  presentedPeopleCount,
  presentedUnitCount,
  recordPerson,
  recordUnit,
  startSession,
  unitNumber,
  vehicleConfirmRequest,
  visibleDocuments,
} from './gate-session';

const NOW = new Date('2026-10-28T15:00:00Z');
const appointment = buildAppointment();

describe('personas de la cita', () => {
  it('distingue conductores (por la unidad o por su marca) de acompañantes', () => {
    const nominated = buildPerson({ id: 'vv-luis', isConductor: false });

    expect(isDriver(appointment, nominated)).toBe(true);
    expect(isDriver(appointment, buildPerson({ isConductor: true }))).toBe(true);
    expect(nonDrivers(appointment).map((person) => person.id)).toEqual([
      'vv-ana',
      'vv-pedro',
      'vv-raul',
    ]);
  });

  it('encuentra al conductor de una unidad, o null si no tiene', () => {
    const [withDriver, withoutDriver] = appointment.units;

    expect(driverOf(appointment, withDriver!)?.name).toBe('Luis Hernández');
    expect(driverOf(appointment, withoutDriver!)).toBeNull();
  });

  it('habilita cada tipo de ingreso solo si hay unidades o personas que no conducen', () => {
    expect(availableModes(appointment)).toEqual({ vehicular: true, pedestrian: true });
    expect(availableModes(buildAppointment({ units: [], people: [] }))).toEqual({
      vehicular: false,
      pedestrian: false,
    });
  });

  it('numera las unidades según el orden de la cita', () => {
    expect(unitNumber(appointment, 'vtu-2')).toBe(2);
  });
});

describe('buscadores', () => {
  it('compara la placa normalizada: sin guiones, espacios ni mayúsculas', () => {
    const unit = buildUnit();

    expect(matchesUnit(unit, 'abc 12')).toBe(true);
    expect(matchesUnit(unit, 'ABC-123')).toBe(true);
    expect(matchesUnit(unit, '')).toBe(true);
    expect(matchesUnit(unit, 'XYZ')).toBe(false);
  });

  it('busca personas por nombre o documento', () => {
    const ana = buildPerson({ documentNumber: '12345678-9' });

    expect(matchesPerson(ana, 'torres')).toBe(true);
    expect(matchesPerson(ana, '123456789')).toBe(true);
    expect(matchesPerson(ana, '  ')).toBe(true);
    expect(matchesPerson(ana, 'pedro')).toBe(false);
    expect(matchesPerson(buildPerson({ documentNumber: null }), '123')).toBe(false);
  });
});

describe('documentos', () => {
  it('oculta los archivados', () => {
    const documents = [buildDocument({ id: 'a' }), buildDocument({ id: 'b', status: 5 })];

    expect(visibleDocuments(documents).map((document) => document.id)).toEqual(['a']);
  });

  it.each([
    ['vigente sin vencer', buildDocument(), 'valid'],
    ['vigente sin imagen', buildDocument({ fileUrl: null }), 'valid'],
    ['vigente pero ya vencido', buildDocument({ expiresAt: '2026-10-01T00:00:00Z' }), 'expired'],
    ['marcado como vencido', buildDocument({ status: 6 }), 'expired'],
    ['rechazado', buildDocument({ status: 4 }), 'rejected'],
    ['pendiente', buildDocument({ status: 1 }), 'pending'],
    ['en revisión', buildDocument({ status: 2 }), 'pending'],
    ['sin estado', buildDocument({ status: null }), 'pending'],
  ])('documento %s', (_case, document, expected) => {
    expect(checkDocument(document, NOW)).toBe(expected);
  });
});

describe('sesión de garita', () => {
  it('guarda el tipo de ingreso, lo presentado y los acompañantes marcados', () => {
    let session = chooseMode(startSession(appointment), 'vehicular');
    session = recordUnit(session, 'vtu-1', { unitAccessId: 'tua-1', driverAccessId: 'va-luis' });
    session = recordPerson(session, 'vv-ana', 'va-ana');
    session = markCompanion(session, 'vv-pedro', true);
    session = markCompanion(session, 'vv-ana', true);
    session = markCompanion(session, 'vv-ana', false);

    expect(session.mode).toBe('vehicular');
    expect(presentedUnitCount(session)).toBe(1);
    expect(presentedPeopleCount(session)).toBe(1);
    expect(companionItems(session)).toEqual([{ mode: 'pedestrian', personId: 'vv-pedro' }]);
  });
});

describe('requests de confirmación', () => {
  const presented = recordUnit(
    recordUnit(startSession(appointment), 'vtu-1', {
      unitAccessId: 'tua-1',
      driverAccessId: 'va-luis',
    }),
    'vtu-2',
    { unitAccessId: 'tua-2', driverAccessId: null },
  );

  it('vehicular: siempre ids explícitos de unidades, conductores y acompañantes', () => {
    expect(vehicleConfirmRequest(presented, ['va-pedro', 'va-luis'])).toEqual({
      ok: true,
      value: {
        voucherId: 'voucher-1',
        unitAccessIds: ['tua-1', 'tua-2'],
        personAccessIds: ['va-luis', 'va-pedro'],
      },
    });
  });

  it('vehicular sin unidades presentadas no arma un request vacío', () => {
    expect(vehicleConfirmRequest(startSession(appointment), ['va-pedro'])).toEqual({
      ok: false,
      error: { type: 'nothing-to-confirm' },
    });
  });

  it('peatonal: solo las personas presentadas', () => {
    const session = recordPerson(startSession(appointment), 'vv-ana', 'va-ana');

    expect(pedestrianConfirmRequest(session)).toEqual({
      ok: true,
      value: { voucherId: 'voucher-1', unitAccessIds: [], personAccessIds: ['va-ana'] },
    });
    expect(pedestrianConfirmRequest(startSession(appointment)).ok).toBe(false);
  });
});
