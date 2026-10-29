import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { InspectionStatusChip } from '../components/inspection-status-chip';
import { useInspectionsHome } from '../view-models/use-inspections-flow';
import { PlateBadge } from '@/modules/access-control';
import { UserHeader } from '@/modules/auth';
import { STRINGS } from '@/shared/lib';
import { AppText, colors, EmptyState, Icon, radius, Screen, shadows, spacing } from '@/shared/ui';

const { inspections: TEXT } = STRINGS;

// Inicio HSE: escanear el QR de la cita y ver las inspecciones guardadas en el teléfono
export function InspectionsHomeScreen() {
  const vm = useInspectionsHome();

  return (
    <Screen edges={[]}>
      <ScrollView contentContainerStyle={styles.content}>
        <UserHeader roleLabel={STRINGS.session.hseRole} subtitle={TEXT.welcome} />
        <View>
          <AppText variant="title" role="heading">
            {TEXT.title}
          </AppText>
          <AppText color={colors.textMuted}>{vm.today}</AppText>
        </View>

        <Pressable
          role="button"
          aria-label={TEXT.scanTitle}
          onPress={vm.scan}
          style={({ pressed }) => [styles.scan, pressed && styles.scanPressed]}
        >
          <View style={styles.scanIcon}>
            <Icon name="qrcode-scan" color={colors.textOnDark} size={36} />
          </View>
          <View style={styles.flex}>
            <AppText variant="heading" color={colors.textOnDark}>
              {TEXT.scanTitle}
            </AppText>
            <AppText color={colors.textOnDark}>{TEXT.scanHint}</AppText>
          </View>
          <Icon name="chevron-right" color={colors.textOnDark} />
        </Pressable>

        <AppText variant="bodyStrong" role="heading">
          {TEXT.localTitle}
        </AppText>
        {vm.loading && <ActivityIndicator color={colors.primary} />}
        {!vm.loading && vm.items.length === 0 && (
          <EmptyState
            icon="clipboard-check-outline"
            title={TEXT.emptyTitle}
            message={TEXT.emptyMessage}
          />
        )}
        {vm.items.map((item) => (
          <Pressable
            key={item.id}
            role="button"
            aria-label={`${item.plate}, ${TEXT.status[item.status]}`}
            onPress={item.open}
            style={({ pressed }) => [styles.item, pressed && styles.pressed]}
          >
            <View style={styles.info}>
              <PlateBadge plate={item.plate} />
              <AppText variant="bodyStrong" numberOfLines={1}>
                {item.clientName}
              </AppText>
              <AppText variant="caption" color={colors.info} numberOfLines={1}>
                {item.voucherCode}
              </AppText>
            </View>
            <View style={styles.trailing}>
              <InspectionStatusChip status={item.status} />
              <Icon name="chevron-right" color={colors.textMuted} />
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.md, gap: spacing.md },
  scan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
    ...shadows.card,
  },
  scanPressed: { backgroundColor: colors.primaryPressed },
  scanIcon: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pressed: { opacity: 0.85 },
  info: { flex: 1, gap: spacing.xxs, alignItems: 'flex-start' },
  trailing: { alignItems: 'flex-end', gap: spacing.xs },
});
