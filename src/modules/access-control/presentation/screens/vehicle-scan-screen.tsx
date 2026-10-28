import { CameraView } from 'expo-camera';
import { useIsFocused } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ScanFrame } from '../components/scan-frame';
import { ScanRejectionPanel } from '../components/scan-rejection-panel';
import type { UnitValidationError } from '../../domain';
import { describeValidationError } from '../mappers/validation-message';
import { useQrScan, type QrScanTarget } from '../view-models/use-vehicle-scan';
import { useDependencies } from '@/core/di';
import { UserHeader } from '@/modules/auth';
import type { Result } from '@/shared/domain';
import { STRINGS } from '@/shared/lib';
import {
  AppText,
  Button,
  CameraPermissionPanel,
  colors,
  Icon,
  radius,
  Screen,
  sizes,
  spacing,
} from '@/shared/ui';

const { entry: TEXT, scanner: SCANNER } = STRINGS;
const FRAME_SIZE = 200;

export type QrScanTexts = {
  readonly title: string;
  readonly subtitle: string;
  readonly hint: string;
  readonly validating: string;
};

type QrScanScreenProps<T, E> = {
  roleLabel: string;
  target: QrScanTarget<T, E>;
  texts: QrScanTexts;
  onResolved: (value: T) => void;
  // Solo cuando el escáner se abre desde otro flujo
  onCancel?: () => void;
};

const VEHICLE_TEXTS: QrScanTexts = {
  title: TEXT.scanTitle,
  subtitle: TEXT.scanSubtitle,
  hint: TEXT.scanHint,
  validating: TEXT.validating,
};

type VehicleScanScreenProps<T> = {
  roleLabel: string;
  resolve: (token: string) => Promise<Result<T, UnitValidationError>>;
  onResolved: (value: T) => void;
  onCancel?: () => void;
};

// Escáner del QR firmado del vehículo (HSE)
export function VehicleScanScreen<T>({ resolve, ...props }: VehicleScanScreenProps<T>) {
  const { config } = useDependencies();
  return (
    <QrScanScreen
      {...props}
      texts={VEHICLE_TEXTS}
      target={{
        kind: 'vehicleToken',
        resolve,
        describe: (error) => describeValidationError(error, config.timeZone),
        notMatching: TEXT.rejection.notVehicleQr,
      }}
    />
  );
}

export function QrScanScreen<T, E>({
  roleLabel,
  target,
  texts,
  onResolved,
  onCancel,
}: QrScanScreenProps<T, E>) {
  const vm = useQrScan(target, onResolved);
  const focused = useIsFocused();
  const { phase, camera } = vm;
  const cameraOn = focused && camera.state === 'granted' && phase.type === 'scanning';

  return (
    <Screen edges={onCancel ? ['top', 'bottom'] : []}>
      <View style={styles.content}>
        <UserHeader roleLabel={roleLabel} />
        <View style={styles.titles}>
          <AppText variant="heading" role="heading">
            {texts.title}
          </AppText>
          <AppText color={colors.textMuted}>{texts.subtitle}</AppText>
        </View>

        <View style={[styles.cameraCard, phase.type === 'rejected' && styles.panelCard]}>
          {phase.type === 'rejected' ? (
            <ScanRejectionPanel
              message={phase.message}
              detail={phase.detail}
              onScanAgain={vm.scanAgain}
            />
          ) : camera.state === 'requestable' || camera.state === 'blocked' ? (
            <CameraPermissionPanel
              state={camera.state}
              onRequest={camera.requestPermission}
              onOpenSettings={camera.openSettings}
            />
          ) : (
            <>
              {cameraOn && (
                <CameraView
                  style={StyleSheet.absoluteFill}
                  facing="back"
                  enableTorch={vm.torchOn}
                  barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                  onBarcodeScanned={vm.handleScanned}
                />
              )}
              <ScanFrame size={FRAME_SIZE} />
              {phase.type === 'validating' ? (
                <View
                  style={[StyleSheet.absoluteFill, styles.validating]}
                  role="progressbar"
                  aria-label={texts.validating}
                >
                  <ActivityIndicator color={colors.textOnDark} size="large" />
                  <AppText variant="bodyStrong" color={colors.textOnDark}>
                    {texts.validating}
                  </AppText>
                </View>
              ) : (
                <View style={styles.hint}>
                  <Icon name="qrcode-scan" color={colors.textOnDark} />
                  <AppText variant="label" color={colors.textOnDark}>
                    {texts.hint}
                  </AppText>
                </View>
              )}
            </>
          )}
        </View>

        <View style={styles.footer}>
          <Pressable
            role="button"
            aria-label={vm.torchOn ? SCANNER.torchOff : SCANNER.torchOn}
            aria-selected={vm.torchOn}
            disabled={!cameraOn}
            onPress={vm.toggleTorch}
            style={({ pressed }) => [
              styles.torch,
              vm.torchOn && styles.torchOn,
              (pressed || !cameraOn) && styles.dimmed,
            ]}
          >
            <Icon
              name={vm.torchOn ? 'flashlight-off' : 'flashlight'}
              color={vm.torchOn ? colors.text : colors.textOnDark}
            />
          </Pressable>
          <View style={styles.flex}>
            <Button
              label={SCANNER.uploadPhoto}
              icon="image-outline"
              variant="outline"
              disabled={phase.type !== 'scanning'}
              onPress={vm.uploadPhoto}
            />
          </View>
        </View>
        {onCancel && <Button label={TEXT.cancel} variant="outline" onPress={onCancel} />}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flex: 1, padding: spacing.md, gap: spacing.md },
  titles: { gap: spacing.xxs },
  cameraCard: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: radius.xl,
    backgroundColor: colors.cameraBackground,
  },
  panelCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  hint: {
    position: 'absolute',
    bottom: spacing.lg,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.translucentDark,
  },
  validating: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.overlay,
  },
  footer: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  torch: {
    width: sizes.button,
    height: sizes.button,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.text,
  },
  torchOn: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  dimmed: { opacity: 0.6 },
});
