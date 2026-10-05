import { createFixedClock } from '@/test/fakes/fixed-clock';

import { readQr } from './read-qr';

describe('readQr', () => {
  it('interpreta el contenido y registra la hora de lectura', () => {
    const clock = createFixedClock('2026-10-05T16:42:00.000Z');

    expect(readQr({ clock })('APPSCH00000000000123-ABC-123')).toEqual({
      content: {
        kind: 'codeWithSuffix',
        code: 'APPSCH00000000000123',
        suffix: 'ABC-123',
        raw: 'APPSCH00000000000123-ABC-123',
      },
      scannedAt: new Date('2026-10-05T16:42:00.000Z'),
    });
  });

  it('el contenido no reconocido también se registra', () => {
    const clock = createFixedClock();

    expect(readQr({ clock })('hola mundo').content).toEqual({ kind: 'unknown', raw: 'hola mundo' });
  });
});
