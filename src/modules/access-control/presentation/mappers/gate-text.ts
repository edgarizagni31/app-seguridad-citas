import type { ConfirmGateError, LookupError, PresentError } from '../../domain';
import { formatDate, formatTime, STRINGS } from '@/shared/lib';

const { gate: TEXT } = STRINGS;

export function gateErrorMessage(error: LookupError | PresentError | ConfirmGateError): string {
  switch (error.type) {
    case 'offline':
      return TEXT.offline;
    case 'network':
      return TEXT.networkError;
    case 'unauthorized':
      return TEXT.sessionExpired;
    case 'rejected':
    case 'not-found':
    case 'not-presented':
      return error.message;
    case 'nothing-to-confirm':
      return TEXT.nothingToConfirm;
    case 'unknown':
      return TEXT.unknownError;
  }
}

// La ventana ya viene en la hora local de la sede: solo se recorta «HH:mm»
const clock = (local: string | null) => local?.match(/T(\d{2}:\d{2})/)?.[1] ?? null;

export function windowText(start: string | null, end: string | null): string | null {
  const from = clock(start);
  const to = clock(end);
  return from && to ? TEXT.window(from, to) : null;
}

// entryDateTime llega en UTC: se muestra en la zona de la sede y, si no es válida, en la de la app
export function formatEntryTime(
  utc: string | null,
  siteTimeZone: string | null,
  fallbackTimeZone: string,
): string | null {
  if (!utc) return null;
  const date = new Date(utc);
  if (Number.isNaN(date.getTime())) return null;
  const format = (timeZone: string) =>
    `${formatDate(date, timeZone)} · ${formatTime(date, timeZone)}`;
  if (siteTimeZone) {
    try {
      return format(siteTimeZone);
    } catch {
      // Zona no IANA: se usa la de la app
    }
  }
  return format(fallbackTimeZone);
}
