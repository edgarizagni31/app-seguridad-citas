import {
  err,
  findBlacklisted,
  ok,
  type DocumentType,
  type Result,
  type ShiftSnapshot,
} from '@/shared/domain';

export const DOCUMENT_TYPES: readonly DocumentType[] = [
  'DUI',
  'PASSPORT',
  'RESIDENT_CARD',
  'DRIVER_LICENSE',
];

// DUI: 8 dígitos, guion y dígito verificador; el resto, como el backend (≤ 20 alfanuméricos)
const DOCUMENT_PATTERNS: Record<DocumentType, RegExp> = {
  DUI: /^\d{8}-\d$/,
  PASSPORT: /^[A-Z0-9]{5,20}$/i,
  RESIDENT_CARD: /^[A-Z0-9-]{4,20}$/i,
  DRIVER_LICENSE: /^[A-Z0-9-]{4,20}$/i,
};

export const isValidDocument = (type: DocumentType, number: string) =>
  DOCUMENT_PATTERNS[type].test(number.trim());

export type VisitorDocument = {
  readonly documentType: DocumentType;
  readonly documentNumber: string;
};

export type VisitorRejection = { readonly type: 'VisitorBlacklisted'; readonly reason: string };

export function checkVisitorAccess(
  snapshot: Pick<ShiftSnapshot, 'blacklist'>,
  visitor: VisitorDocument,
): Result<void, VisitorRejection> {
  const entry = findBlacklisted(snapshot, visitor.documentType, visitor.documentNumber);
  return entry ? err({ type: 'VisitorBlacklisted', reason: entry.reason }) : ok(undefined);
}
