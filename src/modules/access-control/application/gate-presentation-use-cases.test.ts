import {
  recordUnit,
  startSession,
  markCompanion,
  recordPerson,
  type GatePresentationGateway,
  type PresentationResult,
} from '../domain';
import { err, ok } from '@/shared/domain';
import { buildAppointment } from '@/test/factories/gate';

import {
  confirmPedestrianEntry,
  confirmVehicleEntry,
  lookupAppointment,
  presentPerson,
  presentUnit,
} from './gate-presentation-use-cases';

const APPOINTMENT = buildAppointment();
const CONFIRMATION = {
  confirmedUnits: 1,
  confirmedVisitors: 2,
  enteredAt: '2026-10-28T15:40:00Z',
  message: 'Ingreso confirmado.',
};

const registered = (overrides: Partial<PresentationResult> = {}): PresentationResult =>
  ({
    registered: true,
    unitAccessId: 'tua-1',
    personAccessId: 'va-luis',
    message: 'Llegada registrada.',
    ...overrides,
  }) as PresentationResult;

function setup(online = true, overrides: Partial<GatePresentationGateway> = {}) {
  const gateway = {
    lookup: jest.fn(async () => ok({ found: true as const, appointment: APPOINTMENT })),
    register: jest.fn(async () => ok([registered()])),
    confirm: jest.fn(async () => ok(CONFIRMATION)),
    ...overrides,
  } satisfies GatePresentationGateway;
  return { gateway, deps: { gateway, isOnline: async () => online } };
}

describe('lookupAppointment', () => {
  it('limpia el QR y devuelve la cita encontrada', async () => {
    const { gateway, deps } = setup();

    expect(await lookupAppointment(deps)('  442c766389044391b4f59d2d5518c4a0 ')).toEqual(
      ok(APPOINTMENT),
    );
    expect(gateway.lookup).toHaveBeenCalledWith('442c766389044391b4f59d2d5518c4a0');
  });

  it('no encontrada: devuelve el mensaje del servidor', async () => {
    const { deps } = setup(true, {
      lookup: jest.fn(async () =>
        ok({ found: false as const, reason: 'VOUCHER_NOT_FOUND', message: 'No existe la cita.' }),
      ),
    });

    expect(await lookupAppointment(deps)('abc')).toEqual(
      err({ type: 'not-found', message: 'No existe la cita.' }),
    );
  });

  it('sin conexión no consulta y propaga los errores del gateway', async () => {
    const offline = setup(false);
    expect(await lookupAppointment(offline.deps)('abc')).toEqual(err({ type: 'offline' }));
    expect(offline.gateway.lookup).not.toHaveBeenCalled();

    const failing = setup(true, { lookup: jest.fn(async () => err({ type: 'network' as const })) });
    expect(await lookupAppointment(failing.deps)('abc')).toEqual(err({ type: 'network' }));
  });
});

describe('presentUnit', () => {
  it('registra la unidad con su conductor y la marca presentada', async () => {
    const { gateway, deps } = setup();

    const result = await presentUnit(deps)(startSession(APPOINTMENT), 'vtu-1', ' 04512378 ');

    expect(gateway.register).toHaveBeenCalledWith('voucher-1', [
      { mode: 'vehicular', unitId: 'vtu-1', driverDocument: '04512378' },
    ]);
    expect(result.ok && result.value.presentedUnits).toEqual({
      'vtu-1': { unitAccessId: 'tua-1', driverAccessId: 'va-luis' },
    });
  });

  it('sin documento manda null y un rechazo trae su motivo', async () => {
    const { gateway, deps } = setup(true, {
      register: jest.fn(async () =>
        ok([
          {
            registered: false as const,
            reason: 'DRIVER_DOCUMENT_REQUIRED',
            message: 'Ingresa el documento del conductor.',
          },
        ]),
      ),
    });

    const result = await presentUnit(deps)(startSession(APPOINTMENT), 'vtu-2', '  ');

    expect(gateway.register).toHaveBeenCalledWith('voucher-1', [
      { mode: 'vehicular', unitId: 'vtu-2', driverDocument: null },
    ]);
    expect(result).toEqual(
      err({
        type: 'not-presented',
        reason: 'DRIVER_DOCUMENT_REQUIRED',
        message: 'Ingresa el documento del conductor.',
      }),
    );
  });

  it('una respuesta sin id de acceso o sin resultados es un error', async () => {
    const noId = setup(true, {
      register: jest.fn(async () => ok([registered({ unitAccessId: null })])),
    });
    const empty = setup(true, { register: jest.fn(async () => ok([])) });

    expect(await presentUnit(noId.deps)(startSession(APPOINTMENT), 'vtu-1', null)).toEqual(
      err({ type: 'unknown' }),
    );
    expect(await presentUnit(empty.deps)(startSession(APPOINTMENT), 'vtu-1', null)).toEqual(
      err({ type: 'unknown' }),
    );
  });

  it('sin conexión no registra', async () => {
    const { gateway, deps } = setup(false);

    expect(await presentUnit(deps)(startSession(APPOINTMENT), 'vtu-1', null)).toEqual(
      err({ type: 'offline' }),
    );
    expect(gateway.register).not.toHaveBeenCalled();
  });

  it('propaga los errores del gateway', async () => {
    const { deps } = setup(true, {
      register: jest.fn(async () => err({ type: 'rejected' as const, message: 'Cita vencida.' })),
    });

    expect(await presentUnit(deps)(startSession(APPOINTMENT), 'vtu-1', null)).toEqual(
      err({ type: 'rejected', message: 'Cita vencida.' }),
    );
  });
});

describe('presentPerson', () => {
  it('registra a la persona como peatón', async () => {
    const { gateway, deps } = setup(true, {
      register: jest.fn(async () =>
        ok([registered({ unitAccessId: null, personAccessId: 'va-ana' })]),
      ),
    });

    const result = await presentPerson(deps)(startSession(APPOINTMENT), 'vv-ana');

    expect(gateway.register).toHaveBeenCalledWith('voucher-1', [
      { mode: 'pedestrian', personId: 'vv-ana' },
    ]);
    expect(result.ok && result.value.presentedPeople).toEqual({ 'vv-ana': 'va-ana' });
  });

  it('sin id de acceso de la persona es un error', async () => {
    const { deps } = setup(true, {
      register: jest.fn(async () => ok([registered({ personAccessId: null })])),
    });

    expect(await presentPerson(deps)(startSession(APPOINTMENT), 'vv-ana')).toEqual(
      err({ type: 'unknown' }),
    );
  });
});

describe('confirmVehicleEntry', () => {
  const presented = recordUnit(startSession(APPOINTMENT), 'vtu-1', {
    unitAccessId: 'tua-1',
    driverAccessId: 'va-luis',
  });

  it('registra a los acompañantes marcados y confirma todo con ids explícitos', async () => {
    const withCompanions = markCompanion(markCompanion(presented, 'vv-ana', true), 'vv-raul', true);
    const { gateway, deps } = setup(true, {
      register: jest.fn(async () =>
        ok([
          registered({ unitAccessId: null, personAccessId: 'va-ana' }),
          {
            registered: false as const,
            reason: 'VISITOR_NOT_ENABLED',
            message: 'Raúl no está habilitado.',
          },
        ]),
      ),
    });

    const result = await confirmVehicleEntry(deps)(withCompanions);

    expect(gateway.register).toHaveBeenCalledWith('voucher-1', [
      { mode: 'pedestrian', personId: 'vv-ana' },
      { mode: 'pedestrian', personId: 'vv-raul' },
    ]);
    expect(gateway.confirm).toHaveBeenCalledWith({
      voucherId: 'voucher-1',
      unitAccessIds: ['tua-1'],
      personAccessIds: ['va-luis', 'va-ana'],
    });
    expect(result).toEqual(
      ok({
        confirmation: CONFIRMATION,
        rejectedCompanions: [{ personId: 'vv-raul', message: 'Raúl no está habilitado.' }],
      }),
    );
  });

  it('sin acompañantes confirma directo', async () => {
    const { gateway, deps } = setup();

    await confirmVehicleEntry(deps)(presented);

    expect(gateway.register).not.toHaveBeenCalled();
    expect(gateway.confirm).toHaveBeenCalledWith({
      voucherId: 'voucher-1',
      unitAccessIds: ['tua-1'],
      personAccessIds: ['va-luis'],
    });
  });

  it('un rechazo del servidor (fuera de ventana) llega con su mensaje', async () => {
    const { deps } = setup(true, {
      confirm: jest.fn(async () =>
        err({ type: 'rejected' as const, message: 'Fuera de la ventana de ingreso.' }),
      ),
    });

    expect(await confirmVehicleEntry(deps)(presented)).toEqual(
      err({ type: 'rejected', message: 'Fuera de la ventana de ingreso.' }),
    );
  });

  it('si falla el registro de acompañantes no confirma', async () => {
    const { gateway, deps } = setup(true, {
      register: jest.fn(async () => err({ type: 'network' as const })),
    });

    expect(await confirmVehicleEntry(deps)(markCompanion(presented, 'vv-ana', true))).toEqual(
      err({ type: 'network' }),
    );
    expect(gateway.confirm).not.toHaveBeenCalled();
  });

  it('sin unidades presentadas o sin conexión no confirma', async () => {
    const { gateway, deps } = setup();
    expect(await confirmVehicleEntry(deps)(startSession(APPOINTMENT))).toEqual(
      err({ type: 'nothing-to-confirm' }),
    );
    expect(await confirmVehicleEntry(setup(false).deps)(presented)).toEqual(
      err({ type: 'offline' }),
    );
    expect(gateway.confirm).not.toHaveBeenCalled();
  });
});

describe('confirmPedestrianEntry', () => {
  it('confirma a las personas presentadas', async () => {
    const { gateway, deps } = setup();
    const session = recordPerson(startSession(APPOINTMENT), 'vv-ana', 'va-ana');

    expect(await confirmPedestrianEntry(deps)(session)).toEqual(
      ok({ confirmation: CONFIRMATION, rejectedCompanions: [] }),
    );
    expect(gateway.confirm).toHaveBeenCalledWith({
      voucherId: 'voucher-1',
      unitAccessIds: [],
      personAccessIds: ['va-ana'],
    });
  });

  it('sin personas, sin conexión o con error del servidor no confirma', async () => {
    const session = recordPerson(startSession(APPOINTMENT), 'vv-ana', 'va-ana');
    const failing = setup(true, {
      confirm: jest.fn(async () => err({ type: 'unknown' as const })),
    });

    expect(await confirmPedestrianEntry(setup().deps)(startSession(APPOINTMENT))).toEqual(
      err({ type: 'nothing-to-confirm' }),
    );
    expect(await confirmPedestrianEntry(setup(false).deps)(session)).toEqual(
      err({ type: 'offline' }),
    );
    expect(await confirmPedestrianEntry(failing.deps)(session)).toEqual(err({ type: 'unknown' }));
  });
});
