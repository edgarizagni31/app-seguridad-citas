import { Redirect } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppointmentHeader } from '../components/appointment-header';
import { GateTopBar } from '../components/gate-top-bar';
import { PersonRow } from '../components/person-row';
import { useGateVisitors } from '../view-models/use-gate-flow';
import { STRINGS } from '@/shared/lib';
import { AppText, Banner, Button, colors, Screen, SegmentedControl, spacing } from '@/shared/ui';

const { gate: TEXT } = STRINGS;

const ARRIVAL = [
  { value: 'yes', label: TEXT.arrived, selectedColor: colors.success },
  { value: 'no', label: TEXT.notArrived, selectedColor: colors.danger },
] as const;

export function GateVisitorsScreen() {
  const vm = useGateVisitors();
  if (!vm.session) return <Redirect href="/" />;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <GateTopBar title={TEXT.visitorsTitle} />
        <AppointmentHeader appointment={vm.session.appointment} />

        <AppText variant="bodyStrong" role="heading">
          {TEXT.drivers}
        </AppText>
        {vm.drivers.map(({ person, plate }) => (
          <View key={person.id} style={styles.item}>
            <AppText variant="caption" color={colors.textMuted}>
              {`${TEXT.driverRole} · ${plate}`}
            </AppText>
            <PersonRow person={person} arrived />
          </View>
        ))}

        <AppText variant="bodyStrong" role="heading">
          {TEXT.companions(vm.companions.length)}
        </AppText>
        {vm.companions.length === 0 ? (
          <AppText color={colors.textMuted}>{TEXT.noCompanions}</AppText>
        ) : (
          <AppText color={colors.textMuted}>{TEXT.markHint}</AppText>
        )}
        {vm.companions.map((person) => {
          const arrived = vm.arrived(person.id);
          return (
            <View key={person.id} style={styles.item}>
              <PersonRow
                person={person}
                arrived={arrived}
                trailing={person.enabled ? <View /> : undefined}
              />
              {person.enabled && (
                <SegmentedControl
                  label={TEXT.arrivalOf(person.name)}
                  size="sm"
                  options={ARRIVAL}
                  value={arrived ? 'yes' : 'no'}
                  onChange={(value) => vm.mark(person.id, value === 'yes')}
                />
              )}
            </View>
          );
        })}
      </ScrollView>
      <View style={styles.footer}>
        {vm.error && <Banner tone="error" message={vm.error} />}
        <Button
          label={TEXT.confirm}
          icon="check"
          size="lg"
          loading={vm.busy}
          disabled={!vm.canConfirm}
          onPress={vm.confirm}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, gap: spacing.md },
  item: { gap: spacing.xs },
  footer: {
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
