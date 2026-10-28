import { Redirect } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppointmentHeader } from '../components/appointment-header';
import { GateTopBar } from '../components/gate-top-bar';
import { useGateUnits } from '../view-models/use-gate-flow';
import { STRINGS } from '@/shared/lib';
import {
  AppText,
  Button,
  colors,
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
        <AppText variant="bodyStrong" role="heading">
          {TEXT.unitsTitle}
        </AppText>
        <TextField
          label={TEXT.searchUnits}
          icon="magnify"
          placeholder={TEXT.searchUnits}
          autoCapitalize="characters"
          autoCorrect={false}
          value={vm.query}
          onChangeText={vm.setQuery}
        />
        {vm.units.length === 0 && <AppText color={colors.textMuted}>{TEXT.noUnits}</AppText>}
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
            <View style={styles.truck}>
              <Icon name="truck-outline" color={colors.primaryText} size={32} />
            </View>
            <View style={styles.flex}>
              <AppText variant="heading">{unit.plate}</AppText>
              <AppText color={colors.textMuted}>{unit.number}</AppText>
            </View>
            <Icon
              name={unit.presented ? 'check-circle' : 'chevron-right'}
              color={unit.presented ? colors.success : colors.textMuted}
              size={sizes.icon}
            />
          </Pressable>
        ))}
      </ScrollView>
      {vm.presentedCount > 0 && (
        <View style={styles.footer}>
          <Button
            label={TEXT.confirmCount(vm.presentedCount)}
            icon="arrow-right"
            size="lg"
            disabled={!vm.canConfirm}
            onPress={vm.toVisitors}
          />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.md, gap: spacing.md },
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
  presented: { borderColor: colors.success, backgroundColor: colors.successTint },
  pressed: { opacity: 0.8 },
  truck: {
    width: 64,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.infoTint,
  },
  footer: { padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
});
