import type { BarcodeScanningResult } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useRef, useState } from 'react';

import type { UnitValidationError } from '../../domain';
import { useCameraAccess } from '../hooks/use-camera-access';
import { toScanResultView, type ScanResultView } from '../mappers/scan-result-view';
import { describeValidationError } from '../mappers/validation-message';
import { useDependencies } from '@/core/di';
import type { Result } from '@/shared/domain';
import { STRINGS } from '@/shared/lib';

export type VehicleScanPhase =
  | { readonly type: 'scanning' }
  | { readonly type: 'validating' }
  | { readonly type: 'rejected'; readonly message: string; readonly detail: ScanResultView | null };

const { rejection: TEXT } = STRINGS.entry;

export type VehicleQrResolver<T> = (token: string) => Promise<Result<T, UnitValidationError>>;

export function useVehicleScan<T>(resolve: VehicleQrResolver<T>, onResolved: (value: T) => void) {
  const { accessControl, clock, config, logger } = useDependencies();
  const camera = useCameraAccess();
  const [phase, setPhase] = useState<VehicleScanPhase>({ type: 'scanning' });
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
    if (scan.content.kind !== 'vehicleToken') {
      return reject(TEXT.notVehicleQr, toScanResultView(scan, clock.now(), config.timeZone));
    }
    setPhase({ type: 'validating' });
    const result = await resolve(scan.content.token);
    if (!result.ok) return reject(describeValidationError(result.error, config.timeZone));

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
