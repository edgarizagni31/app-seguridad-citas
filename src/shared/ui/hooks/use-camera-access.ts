import { useCameraPermissions } from 'expo-camera';
import { Linking } from 'react-native';

export type CameraPermissionState = 'checking' | 'granted' | 'requestable' | 'blocked';

export function useCameraAccess() {
  const [permission, requestPermission] = useCameraPermissions();

  const state: CameraPermissionState = !permission
    ? 'checking'
    : permission.granted
      ? 'granted'
      : permission.canAskAgain
        ? 'requestable'
        : 'blocked';

  return {
    state,
    requestPermission: () => void requestPermission(),
    openSettings: () => void Linking.openSettings(),
  };
}
