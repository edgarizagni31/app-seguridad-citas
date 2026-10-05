import { StyleSheet, View } from 'react-native';

import { colors, radius, sizes } from '../theme';
import { AppText } from './app-text';

export const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');

type AvatarProps = { name: string };

export function Avatar({ name }: AvatarProps) {
  return (
    <View style={styles.circle} aria-hidden>
      <AppText variant="bodyStrong" color={colors.textOnDark}>
        {initialsOf(name)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    width: sizes.avatar,
    height: sizes.avatar,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
