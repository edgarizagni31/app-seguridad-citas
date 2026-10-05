import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, sizes, spacing } from '../theme';
import { AppText } from './app-text';
import { Icon, type IconName } from './icon';

type ButtonVariant = 'primary' | 'outline' | 'text';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: 'md' | 'lg';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
};

const PALETTE: Record<ButtonVariant, { background: string; pressed: string; text: string }> = {
  primary: { background: colors.primary, pressed: colors.primaryPressed, text: colors.textOnDark },
  outline: { background: colors.surface, pressed: colors.primaryTint, text: colors.primaryText },
  text: { background: 'transparent', pressed: colors.primaryTint, text: colors.primaryText },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  disabled = false,
  accessibilityHint,
}: ButtonProps) {
  const palette = PALETTE[variant];
  const inactive = disabled || loading;

  return (
    <Pressable
      role="button"
      aria-label={label}
      aria-disabled={inactive}
      aria-busy={loading}
      accessibilityHint={accessibilityHint}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { minHeight: size === 'lg' ? sizes.cta : sizes.button },
        variant === 'outline' && styles.outline,
        { backgroundColor: pressed ? palette.pressed : palette.background },
        inactive && styles.inactive,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.text} />
      ) : (
        <View style={styles.content}>
          {icon && <Icon name={icon} color={palette.text} size={size === 'lg' ? 28 : sizes.icon} />}
          <AppText variant="button" color={palette.text}>
            {label}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  outline: { borderWidth: 1.5, borderColor: colors.primary },
  inactive: { opacity: 0.6 },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
