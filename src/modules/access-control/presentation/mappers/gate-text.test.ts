import { formatEntryTime, gateErrorMessage, windowText } from './gate-text';

describe('formatEntryTime', () => {
  it('muestra la hora UTC en la zona de la sede', () => {
    expect(formatEntryTime('2026-10-28T15:40:00Z', 'America/Lima', 'America/El_Salvador')).toBe(
      '28/10/2026 · 10:40 a. m.',
    );
  });

  it('si la zona de la sede no es válida o no viene, usa la de la app', () => {
    expect(
      formatEntryTime('2026-10-28T15:40:00Z', 'SA Pacific Standard Time', 'America/El_Salvador'),
    ).toBe('28/10/2026 · 9:40 a. m.');
    expect(formatEntryTime('2026-10-28T15:40:00Z', null, 'America/El_Salvador')).toBe(
      '28/10/2026 · 9:40 a. m.',
    );
  });

  it('sin fecha o con una fecha inválida no muestra nada', () => {
    expect(formatEntryTime(null, 'America/Lima', 'America/El_Salvador')).toBeNull();
    expect(formatEntryTime('mañana', 'America/Lima', 'America/El_Salvador')).toBeNull();
  });
});

describe('windowText', () => {
  it('recorta la hora local que manda el servidor, sin convertirla', () => {
    expect(windowText('2026-10-28T09:30:00', '2026-10-28T11:00:00')).toBe('Cita 09:30 – 11:00');
    expect(windowText(null, '2026-10-28T11:00:00')).toBeNull();
  });
});

describe('gateErrorMessage', () => {
  it.each([
    [{ type: 'offline' as const }, 'Sin conexión.'],
    [{ type: 'network' as const }, 'No se pudo conectar'],
    [{ type: 'unauthorized' as const }, 'Tu sesión expiró'],
    [{ type: 'unknown' as const }, 'Ocurrió un error inesperado'],
    [{ type: 'nothing-to-confirm' as const }, 'Primero registra la llegada'],
    [{ type: 'rejected' as const, message: 'Fuera de ventana.' }, 'Fuera de ventana.'],
    [{ type: 'not-found' as const, message: 'No existe.' }, 'No existe.'],
  ])('%j', (error, expected) => {
    expect(gateErrorMessage(error)).toContain(expected);
  });
});
