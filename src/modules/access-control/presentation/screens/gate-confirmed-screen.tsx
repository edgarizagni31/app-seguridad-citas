import { Redirect } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useGateConfirmed } from '../view-models/use-gate-confirmed';
import { STRINGS } from '@/shared/lib';
import { AppText, Banner, Button, Card, colors, Icon, Screen, spacing } from '@/shared/ui';

const { gate: TEXT } = STRINGS;

export function GateConfirmedScreen() {
  const vm = useGateConfirmed();
  if (!vm.ready) return <Redirect href="/" />;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Icon name="check-decagram" color={colors.success} size={72} />
          <AppText variant="title" role="heading" align="center">
            {TEXT.confirmedTitle}
          </AppText>
          <AppText color={colors.textMuted} align="center">
            {vm.vehicular ? TEXT.confirmedVehicular : TEXT.confirmedPedestrian}
          </AppText>
        </View>

        <Card>
          <Row label={TEXT.client} value={vm.clientName} />
          <Row label={TEXT.appointment} value={vm.code} />
          {vm.enteredAt && <Row label={TEXT.enteredAt} value={vm.enteredAt} />}
          {vm.plates.length > 0 && <Row label={TEXT.vehicles} value={vm.plates.join(', ')} />}
        </Card>

        <NameList title={vm.vehicular ? TEXT.entering : TEXT.people} names={vm.entering} />
        {vm.notEntering.length > 0 && <NameList title={TEXT.notEntering} names={vm.notEntering} />}
        {vm.rejectedMessages.length > 0 && (
          <Banner tone="warning" message={vm.rejectedMessages.join('\n')} />
        )}
        {vm.vehicular && <AppText color={colors.textMuted}>{TEXT.hseInfo}</AppText>}
      </ScrollView>
      <View style={styles.footer}>
        <Button label={TEXT.backHome} icon="home" size="lg" onPress={vm.home} />
        {vm.vehicular &&
          vm.inspectable.map((unit) => (
            <Button
              key={unit.id}
              label={vm.inspectable.length === 1 ? TEXT.inspect : TEXT.inspectPlate(unit.plate)}
              variant="outline"
              onPress={() => vm.inspect(unit.id)}
            />
          ))}
      </View>
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <AppText variant="caption" color={colors.textMuted}>
        {label}
      </AppText>
      <AppText variant="bodyStrong">{value}</AppText>
    </View>
  );
}

function NameList({ title, names }: { title: string; names: readonly string[] }) {
  return (
    <Card>
      <AppText variant="bodyStrong" role="heading">
        {`${title} (${names.length})`}
      </AppText>
      {names.map((name) => (
        <View key={name} style={styles.name}>
          <Icon name="account-outline" color={colors.textMuted} />
          <AppText>{name}</AppText>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, gap: spacing.md },
  hero: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  name: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  footer: {
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
