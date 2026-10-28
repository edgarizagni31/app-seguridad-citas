import { Redirect } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppointmentHeader } from '../components/appointment-header';
import { useGateMode } from '../view-models/use-gate-flow';
import { UserHeader } from '@/modules/auth';
import { STRINGS } from '@/shared/lib';
import {
  AppText,
  Button,
  colors,
  Icon,
  type IconName,
  radius,
  Screen,
  shadows,
  spacing,
  StatusChip,
} from '@/shared/ui';

const { gate: TEXT } = STRINGS;

export function GateModeScreen() {
  const vm = useGateMode();
  if (!vm.session || !vm.modes || !vm.counts) return <Redirect href="/" />;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <UserHeader roleLabel={STRINGS.session.securityRole} subtitle={TEXT.roleTitle} />
        <AppointmentHeader appointment={vm.session.appointment} />
        <AppText variant="title" role="heading">
          {TEXT.modeTitle}
        </AppText>
        <ModeCard
          icon="truck"
          title={TEXT.vehicular}
          hint={TEXT.vehicularHint}
          count={TEXT.unitsCount(vm.counts.units)}
          unavailable={TEXT.modeUnavailable.vehicular}
          enabled={vm.modes.vehicular}
          onPress={() => vm.choose('vehicular')}
        />
        <ModeCard
          icon="walk"
          title={TEXT.pedestrian}
          hint={TEXT.pedestrianHint}
          count={TEXT.peopleCount(vm.counts.people)}
          unavailable={TEXT.modeUnavailable.pedestrian}
          enabled={vm.modes.pedestrian}
          onPress={() => vm.choose('pedestrian')}
        />
        <Button
          label={TEXT.scanAnother}
          icon="qrcode-scan"
          variant="text"
          onPress={vm.scanAnother}
        />
      </ScrollView>
    </Screen>
  );
}

type ModeCardProps = {
  icon: IconName;
  title: string;
  hint: string;
  count: string;
  unavailable: string;
  enabled: boolean;
  onPress: () => void;
};

function ModeCard({ icon, title, hint, count, unavailable, enabled, onPress }: ModeCardProps) {
  return (
    <Pressable
      role="button"
      aria-label={title}
      aria-disabled={!enabled}
      disabled={!enabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
        !enabled && styles.cardDisabled,
      ]}
    >
      <View style={[styles.icon, !enabled && styles.iconDisabled]}>
        <Icon name={icon} color={enabled ? colors.primary : colors.textMuted} size={44} />
      </View>
      <View style={styles.body}>
        <AppText variant="heading" color={enabled ? colors.text : colors.textMuted}>
          {title}
        </AppText>
        <AppText color={colors.textMuted}>{enabled ? hint : unavailable}</AppText>
        {enabled && <StatusChip label={count} tone="info" icon="information-outline" />}
      </View>
      {enabled && <Icon name="chevron-right" color={colors.primaryText} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, gap: spacing.md },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  cardPressed: { borderColor: colors.primary, backgroundColor: colors.primaryTint },
  cardDisabled: { opacity: 0.6, backgroundColor: colors.background, elevation: 0 },
  icon: {
    width: 76,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.primaryTint,
  },
  iconDisabled: { backgroundColor: colors.border },
  body: { flex: 1, gap: spacing.xxs, alignItems: 'flex-start' },
});
