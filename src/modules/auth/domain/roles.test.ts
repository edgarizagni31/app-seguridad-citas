import { canAccessGate } from './roles';

describe('canAccessGate', () => {
  it.each(['PACCESO_ASEGURIDAD', 'PACCESO_JSEGURIDAD', 'PACCESO_ADMIN', 'PACCESO_SEGOPE'])(
    'permite el rol %s',
    (role) => {
      expect(canAccessGate({ roles: ['R360_CONFIGURACION', role] })).toBe(true);
    },
  );

  it('rechaza usuarios sin rol de seguridad', () => {
    expect(canAccessGate({ roles: ['PACCESO_CLIENTE', 'PACCESO_TRANSPORTISTA'] })).toBe(false);
    expect(canAccessGate({ roles: [] })).toBe(false);
  });
});
