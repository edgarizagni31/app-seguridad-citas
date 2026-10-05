import { CameraView } from 'expo-camera';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScannerOverlay } from '../components/scanner-overlay';
import { useScannerViewModel } from '../view-models/use-scanner-view-model';
import { STRINGS } from '@/shared/lib';
import { Button, colors, EmptyState, IconButton, Screen, spacing } from '@/shared/ui';

const { scanner: TEXT } = STRINGS;

export function ScannerScreen() {
  const router = useRouter();
  const close = () => router.back();
  const vm = useScannerViewModel(close);
  const insets = useSafeAreaInsets();

  if (vm.permissionState === 'checking') {
    return (
      <View style={[styles.camera, styles.center]}>
        <ActivityIndicator color={colors.textOnDark} />
      </View>
    );
  }

  if (vm.permissionState !== 'granted') {
    const blocked = vm.permissionState === 'blocked';
    return (
      <Screen>
        <View style={styles.permission}>
          <EmptyState
            icon="camera-off-outline"
            title={TEXT.permission.title}
            message={TEXT.permission.message}
          >
            <View style={styles.actions}>
              <Button
                label={blocked ? TEXT.permission.openSettings : TEXT.permission.request}
                onPress={blocked ? vm.openSettings : vm.requestPermission}
              />
              <Button label={STRINGS.common.back} variant="text" onPress={close} />
            </View>
          </EmptyState>
        </View>
      </Screen>
    );
  }

  return (
    <View style={styles.camera}>
      <StatusBar style="light" />
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={vm.torchOn}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={vm.handleScanned}
      />
      <ScannerOverlay />
      <View style={[styles.toolbar, { top: insets.top + spacing.sm }]}>
        <IconButton icon="close" label={TEXT.close} variant="translucent" onPress={close} />
        <IconButton
          icon={vm.torchOn ? 'flashlight-off' : 'flashlight'}
          label={vm.torchOn ? TEXT.torchOff : TEXT.torchOn}
          variant="translucent"
          selected={vm.torchOn}
          onPress={vm.toggleTorch}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  camera: { flex: 1, backgroundColor: colors.cameraBackground },
  center: { alignItems: 'center', justifyContent: 'center' },
  permission: { flex: 1, justifyContent: 'center' },
  actions: { alignSelf: 'stretch', gap: spacing.xs, marginTop: spacing.lg },
  toolbar: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
