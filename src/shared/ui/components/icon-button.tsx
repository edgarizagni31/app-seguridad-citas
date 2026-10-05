import { Pressable, StyleSheet } from 'react-native';

import { colors, radius, sizes } from '../theme';
import { Icon, type IconName } from './icon';

type IconButtonProps = {
  icon: IconName;
  label: string;
  onPress: () => void;
  variant?: 'outline' | 'translucent';
  selected?: boolean;
};

export function IconButton({
  icon,
  label,
  onPress,
  variant = 'outline',
  selected,
}: IconButtonProps) {
  const translucent = variant === 'translucent';

  return (
    <Pressable
      role="button"
      aria-label={label}
      aria-selected={selected}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        translucent ? styles.translucent : styles.outline,
        pressed && styles.pressed,
      ]}
    >
      <Icon name={icon} color={translucent ? colors.textOnDark : colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: sizes.touchTarget,
    height: sizes.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outline: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  translucent: { borderRadius: radius.full, backgroundColor: colors.translucentDark },
  pressed: { opacity: 0.7 },
});
