import { StyleSheet, View } from 'react-native';

import { AppText, colors, ProgressBar, spacing } from '@/shared/ui';

type GateProgressProps = { done: number; total: number; label: string };

export function GateProgress({ done, total, label }: GateProgressProps) {
  return (
    <View style={styles.wrapper}>
      <AppText variant="caption" color={done > 0 ? colors.primaryText : colors.textMuted}>
        {label}
      </AppText>
      <ProgressBar value={total === 0 ? 0 : done / total} label={label} />
    </View>
  );
}

const styles = StyleSheet.create({ wrapper: { gap: spacing.xxs } });
