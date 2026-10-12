import { TZDate } from '@date-fns/tz';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const inZone = (date: Date, timeZone: string) => new TZDate(date, timeZone);

export function formatTime(date: Date, timeZone: string): string {
  return format(inZone(date, timeZone), 'h:mm aaaa', { locale: es })
    .replace('a.m.', 'a. m.')
    .replace('p.m.', 'p. m.');
}

export function formatDate(date: Date, timeZone: string): string {
  return format(inZone(date, timeZone), 'dd/MM/yyyy', { locale: es });
}

export function isSameDayInTimeZone(a: Date, b: Date, timeZone: string): boolean {
  return formatDate(a, timeZone) === formatDate(b, timeZone);
}

// Fecha del día (yyyy-MM-dd) en la zona horaria de la sede
export function toIsoDate(date: Date, timeZone: string): string {
  return format(inZone(date, timeZone), 'yyyy-MM-dd');
}

export function formatLongDate(date: Date, timeZone: string): string {
  return format(inZone(date, timeZone), "d 'de' MMMM", { locale: es });
}

export const minutesBetween = (from: Date, to: Date) =>
  Math.max(0, Math.floor((to.getTime() - from.getTime()) / 60_000));
