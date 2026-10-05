import { createLogger, REDACTED, redact, type LogEntry } from './logger';

const JWT_SAMPLE = 'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxMjMifQ.firma-xyz';

describe('redact', () => {
  it('oculta claves sensibles en cualquier nivel', () => {
    const result = redact({
      headers: { Authorization: 'Bearer abc', authorizationrefresh: 'Bearer def' },
      body: { email: 'a@b.com', password: 'secreta', nested: [{ idToken: 'x' }] },
      qrContent: 'APPSCH00000000000123-ABC-123',
      status: 401,
    });

    expect(result).toEqual({
      headers: { Authorization: REDACTED, authorizationrefresh: REDACTED },
      body: { email: REDACTED, password: REDACTED, nested: [{ idToken: REDACTED }] },
      qrContent: REDACTED,
      status: 401,
    });
  });

  it('reemplaza JWT dentro de textos', () => {
    expect(redact(`fallo con ${JWT_SAMPLE}`)).toBe('fallo con [JWT]');
  });

  it('serializa errores sin stack y sin JWT', () => {
    expect(redact(new TypeError(`token ${JWT_SAMPLE}`))).toEqual({
      name: 'TypeError',
      message: 'token [JWT]',
    });
  });

  it('corta estructuras demasiado profundas', () => {
    expect(redact({ a: { b: { c: { d: { e: { f: 1 } } } } } })).toEqual({
      a: { b: { c: { d: { e: '[MAX_DEPTH]' } } } },
    });
  });
});

describe('createLogger', () => {
  const setup = (minLevel: 'debug' | 'warn') => {
    const entries: LogEntry[] = [];
    const logger = createLogger({
      minLevel,
      sink: (entry) => entries.push(entry),
      now: () => new Date('2026-10-05T16:42:00.000Z'),
    });
    return { logger, entries };
  };

  it('descarta niveles por debajo del mínimo', () => {
    const { logger, entries } = setup('warn');

    logger.debug('d');
    logger.info('i');
    logger.warn('w');
    logger.error('e');

    expect(entries.map((entry) => entry.level)).toEqual(['warn', 'error']);
  });

  it('emite entradas estructuradas y redactadas', () => {
    const { logger, entries } = setup('debug');

    logger.error(`login falló ${JWT_SAMPLE}`, { password: 'x', status: 500 });

    expect(entries).toEqual([
      {
        level: 'error',
        message: 'login falló [JWT]',
        context: { password: REDACTED, status: 500 },
        timestamp: '2026-10-05T16:42:00.000Z',
      },
    ]);
  });
});
