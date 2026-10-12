import { buildDemoSnapshot } from '@/shared/infrastructure/demo';

import { buildBoard, countByStatus } from './board';
import type { StoredInspection } from './ports';
import { STANDARD_DEFINITION_V1 as V1 } from './standard-definition';

const NOW = new Date('2026-10-05T17:00:00Z');
const SNAPSHOT = buildDemoSnapshot('site-central', 'Almacén Central', '2026-10-05', NOW);

const draft = (overrides: Partial<StoredInspection> = {}) =>
  ({
    id: 'insp-1',
    vehicleId: 'veh-mnp-456',
    state: 'draft',
    answers: {
      'front-plate': { kind: 'plate', confirmed: true },
      'has-trailer': { kind: 'yes_no', value: false },
    },
    syncStatus: null,
    ...overrides,
  }) as StoredInspection;

describe('buildBoard', () => {
  it('agrupa por cita solo los vehículos con ingreso confirmado (RF-F2)', () => {
    const board = buildBoard(SNAPSHOT, [], V1);

    expect(board.siteName).toBe('Almacén Central');
    expect(board.appointments.map((appointment) => appointment.clientName)).toEqual([
      'PRICESMART',
      'DOLLAR CITY',
      'DELOSI',
    ]);
    const delosi = board.appointments.find((appointment) => appointment.clientName === 'DELOSI');
    expect(delosi?.vehicles.map((vehicle) => vehicle.plate)).toEqual(['XYZ-789']);
    expect(delosi?.enteredVisitors).toBe(1);
  });

  it('el estado local de la inspección manda sobre el del paquete', () => {
    const board = buildBoard(SNAPSHOT, [draft()], V1);
    const vehicle = board.appointments
      .flatMap((appointment) => appointment.vehicles)
      .find((item) => item.id === 'veh-mnp-456');

    expect(vehicle).toMatchObject({
      status: 'in_progress',
      inspectionId: 'insp-1',
      progress: { position: 2, total: 14 },
    });
  });

  it('una inspección cerrada no muestra progreso', () => {
    const board = buildBoard(SNAPSHOT, [draft({ state: 'observed', syncStatus: 'pending' })], V1);
    const vehicle = board.appointments
      .flatMap((appointment) => appointment.vehicles)
      .find((item) => item.id === 'veh-mnp-456');

    expect(vehicle).toMatchObject({ status: 'observed', progress: null, syncStatus: 'pending' });
  });

  it('cuenta pendientes, en curso e inspeccionados para los indicadores', () => {
    expect(countByStatus(buildBoard(SNAPSHOT, [], V1))).toEqual({
      pending: 1,
      inProgress: 1,
      inspected: 3,
    });
    expect(countByStatus(buildBoard(SNAPSHOT, [draft({ state: 'submitted' })], V1))).toEqual({
      pending: 0,
      inProgress: 1,
      inspected: 4,
    });
  });
});
