import { Redirect } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { GateFooter } from '../components/gate-footer';
import { PlateBadge } from '../components/plate-badge';
import { useGateConfirmed } from '../view-models/use-gate-confirmed';
import { STRINGS } from '@/shared/lib';
import {
  AppText,
  Avatar,
  Banner,
  Button,
  colors,
  Icon,
  type IconName,
  radius,
  Screen,
  shadows,
  spacing,
} from '@/shared/ui';

const { gate: TEXT } = STRINGS;

export function GateConfirmedScreen() {
  const vm = useGateConfirmed();
  if (!vm.ready) return <Redirect href="/" />;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.check}>
            <Icon name="check-bold" color={colors.textOnDark} size={48} />
          </View>
          <AppText variant="title" role="heading" align="center">
            {TEXT.confirmedTitle}
          </AppText>
          <AppText color={colors.textMuted} align="center">
            {vm.vehicular ? TEXT.confirmedVehicular : TEXT.confirmedPedestrian}
          </AppText>
        </View>

        <View style={styles.card}>
          <AppText variant="label" color={colors.textMuted}>
            {TEXT.summary}
          </AppText>
          <Row icon="office-building-outline" label={TEXT.client} value={vm.clientName} />
          <Row icon="ticket-confirmation-outline" label={TEXT.appointment} value={vm.code} />
          {vm.enteredAt && (
            <Row icon="clock-check-outline" label={TEXT.enteredAt} value={vm.enteredAt} />
          )}
          {vm.plates.length > 0 && (
            <View style={styles.row}>
              <Icon name="truck-outline" color={colors.primaryText} />
              <View style={styles.flex}>
                <AppText variant="caption" color={colors.textMuted}>
                  {TEXT.vehicles}
                </AppText>
                <View style={styles.plates}>
                  {vm.plates.map((plate) => (
                    <PlateBadge key={plate} plate={plate} />
                  ))}
                </View>
              </View>
            </View>
          )}
        </View>

        <NameList title={vm.vehicular ? TEXT.entering : TEXT.people} names={vm.entering} entering />
        {vm.notEntering.length > 0 && (
          <NameList title={TEXT.notEntering} names={vm.notEntering} entering={false} />
        )}
        {vm.rejectedMessages.length > 0 && (
          <Banner tone="warning" message={vm.rejectedMessages.join('\n')} />
        )}
        {vm.vehicular && (
          <View style={styles.note}>
            <Icon name="shield-check-outline" color={colors.info} />
            <AppText variant="caption" color={colors.info} style={styles.flex}>
              {TEXT.hseInfo}
            </AppText>
          </View>
        )}
      </ScrollView>
      <GateFooter>
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
      </GateFooter>
    </Screen>
  );
}

function Row({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Icon name={icon} color={colors.primaryText} />
      <View style={styles.flex}>
        <AppText variant="caption" color={colors.textMuted}>
          {label}
        </AppText>
        <AppText variant="bodyStrong">{value}</AppText>
      </View>
    </View>
  );
}

type NameListProps = { title: string; names: readonly string[]; entering: boolean };

function NameList({ title, names, entering }: NameListProps) {
  return (
    <View style={styles.card}>
      <AppText variant="bodyStrong" role="heading">
        {`${title} (${names.length})`}
      </AppText>
      {names.map((name) => (
        <View key={name} style={styles.person}>
          <Avatar name={name} />
          <AppText style={styles.flex} color={entering ? colors.text : colors.textMuted}>
            {name}
          </AppText>
          <Icon
            name={entering ? 'check-circle' : 'minus-circle-outline'}
            color={entering ? colors.success : colors.textMuted}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.md, gap: spacing.md },
  hero: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  check: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.success,
    borderWidth: 8,
    borderColor: colors.successTint,
  },
  card: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  plates: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xxs },
  person: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.infoTint,
  },
});
