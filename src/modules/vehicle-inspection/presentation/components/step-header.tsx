import { StyleSheet, View } from 'react-native';

import { STRINGS } from '@/shared/lib';
import { AppText, colors, Icon, ProgressBar, radius, spacing } from '@/shared/ui';

const { inspection: TEXT } = STRINGS;

type StepHeaderProps = {
  position: number;
  total: number;
  plate: string;
  voucherCode: string;
};

export function StepHeader({ position, total, plate, voucherCode }: StepHeaderProps) {
  const label = TEXT.stepOf(position, total);
  return (
    <View style={styles.container}>
      <ProgressBar value={total === 0 ? 0 : position / total} label={label} />
      <AppText variant="caption" color={colors.textMuted} align="right">
        {label}
      </AppText>
      <View style={styles.vehicle}>
        <Icon name="warehouse" size={18} color={colors.text} />
        <AppText variant="label">{plate}</AppText>
        <AppText variant="caption" color={colors.textMuted}>
          {TEXT.voucher}
        </AppText>
        <AppText variant="caption" color={colors.textMuted} numberOfLines={1} style={styles.flex}>
          {voucherCode}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { gap: spacing.xs },
  vehicle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
