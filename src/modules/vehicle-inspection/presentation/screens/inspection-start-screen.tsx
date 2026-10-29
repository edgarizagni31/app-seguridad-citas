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
  shadows,
  spacing,
} from '@/shared/ui';

const { inspections: TEXT, inspection: INSPECTION } = STRINGS;

export function InspectionStartScreen() {
  const vm = useInspectionStart();
  const { target } = vm;
  const finished = vm.status === 'finished';

  return (
    <Screen>
      <View style={styles.bar}>
        <InspectionTopBar title={INSPECTION.header} onBack={vm.back} onClose={vm.back} />
      </View>
      {vm.loading ? (
        <ActivityIndicator color={colors.primary} style={styles.loading} />
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
                <AppText variant="code">{target.plate}</AppText>
              </View>
            </View>
            <View style={styles.card}>
              <View style={styles.row}>
                <Icon name="office-building-outline" color={colors.accent} />
                <AppText variant="heading" style={styles.flex} numberOfLines={1}>
                  {target.clientName}
                </AppText>
              </View>
              <View style={styles.row}>
                <Icon name="file-document-outline" color={colors.textMuted} />
                <AppText color={colors.textMuted}>{INSPECTION.voucher}</AppText>
                <AppText variant="label" color={colors.info} style={styles.flex} numberOfLines={1}>
                  {target.voucherCode}
                </AppText>
              </View>
              <View style={styles.row}>
                <Icon name="account-hard-hat-outline" color={colors.textMuted} />
                <AppText color={colors.textMuted}>{TEXT.start.inspector}</AppText>
                <AppText variant="bodyStrong" color={colors.info}>
                  {TEXT.start.inspectorName(vm.inspectorName)}
                </AppText>
              </View>
            </View>
            {vm.progress && (
              <View style={styles.progress}>
                <AppText variant="caption" color={colors.primaryText}>
                  {INSPECTION.stepOf(vm.progress.position, vm.progress.total)}
                </AppText>
                <ProgressBar
                  value={vm.progress.percent / 100}
                  label={INSPECTION.stepOf(vm.progress.position, vm.progress.total)}
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
                label={vm.status === 'in_progress' ? TEXT.start.continue : TEXT.start.title}
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
  card: {
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  progress: { gap: spacing.xxs },
  footer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
});
