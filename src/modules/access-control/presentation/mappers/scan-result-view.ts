import type { QrContent, ScanRecord } from '../../domain';
import { assertNever } from '@/shared/domain';
import { formatDate, formatTime, isSameDayInTimeZone, STRINGS } from '@/shared/lib';
import type { BannerTone, IconName } from '@/shared/ui';

const { scanResult: TEXT } = STRINGS;

export type ScanField = {
  readonly label: string;
  readonly value: string;
  readonly display: 'code' | 'plate';
};

export type ScanResultView = {
  readonly tone: BannerTone;
  readonly icon: IconName;
  readonly title: string;
  readonly readAt: string;
  readonly fields: readonly ScanField[];
  readonly raw: string;
  readonly note: string;
};

const ONLY_DIGITS = /^\d+$/;

// El sufijo es una placa o, en el formato heredado, un número de documento
const suffixField = (suffix: string): ScanField =>
  ONLY_DIGITS.test(suffix)
    ? { label: TEXT.document, value: suffix, display: 'code' }
    : { label: TEXT.plate, value: suffix, display: 'plate' };

function describeContent(content: QrContent): Omit<ScanResultView, 'readAt' | 'raw'> {
  switch (content.kind) {
    case 'codeWithSuffix':
      return {
        tone: 'success',
        icon: 'truck-outline',
        title: TEXT.types.transportUnit,
        fields: [
          { label: TEXT.code, value: content.code, display: 'code' },
          suffixField(content.suffix),
        ],
        note: TEXT.notes.transportUnit,
      };
    case 'code':
      return {
        tone: 'warning',
        icon: 'ticket-confirmation-outline',
        title: TEXT.types.voucher,
        fields: [{ label: TEXT.code, value: content.code, display: 'code' }],
        note: TEXT.notes.voucher,
      };
    case 'visitorPass':
      return {
        tone: 'info',
        icon: 'card-account-details-outline',
        title: TEXT.types.visitorPass,
        fields: [{ label: TEXT.passCode, value: content.passCode, display: 'code' }],
        note: TEXT.notes.visitorPass,
      };
    case 'unknown':
      return {
        tone: 'error',
        icon: 'alert-circle',
        title: TEXT.types.unknown,
        fields: [],
        note: TEXT.notes.unknown,
      };
    default:
      return assertNever(content);
  }
}

function describeReadAt(scannedAt: Date, now: Date, timeZone: string) {
  const time = formatTime(scannedAt, timeZone);
  return isSameDayInTimeZone(scannedAt, now, timeZone)
    ? TEXT.readToday(time)
    : TEXT.readOn(formatDate(scannedAt, timeZone), time);
}

export function toScanResultView(scan: ScanRecord, now: Date, timeZone: string): ScanResultView {
  return {
    ...describeContent(scan.content),
    readAt: describeReadAt(scan.scannedAt, now, timeZone),
    raw: scan.content.raw,
  };
}
