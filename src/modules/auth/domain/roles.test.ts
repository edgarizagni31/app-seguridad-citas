import {
  canInspect,
  canManageEntry,
  canUseApp,
  isInspector,
  primaryRoleOf,
  sectionsFor,
} from './roles';

const user = (...roles: string[]) => ({ roles });

describe('políticas de rol', () => {
  it.each(['PACCESO_ASEGURIDAD', 'PACCESO_JSEGURIDAD', 'PACCESO_ADMIN', 'PACCESO_SEGOPE'])(
    '%s gestiona el ingreso',
    (role) => {
      expect(canManageEntry(user('R360_CONFIGURACION', role))).toBe(true);
    },
  );

  it.each(['PACCESO_JHSE', 'PACCESO_AHSE'])('%s es inspector', (role) => {
    expect(isInspector(user(role))).toBe(true);
    expect(canManageEntry(user(role))).toBe(false);
  });

  it('seguridad también puede inspeccionar', () => {
    expect(canInspect(user('PACCESO_ASEGURIDAD'))).toBe(true);
  });

  it('sin roles de garita ni HSE no usa la app', () => {
    expect(canUseApp(user('PACCESO_CLIENTE'))).toBe(false);
    expect(sectionsFor(user('PACCESO_CLIENTE'))).toEqual([]);
    expect(primaryRoleOf(user())).toBeNull();
  });
});

describe('sectionsFor', () => {
  it('seguridad ve Garita, Historial y Mi perfil', () => {
    expect(sectionsFor(user('PACCESO_ASEGURIDAD'))).toEqual(['gate', 'history', 'profile']);
  });

  it('HSE ve Inspecciones, Historial y Mi perfil', () => {
    expect(sectionsFor(user('PACCESO_AHSE'))).toEqual(['inspections', 'history', 'profile']);
  });

  it('con ambos roles ve las cuatro pestañas', () => {
    expect(sectionsFor(user('PACCESO_ASEGURIDAD', 'PACCESO_JHSE'))).toEqual([
      'gate',
      'inspections',
      'history',
      'profile',
    ]);
  });

  it('el rol principal prioriza seguridad', () => {
    expect(primaryRoleOf(user('PACCESO_ASEGURIDAD', 'PACCESO_JHSE'))).toBe('security');
    expect(primaryRoleOf(user('PACCESO_JHSE'))).toBe('hse');
  });
});
