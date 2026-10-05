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
