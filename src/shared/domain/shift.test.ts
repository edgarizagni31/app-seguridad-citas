import { findBlacklisted, findVehicle, normalizeDocument, type ShiftSnapshot } from './shift';

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
