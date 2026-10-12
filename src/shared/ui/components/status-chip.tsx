import { StyleSheet, View } from 'react-native';

import { colors, fontFamilies, radius, spacing } from '../theme';
import { AppText } from './app-text';
import { Icon, type IconName } from './icon';

export type ChipTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const TONES: Record<ChipTone, { color: string; background: string }> = {
  success: { color: colors.success, background: colors.successTint },
  warning: { color: colors.warning, background: colors.warningTint },
  danger: { color: colors.danger, background: colors.dangerTint },
  info: { color: colors.info, background: colors.infoTint },
  neutral: { color: colors.textMuted, background: colors.border },
};

type StatusChipProps = { label: string; tone: ChipTone; icon?: IconName };

export function StatusChip({ label, tone, icon = 'circle-outline' }: StatusChipProps) {
  const { color, background } = TONES[tone];
  return (
    <View style={[styles.chip, { backgroundColor: background }]}>
      <Icon name={icon} size={14} color={color} />
      <AppText variant="caption" color={color} style={styles.label}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xxs,
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  label: { fontFamily: fontFamilies.semibold },
});
