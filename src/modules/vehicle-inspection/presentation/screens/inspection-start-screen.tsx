import { Image } from 'expo-image';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { InspectionTopBar } from '../components/inspection-top-bar';
import { useInspectionStart } from '../view-models/use-inspection-start';
import { STRINGS } from '@/shared/lib';
import {
  AppText,
  ASSETS,
  Banner,
  Button,
  colors,
  Icon,
  ProgressBar,
  radius,
  Screen,
  spacing,
} from '@/shared/ui';

const { inspections: TEXT, inspection: INSPECTION } = STRINGS;

export function InspectionStartScreen() {
  const vm = useInspectionStart();
  const { vehicle, appointment } = vm;
  const finished = vehicle?.status === 'inspected' || vehicle?.status === 'observed';

  return (
    <Screen>
      <View style={styles.bar}>
        <InspectionTopBar title={INSPECTION.header} onBack={vm.back} onClose={vm.back} />
      </View>
      {vm.loading ? (
        <ActivityIndicator color={colors.primary} style={styles.loading} />
      ) : !vehicle || !appointment ? (
        <View style={styles.content}>
          <Banner tone="warning" message={TEXT.start.notFound} />
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.hero}>
              <Image
                source={ASSETS.vehiclePhoto}
                style={styles.photo}
                contentFit="cover"
                aria-hidden
              />
              <View style={styles.plate}>
                <AppText variant="code">{vehicle.plate}</AppText>
              </View>
            </View>
            <View style={styles.info}>
              <View style={styles.row}>
                <Icon name="file-document-outline" color={colors.textMuted} />
                <AppText color={colors.textMuted}>{INSPECTION.voucher}</AppText>
                <AppText variant="label" style={styles.flex} numberOfLines={1}>
                  {appointment.voucherCode}
                </AppText>
              </View>
              <View style={styles.row}>
                <Icon name="warehouse" color={colors.text} />
                <AppText variant="heading">{appointment.clientName}</AppText>
              </View>
              <View style={styles.entry}>
                <Icon name="check-circle" color={colors.success} />
                <AppText variant="bodyStrong" color={colors.success}>
                  {TEXT.start.entryConfirmed(vehicle.visitorsEntered)}
                </AppText>
              </View>
              <View style={styles.row}>
                <Icon name="account-outline" color={colors.textMuted} />
                <AppText color={colors.textMuted}>{TEXT.start.inspector}</AppText>
                <AppText variant="bodyStrong" color={colors.info}>
                  {TEXT.start.inspectorName(vm.inspectorName)}
                </AppText>
              </View>
            </View>
            {vehicle.progress && (
              <View style={styles.progress}>
                <AppText variant="caption">
                  {INSPECTION.stepOf(vehicle.progress.position, vehicle.progress.total)}
                </AppText>
                <ProgressBar
                  value={vehicle.progress.percent / 100}
                  label={INSPECTION.stepOf(vehicle.progress.position, vehicle.progress.total)}
                />
              </View>
            )}
            {vm.error && <Banner tone="error" message={vm.error} />}
            <Banner
              tone="info"
              message={finished ? TEXT.start.finished : TEXT.start.instructions}
            />
          </ScrollView>
          <View style={styles.footer}>
            {finished ? (
              <Button label={TEXT.start.viewResult} size="lg" onPress={vm.viewResult} />
            ) : (
              <Button
                label={vehicle.status === 'in_progress' ? TEXT.start.continue : TEXT.start.title}
                icon="file-document-edit-outline"
                size="lg"
                loading={vm.opening}
                onPress={vm.start}
              />
            )}
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bar: { paddingHorizontal: spacing.md, paddingTop: spacing.xs },
  loading: { marginTop: spacing.xl },
  content: { padding: spacing.md, gap: spacing.md },
  hero: { alignItems: 'center' },
  photo: { width: '100%', aspectRatio: 370 / 246, borderRadius: radius.lg },
  plate: {
    marginTop: -28,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 3,
    borderColor: colors.plateBorder,
    backgroundColor: colors.surface,
  },
  info: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.successTint,
  },
  progress: { gap: spacing.xxs },
  footer: { padding: spacing.md },
});
