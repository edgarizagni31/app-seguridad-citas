import { CameraView } from 'expo-camera';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useRef } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { REFERENCE_IMAGES } from '../reference-images';
import { useInspectionCamera } from '../view-models/use-inspection-camera';
import { STRINGS } from '@/shared/lib';
import {
  AppText,
  Banner,
  Button,
  CameraPermissionPanel,
  colors,
  IconButton,
  radius,
  Screen,
  spacing,
} from '@/shared/ui';

const { camera: TEXT } = STRINGS.inspection;
const SHUTTER = 76;

export function InspectionCameraScreen() {
  const cameraRef = useRef<CameraView>(null);
  const vm = useInspectionCamera(cameraRef);
  const insets = useSafeAreaInsets();
  const reference = REFERENCE_IMAGES[vm.stepId];

  if (vm.camera.state === 'checking') {
    return (
      <View style={[styles.camera, styles.center]}>
        <ActivityIndicator color={colors.textOnDark} />
      </View>
    );
  }
  if (vm.camera.state !== 'granted') {
    return (
      <Screen>
        <View style={styles.permission}>
          <CameraPermissionPanel
            state={vm.camera.state}
            onRequest={vm.camera.requestPermission}
            onOpenSettings={vm.camera.openSettings}
          />
          <Button label={STRINGS.common.back} variant="text" onPress={vm.close} />
        </View>
      </Screen>
    );
  }

  return (
    <View style={styles.camera}>
      <StatusBar style="light" />
      {vm.preview ? (
        <Image
          source={{ uri: vm.preview.uri }}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
          aria-label={TEXT.preview}
        />
      ) : (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={vm.torchOn}
        />
      )}

      <View style={[styles.toolbar, { top: insets.top + spacing.sm }]}>
        <IconButton icon="close" label={TEXT.close} variant="translucent" onPress={vm.close} />
        {!vm.preview && (
          <IconButton
            icon={vm.torchOn ? 'flashlight-off' : 'flashlight'}
            label={vm.torchOn ? STRINGS.scanner.torchOff : STRINGS.scanner.torchOn}
            variant="translucent"
            selected={vm.torchOn}
            onPress={vm.toggleTorch}
          />
        )}
      </View>

      {reference && !vm.preview && (
        <View style={[styles.reference, { top: insets.top + spacing.sm + 56 }]}>
          <Image source={reference} style={styles.referenceImage} contentFit="cover" aria-hidden />
          <AppText variant="caption" color={colors.textOnDark} align="center">
            {STRINGS.inspection.reference}
          </AppText>
        </View>
      )}

      <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing.md }]}>
        {vm.error && <Banner tone="error" message={vm.error} />}
        {vm.preview ? (
          <View style={styles.row}>
            <View style={styles.flex}>
              <Button
                label={TEXT.retake}
                icon="camera-retake-outline"
                variant="outline"
                disabled={vm.saving}
                onPress={vm.retake}
              />
            </View>
            <View style={styles.flex}>
              <Button label={TEXT.use} icon="check" loading={vm.saving} onPress={vm.use} />
            </View>
          </View>
        ) : (
          <>
            <AppText variant="label" color={colors.textOnDark} align="center">
              {TEXT.hint}
            </AppText>
            <Pressable
              role="button"
              aria-label={TEXT.shutter}
              aria-busy={vm.capturing}
              disabled={vm.capturing}
              onPress={vm.shoot}
              style={({ pressed }) => [styles.shutter, (pressed || vm.capturing) && styles.dimmed]}
            >
              <View style={styles.shutterInner} />
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  camera: { flex: 1, backgroundColor: colors.cameraBackground },
  center: { alignItems: 'center', justifyContent: 'center' },
  permission: { flex: 1, justifyContent: 'center', padding: spacing.md },
  toolbar: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  reference: {
    position: 'absolute',
    right: spacing.md,
    width: 112,
    gap: spacing.xxs,
    padding: spacing.xxs,
    borderRadius: radius.md,
    backgroundColor: colors.translucentDark,
  },
  referenceImage: { width: '100%', aspectRatio: 4 / 3, borderRadius: radius.sm },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    backgroundColor: colors.translucentDark,
  },
  row: { flexDirection: 'row', gap: spacing.sm, alignSelf: 'stretch' },
  shutter: {
    width: SHUTTER,
    height: SHUTTER,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    borderWidth: 4,
    borderColor: colors.textOnDark,
  },
  shutterInner: {
    width: SHUTTER - 16,
    height: SHUTTER - 16,
    borderRadius: radius.full,
    backgroundColor: colors.textOnDark,
  },
  dimmed: { opacity: 0.6 },
});
