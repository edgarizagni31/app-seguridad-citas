import { parseEnv, type RawEnv } from './env';

const validEnv = (overrides: Partial<RawEnv> = {}): RawEnv => ({
  appVariant: 'preview',
  appVersion: '1.0.0',
  apiUrl: 'https://citascam.qas.ransaaplicaciones.com/api/',
  r360ApiUrl: 'https://api-360v2.qas.ransaaplicaciones.com',
  authProvider: 'r360',
  timeZone: 'America/El_Salvador',
  ...overrides,
});

describe('parseEnv', () => {
  it('acepta una configuración válida', () => {
    expect(parseEnv(validEnv())).toEqual(validEnv());
  });

  it('falla si falta una variable', () => {
    expect(() => parseEnv(validEnv({ apiUrl: undefined }))).toThrow(/apiUrl/);
  });

  it('falla con un proveedor de auth desconocido', () => {
    expect(() => parseEnv(validEnv({ authProvider: 'cognito' }))).toThrow(/authProvider/);
  });

  it('prohíbe el proveedor mock en production', () => {
    expect(() => parseEnv(validEnv({ appVariant: 'production', authProvider: 'mock' }))).toThrow(
      /mock/,
    );
  });

  it('permite el proveedor mock fuera de production', () => {
    expect(parseEnv(validEnv({ authProvider: 'mock' })).authProvider).toBe('mock');
  });

  it('exige HTTPS fuera de development', () => {
    expect(() => parseEnv(validEnv({ apiUrl: 'http://10.0.2.2:5000/api/' }))).toThrow(/HTTPS/);
  });

  it('permite HTTP en development', () => {
    const env = parseEnv(
      validEnv({ appVariant: 'development', apiUrl: 'http://10.0.2.2:5000/api/' }),
    );

    expect(env.apiUrl).toBe('http://10.0.2.2:5000/api/');
  });

  it('rechaza protocolos distintos de http/https', () => {
    expect(() => parseEnv(validEnv({ apiUrl: 'ftp://servidor/api' }))).toThrow(/apiUrl/);
  });

  it('rechaza una zona horaria inválida', () => {
    expect(() => parseEnv(validEnv({ timeZone: 'Marte/Olympus' }))).toThrow(/Zona horaria/);
  });
});
