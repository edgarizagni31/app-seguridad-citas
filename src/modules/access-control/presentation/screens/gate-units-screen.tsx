import { Redirect } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppointmentHeader } from '../components/appointment-header';
import { GateFooter } from '../components/gate-footer';
import { GateProgress } from '../components/gate-progress';
import { GateTopBar } from '../components/gate-top-bar';
import { PlateBadge } from '../components/plate-badge';
import { useGateUnits } from '../view-models/use-gate-flow';
import { STRINGS } from '@/shared/lib';
import {
  AppText,
  Button,
  colors,
  EmptyState,
  Icon,
  radius,
  Screen,
  sizes,
  spacing,
  TextField,
} from '@/shared/ui';

const { gate: TEXT } = STRINGS;

export function GateUnitsScreen() {
  const vm = useGateUnits();
  if (!vm.session) return <Redirect href="/" />;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <GateTopBar title={TEXT.vehicular} />
        <AppointmentHeader appointment={vm.session.appointment} />
        <View style={styles.heading}>
          <AppText variant="heading" role="heading">
            {TEXT.unitsTitle}
          </AppText>
          <GateProgress
            done={vm.presentedCount}
            total={vm.totalUnits}
            label={TEXT.unitsProgress(vm.presentedCount, vm.totalUnits)}
          />
        </View>
        <TextField
          label={TEXT.searchUnits}
          icon="magnify"
          placeholder={TEXT.searchUnits}
          autoCapitalize="characters"
          autoCorrect={false}
          value={vm.query}
          onChangeText={vm.setQuery}
        />
        {vm.units.length === 0 && (
          <EmptyState icon="truck-remove-outline" title={TEXT.noUnits} message={TEXT.searchHint} />
        )}
        {vm.units.map((unit) => (
          <Pressable
            key={unit.id}
            role="button"
            aria-label={`${unit.plate}, ${unit.number}${unit.presented ? `, ${TEXT.arrived}` : ''}`}
            onPress={() => vm.open(unit.id)}
            style={({ pressed }) => [
              styles.unit,
              unit.presented && styles.presented,
              pressed && styles.pressed,
            ]}
          >
            <View style={[styles.truck, unit.presented && styles.truckPresented]}>
              <Icon
                name="truck-outline"
                color={unit.presented ? colors.success : colors.primaryText}
                size={34}
              />
            </View>
            <View style={styles.info}>
              <PlateBadge plate={unit.plate} />
              <AppText variant="caption" color={colors.textMuted}>
                {unit.number}
              </AppText>
              <View style={styles.driver}>
                <Icon
                  name={unit.driverName ? 'account-tie-outline' : 'account-alert-outline'}
                  color={unit.driverName ? colors.textMuted : colors.warning}
                  size={16}
                />
                <AppText
                  variant="caption"
                  color={unit.driverName ? colors.textMuted : colors.warning}
                  numberOfLines={1}
                >
                  {unit.driverName ? TEXT.driverOf(unit.driverName) : TEXT.noDriverShort}
                </AppText>
              </View>
            </View>
            <Icon
              name={unit.presented ? 'check-circle' : 'chevron-right'}
              color={unit.presented ? colors.success : colors.textMuted}
              size={unit.presented ? 32 : sizes.icon}
            />
          </Pressable>
        ))}
      </ScrollView>
      {vm.presentedCount > 0 && (
        <GateFooter>
          <Button
            label={TEXT.confirmCount(vm.presentedCount)}
            icon="arrow-right"
            size="lg"
            disabled={!vm.canConfirm}
            onPress={vm.toVisitors}
          />
        </GateFooter>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, gap: spacing.md },
  heading: { gap: spacing.sm },
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
  presented: { borderWidth: 1.5, borderColor: colors.success, backgroundColor: colors.successTint },
  pressed: { opacity: 0.85 },
  truck: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.infoTint,
  },
  truckPresented: { backgroundColor: colors.surface },
  info: { flex: 1, gap: spacing.xxs },
  driver: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
});
