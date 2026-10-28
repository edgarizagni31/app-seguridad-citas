import { Redirect } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppointmentHeader } from '../components/appointment-header';
import { GateFooter } from '../components/gate-footer';
import { GateTopBar } from '../components/gate-top-bar';
import { PersonRow } from '../components/person-row';
import { PlateBadge } from '../components/plate-badge';
import { useGateVisitors } from '../view-models/use-gate-flow';
import { STRINGS } from '@/shared/lib';
import {
  AppText,
  Banner,
  Button,
  colors,
  Icon,
  type IconName,
  radius,
  Screen,
  SegmentedControl,
  spacing,
} from '@/shared/ui';

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

        <Section icon="steering" title={TEXT.drivers}>
          {vm.drivers.map(({ person, plate }) => (
            <View key={person.id} style={styles.item}>
              <View style={styles.plateRow}>
                <AppText variant="caption" color={colors.textMuted}>
                  {TEXT.driverRole}
                </AppText>
                <PlateBadge plate={plate} />
              </View>
              <PersonRow person={person} arrived />
            </View>
          ))}
        </Section>

        <Section icon="account-multiple-outline" title={TEXT.companions(vm.companions.length)}>
          <AppText variant="caption" color={colors.textMuted}>
            {vm.companions.length === 0 ? TEXT.noCompanions : TEXT.markHint}
          </AppText>
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
        </Section>
      </ScrollView>
      <GateFooter>
        {vm.error && <Banner tone="error" message={vm.error} />}
        <Button
          label={TEXT.confirm}
          icon="check"
          size="lg"
          loading={vm.busy}
          disabled={!vm.canConfirm}
          onPress={vm.confirm}
        />
      </GateFooter>
    </Screen>
  );
}

type SectionProps = { icon: IconName; title: string; children: ReactNode };

function Section({ icon, title, children }: SectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionTitle}>
        <Icon name={icon} color={colors.primaryText} />
        <AppText variant="bodyStrong" role="heading">
          {title}
        </AppText>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, gap: spacing.md },
  section: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  item: { gap: spacing.xs },
  plateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
