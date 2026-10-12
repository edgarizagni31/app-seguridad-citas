import {
  formatDate,
  formatLongDate,
  formatTime,
  isSameDayInTimeZone,
  minutesBetween,
  toIsoDate,
} from './dates';

const TZ = 'America/El_Salvador';

describe('fechas en la zona horaria de la sede', () => {
  it('formatea la hora de la mañana como en los mockups', () => {
    expect(formatTime(new Date('2026-10-05T16:42:00Z'), TZ)).toBe('10:42 a. m.');
  });

  it('formatea la hora de la tarde', () => {
    expect(formatTime(new Date('2026-10-05T22:05:00Z'), TZ)).toBe('4:05 p. m.');
  });

  it('formatea la fecha en la zona indicada, no en UTC', () => {
    expect(formatDate(new Date('2026-10-06T03:00:00Z'), TZ)).toBe('05/10/2026');
  });

  it('compara días según la zona horaria', () => {
    const lateNight = new Date('2026-10-06T03:00:00Z');
    const morning = new Date('2026-10-05T15:00:00Z');

    expect(isSameDayInTimeZone(lateNight, morning, TZ)).toBe(true);
    expect(isSameDayInTimeZone(lateNight, morning, 'UTC')).toBe(false);
  });
});

describe('fechas del turno', () => {
  it('toIsoDate usa el día de la sede, no el de UTC', () => {
    expect(toIsoDate(new Date('2026-10-13T03:00:00Z'), TZ)).toBe('2026-10-12');
  });

  it('formatLongDate muestra día y mes en español', () => {
    expect(formatLongDate(new Date('2026-10-12T16:00:00Z'), TZ)).toBe('12 de octubre');
  });

  it('minutesBetween redondea hacia abajo y nunca es negativo', () => {
    const from = new Date('2026-10-12T16:00:00Z');

    expect(minutesBetween(from, new Date('2026-10-12T16:05:59Z'))).toBe(5);
    expect(minutesBetween(from, new Date('2026-10-12T15:00:00Z'))).toBe(0);
  });
});
