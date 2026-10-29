import { Redirect } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { InspectionStatusChip } from '../components/inspection-status-chip';
import { useInspectionUnits } from '../view-models/use-inspections-flow';
import { PlateBadge } from '@/modules/access-control';
import { STRINGS } from '@/shared/lib';
import {
  AppText,
  colors,
  EmptyState,
  Icon,
  IconButton,
  radius,
  Screen,
  spacing,
} from '@/shared/ui';

const { inspections: TEXT, gate: GATE } = STRINGS;

export function InspectionUnitsScreen() {
  const vm = useInspectionUnits();
  if (!vm.appointment) return <Redirect href="/inspections" />;
  const { appointment } = vm;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.bar}>
          <IconButton icon="arrow-left" label={STRINGS.common.back} onPress={vm.back} />
          <AppText variant="bodyStrong" role="heading" style={styles.flex}>
            {TEXT.unitsTitle}
          </AppText>
        </View>
        <View style={styles.appointment}>
          <Icon name="office-building-outline" color={colors.accent} />
          <View style={styles.flex}>
            <AppText variant="caption" color={colors.textMuted}>
              {GATE.client}
            </AppText>
            <AppText variant="bodyStrong">{appointment.clientName ?? '—'}</AppText>
          </View>
          <View style={styles.code}>
            <AppText variant="caption" color={colors.textMuted}>
              {GATE.appointment}
            </AppText>
            <AppText variant="caption" color={colors.info} numberOfLines={1}>
              {appointment.code}
            </AppText>
          </View>
        </View>
        {vm.units.length === 0 && (
          <EmptyState icon="truck-remove-outline" title={TEXT.noUnits} message={TEXT.scanHint} />
        )}
        {vm.units.map((unit) => (
          <Pressable
            key={unit.id}
            role="button"
            aria-label={`${unit.plate}, ${unit.number}${unit.status ? `, ${TEXT.status[unit.status]}` : ''}`}
            onPress={unit.open}
            style={({ pressed }) => [styles.unit, pressed && styles.pressed]}
          >
            <View style={styles.truck}>
              <Icon name="truck-outline" color={colors.primaryText} size={32} />
            </View>
            <View style={styles.info}>
              <PlateBadge plate={unit.plate} />
              <AppText variant="caption" color={colors.textMuted}>
                {unit.number}
              </AppText>
              {unit.status && <InspectionStatusChip status={unit.status} />}
            </View>
            <Icon name="chevron-right" color={colors.textMuted} />
          </Pressable>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.md, gap: spacing.md },
  bar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  appointment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.infoTint,
  },
  code: { flex: 1.4 },
  unit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pressed: { opacity: 0.85 },
  truck: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.infoTint,
  },
  info: { flex: 1, gap: spacing.xxs, alignItems: 'flex-start' },
});
