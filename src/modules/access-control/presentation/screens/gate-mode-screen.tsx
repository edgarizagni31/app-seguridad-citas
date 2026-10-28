import { Redirect } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppointmentHeader } from '../components/appointment-header';
import { useGateMode } from '../view-models/use-gate-flow';
import { UserHeader } from '@/modules/auth';
import { STRINGS } from '@/shared/lib';
import { AppText, Button, colors, Icon, type IconName, radius, Screen, spacing } from '@/shared/ui';

const { gate: TEXT } = STRINGS;

export function GateModeScreen() {
  const vm = useGateMode();
  if (!vm.session || !vm.modes) return <Redirect href="/" />;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <UserHeader roleLabel={STRINGS.session.securityRole} subtitle={TEXT.roleTitle} />
        <AppointmentHeader appointment={vm.session.appointment} />
        <AppText variant="heading" role="heading">
          {TEXT.modeTitle}
        </AppText>
        <ModeCard
          icon="truck"
          title={TEXT.vehicular}
          hint={TEXT.vehicularHint}
          enabled={vm.modes.vehicular}
          onPress={() => vm.choose('vehicular')}
        />
        <ModeCard
          icon="walk"
          title={TEXT.pedestrian}
          hint={TEXT.pedestrianHint}
          enabled={vm.modes.pedestrian}
          onPress={() => vm.choose('pedestrian')}
        />
        <Button label={TEXT.scanAnother} variant="text" onPress={vm.scanAnother} />
      </ScrollView>
    </Screen>
  );
}

type ModeCardProps = {
  icon: IconName;
  title: string;
  hint: string;
  enabled: boolean;
  onPress: () => void;
};

function ModeCard({ icon, title, hint, enabled, onPress }: ModeCardProps) {
  return (
    <Pressable
      role="button"
      aria-label={title}
      aria-disabled={!enabled}
      disabled={!enabled}
      onPress={onPress}
      style={({ pressed }) => [styles.card, !enabled && styles.disabled, pressed && styles.pressed]}
    >
      <View style={styles.cardBody}>
        <Icon name={icon} color={colors.primaryText} size={56} />
        <AppText variant="heading" color={colors.primaryText} align="center">
          {title}
        </AppText>
        <AppText color={colors.textMuted} align="center">
          {hint}
        </AppText>
      </View>
      <Icon name="chevron-right" color={colors.primaryText} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, gap: spacing.md },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.successTint,
  },
  cardBody: { flex: 1, alignItems: 'center', gap: spacing.xs },
  disabled: { opacity: 0.45, backgroundColor: colors.surface },
  pressed: { opacity: 0.8 },
});
