import type { Env } from '@/shared/infrastructure';

import { createContainer } from './container';

const env = (overrides: Partial<Env> = {}): Env => ({
  appVariant: 'preview',
  appVersion: '1.2.3',
  apiUrl: 'https://api.test/api/',
  r360ApiUrl: 'https://r360.test',
  authProvider: 'r360',
  timeZone: 'America/El_Salvador',
  ...overrides,
});

describe('createContainer', () => {
  it('expone la configuración que necesita la UI', () => {
    expect(createContainer(env()).config).toEqual({
      appVersion: '1.2.3',
      timeZone: 'America/El_Salvador',
      isDemoAuth: false,
    });
  });

  it('marca el modo demo cuando el proveedor es mock', () => {
    expect(createContainer(env({ authProvider: 'mock' })).config.isDemoAuth).toBe(true);
  });
});

describe('createContainer · auth', () => {
  it.each(['r360', 'mock'] as const)('expone los casos de uso de sesión con %s', (authProvider) => {
    const { auth } = createContainer(env({ authProvider }));

    expect(Object.keys(auth).sort()).toEqual([
      'login',
      'logout',
      'refreshSession',
      'restoreSession',
    ]);
  });

  it('valida credenciales antes de llamar al proveedor', async () => {
    const { auth } = createContainer(env({ authProvider: 'mock' }));

    expect(await auth.login('no-es-correo', 'x')).toEqual({
      ok: false,
      error: { type: 'invalid-email' },
    });
  });
});
