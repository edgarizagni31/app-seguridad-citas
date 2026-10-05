import { StyleSheet, View } from 'react-native';

import { STRINGS } from '@/shared/lib';
import { AppText, colors, radius, spacing } from '@/shared/ui';

type PlateChipProps = { plate: string };

export function PlateChip({ plate }: PlateChipProps) {
  return (
    <View style={styles.plate} accessible aria-label={`${STRINGS.scanResult.plate} ${plate}`}>
      <View style={styles.bolt} />
      <AppText variant="plate" maxFontSizeMultiplier={1.3}>
        {plate}
      </AppText>
      <View style={styles.bolt} />
    </View>
  );
}

const styles = StyleSheet.create({
  plate: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xxs,
    borderWidth: 2,
    borderColor: colors.text,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  bolt: { width: 6, height: 6, borderRadius: radius.full, backgroundColor: colors.textMuted },
});
