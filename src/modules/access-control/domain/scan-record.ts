import type { QrContent } from './qr-content';

export type ScanRecord = {
  readonly content: QrContent;
  readonly scannedAt: Date;
};
