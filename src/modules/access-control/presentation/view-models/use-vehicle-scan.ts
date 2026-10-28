import type { BarcodeScanningResult } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useRef, useState } from 'react';

import type { QrContent } from '../../domain';
import { toScanResultView, type ScanResultView } from '../mappers/scan-result-view';
import { useDependencies } from '@/core/di';
import type { Result } from '@/shared/domain';
import { useCameraAccess } from '@/shared/ui';

export type QrScanPhase =
  | { readonly type: 'scanning' }
  | { readonly type: 'validating' }
  | { readonly type: 'rejected'; readonly message: string; readonly detail: ScanResultView | null };

// Qué QR acepta el escáner y cómo se resuelve
export type QrScanTarget<T, E> = {
  readonly kind: 'vehicleToken' | 'appointmentQr';
  readonly resolve: (code: string) => Promise<Result<T, E>>;
  readonly describe: (error: E) => string;
  readonly notMatching: string;
};

const codeOf = (content: QrContent) =>
  content.kind === 'vehicleToken'
    ? content.token
    : content.kind === 'appointmentQr'
      ? content.qrCode
      : null;

export function useQrScan<T, E>(target: QrScanTarget<T, E>, onResolved: (value: T) => void) {
  const { accessControl, clock, config, logger } = useDependencies();
  const camera = useCameraAccess();
  const [phase, setPhase] = useState<QrScanPhase>({ type: 'scanning' });
  const [torchOn, setTorchOn] = useState(false);
  // La cámara reporta el mismo QR varias veces por segundo: solo vale la primera lectura
  const locked = useRef(false);

  const vibrate = (type: Haptics.NotificationFeedbackType) =>
    Haptics.notificationAsync(type).catch((error: unknown) =>
      logger.warn('No se pudo vibrar', { error }),
    );

  const reject = (message: string, detail: ScanResultView | null = null) => {
    void vibrate(Haptics.NotificationFeedbackType.Error);
    setPhase({ type: 'rejected', message, detail });
  };

  const validate = async (data: string) => {
    const scan = accessControl.readQr(data);
    const code = codeOf(scan.content);
    if (scan.content.kind !== target.kind || !code) {
      return reject(target.notMatching, toScanResultView(scan, clock.now(), config.timeZone));
    }
    setPhase({ type: 'validating' });
    const result = await target.resolve(code);
    if (!result.ok) return reject(target.describe(result.error));

    void vibrate(Haptics.NotificationFeedbackType.Success);
    setTorchOn(false);
    setPhase({ type: 'scanning' });
    locked.current = false;
    onResolved(result.value);
  };

  return {
    camera,
    phase,
    torchOn,
    toggleTorch: () => setTorchOn((on) => !on),
    handleScanned: ({ data }: BarcodeScanningResult) => {
      if (locked.current) return;
      locked.current = true;
      void validate(data);
    },
    scanAgain: () => {
      locked.current = false;
      setPhase({ type: 'scanning' });
    },
  };
}
