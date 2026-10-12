import {
  applyEntries,
  findBlacklisted,
  findVehicle,
  normalizeDocument,
  type ShiftSnapshot,
} from './shift';

const snapshot = {
  blacklist: [{ documentType: 'DUI', documentNumber: '01234567-8', reason: 'Incidente previo' }],
  appointments: [
    {
      id: 'apt-1',
      vehicles: [{ id: 'veh-1', plate: 'ABC-123' }],
    },
  ],
} as unknown as ShiftSnapshot;

describe('paquete del día', () => {
  it('normaliza documentos ignorando guiones, espacios y mayúsculas', () => {
    expect(normalizeDocument(' 01234567-8 ')).toBe('012345678');
    expect(normalizeDocument('a12345678')).toBe('A12345678');
  });

  it('encuentra un documento en lista negra con o sin guion', () => {
    expect(findBlacklisted(snapshot, 'DUI', '012345678')?.reason).toBe('Incidente previo');
    expect(findBlacklisted(snapshot, 'PASSPORT', '01234567-8')).toBeUndefined();
  });

  it('encuentra un vehículo con su cita', () => {
    expect(findVehicle(snapshot, 'veh-1')?.appointment.id).toBe('apt-1');
    expect(findVehicle(snapshot, 'nada')).toBeNull();
  });
});

describe('applyEntries', () => {
  const snapshot = {
    appointments: [
      {
        id: 'apt',
        vehicles: [
          { id: 'veh-1', enteredAt: null, enteredVisitorIds: [] },
          { id: 'veh-2', enteredAt: '2026-10-05T14:00:00Z', enteredVisitorIds: ['ana'] },
        ],
      },
    ],
  } as unknown as ShiftSnapshot;

  it('sin ingresos locales devuelve el mismo paquete', () => {
    expect(applyEntries(snapshot, [])).toBe(snapshot);
  });

  it('marca la unidad como ingresada y une los visitantes de cada confirmación', () => {
    const result = applyEntries(snapshot, [
      { vehicleId: 'veh-1', enteredAt: '2026-10-05T16:10:00Z', visitorIds: ['luis'] },
      { vehicleId: 'veh-1', enteredAt: '2026-10-05T16:00:00Z', visitorIds: ['mario', 'luis'] },
      { vehicleId: 'veh-2', enteredAt: '2026-10-05T16:20:00Z', visitorIds: ['rosa'] },
    ]);
    const [first, second] = result.appointments[0]?.vehicles ?? [];

    expect(first).toMatchObject({
      enteredAt: '2026-10-05T16:00:00Z',
      enteredVisitorIds: ['luis', 'mario'],
    });
    expect(second).toMatchObject({
      enteredAt: '2026-10-05T14:00:00Z',
      enteredVisitorIds: ['ana', 'rosa'],
    });
  });
});
