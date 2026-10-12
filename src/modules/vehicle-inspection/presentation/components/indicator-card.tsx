import { Pressable, StyleSheet } from 'react-native';

import { AppText, colors, Icon, radius, spacing, type IconName } from '@/shared/ui';

export type IndicatorTone = 'warning' | 'info' | 'success';

const TONES: Record<IndicatorTone, { color: string; background: string }> = {
  warning: { color: colors.warning, background: colors.warningTint },
  info: { color: colors.info, background: colors.infoTint },
  success: { color: colors.success, background: colors.successTint },
};

type IndicatorCardProps = {
  label: string;
  value: number;
  icon: IconName;
  tone: IndicatorTone;
  selected: boolean;
  onPress: () => void;
};

export function IndicatorCard({ label, value, icon, tone, selected, onPress }: IndicatorCardProps) {
  const { color, background } = TONES[tone];
  return (
    <Pressable
      role="button"
      aria-label={`${label}: ${value}`}
      aria-selected={selected}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: background, borderColor: selected ? color : 'transparent' },
        pressed && styles.pressed,
      ]}
    >
      <Icon name={icon} color={color} />
      <AppText variant="caption" color={color}>
        {label}
      </AppText>
      <AppText variant="title" color={color}>
        {value}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    gap: 2,
    padding: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 2,
  },
  pressed: { opacity: 0.75 },
});
