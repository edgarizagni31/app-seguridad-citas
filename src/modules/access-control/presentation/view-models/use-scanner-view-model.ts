import type { BarcodeScanningResult } from 'expo-camera';
import { useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useRef, useState } from 'react';
import { Linking } from 'react-native';

import { useScanStore } from '../stores/scan-store';
import { useDependencies } from '@/core/di';

export type CameraPermissionState = 'checking' | 'granted' | 'requestable' | 'blocked';

export function useScannerViewModel(onRead: () => void) {
  const { accessControl, logger } = useDependencies();
  const [permission, requestPermission] = useCameraPermissions();
  const [torchOn, setTorchOn] = useState(false);
  const setLastScan = useScanStore((state) => state.setLastScan);
  // La cámara reporta el mismo QR varias veces por segundo: solo vale la primera lectura
  const locked = useRef(false);

  const permissionState: CameraPermissionState = !permission
    ? 'checking'
    : permission.granted
      ? 'granted'
      : permission.canAskAgain
        ? 'requestable'
        : 'blocked';

  const handleScanned = ({ data }: BarcodeScanningResult) => {
    if (locked.current) return;
    locked.current = true;
    setLastScan(accessControl.readQr(data));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch((error: unknown) =>
      logger.warn('No se pudo vibrar', { error }),
    );
    onRead();
  };

  return {
    permissionState,
    requestPermission: () => void requestPermission(),
    openSettings: () => void Linking.openSettings(),
    torchOn,
    toggleTorch: () => setTorchOn((on) => !on),
    handleScanned,
  };
}
