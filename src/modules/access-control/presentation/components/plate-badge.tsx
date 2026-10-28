import { StyleSheet, View } from 'react-native';

import { STRINGS } from '@/shared/lib';
import { AppText, colors, fontFamilies, radius, spacing } from '@/shared/ui';

type PlateBadgeProps = { plate: string; size?: 'md' | 'lg' };

// Placa compacta con el borde amarillo de la placa real
export function PlateBadge({ plate, size = 'md' }: PlateBadgeProps) {
  return (
    <View style={styles.plate} aria-label={STRINGS.gate.plate(plate)}>
      <AppText style={size === 'lg' ? styles.large : styles.medium}>{plate}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  plate: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.plateBorder,
    backgroundColor: colors.surface,
  },
  medium: { fontFamily: fontFamilies.bold, fontSize: 18, lineHeight: 24, letterSpacing: 1 },
  large: { fontFamily: fontFamilies.bold, fontSize: 24, lineHeight: 30, letterSpacing: 1.5 },
});
