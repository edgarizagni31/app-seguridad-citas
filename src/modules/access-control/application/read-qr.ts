import { parseQrContent, type ScanRecord } from '../domain';
import type { Clock } from '@/shared/domain';

export const readQr =
  (deps: { readonly clock: Clock }) =>
  (rawContent: string): ScanRecord => ({
    content: parseQrContent(rawContent),
    scannedAt: deps.clock.now(),
  });
