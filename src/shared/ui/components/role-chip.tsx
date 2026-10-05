import { StyleSheet, View } from 'react-native';

import { colors, radius, sizes, spacing } from '../theme';
import { AppText } from './app-text';
import { Icon } from './icon';

type RoleChipProps = { label: string };

export function RoleChip({ label }: RoleChipProps) {
  return (
    <View style={styles.chip}>
      <Icon name="shield-check-outline" color={colors.primaryText} size={sizes.iconSm} />
      <AppText variant="caption" color={colors.primaryText}>
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
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryTint,
  },
});
