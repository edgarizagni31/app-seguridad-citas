import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { colors, radius, sizes, spacing, typography } from '../theme';
import { AppText } from './app-text';
import { Icon, type IconName } from './icon';

type TrailingAction = {
  icon: IconName;
  label: string;
  onPress: () => void;
};

type TextFieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  icon?: IconName;
  error?: string;
  trailingAction?: TrailingAction;
};

export function TextField({ label, icon, error, trailingAction, ...inputProps }: TextFieldProps) {
  const hasError = Boolean(error);

  return (
    <View style={styles.container}>
      <AppText variant="label">{label}</AppText>
      <View style={[styles.field, hasError && styles.fieldError]}>
        {icon && <Icon name={icon} color={colors.textMuted} />}
        <TextInput
          {...inputProps}
          aria-label={label}
          aria-invalid={hasError}
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
        {trailingAction && (
          <Pressable
            role="button"
            aria-label={trailingAction.label}
            onPress={trailingAction.onPress}
            hitSlop={spacing.xs}
            style={styles.trailing}
          >
            <Icon name={trailingAction.icon} color={colors.textMuted} />
          </Pressable>
        )}
      </View>
      {hasError && (
        <View style={styles.errorRow}>
          <Icon name="alert-circle" color={colors.danger} size={sizes.iconSm} />
          <AppText variant="caption" color={colors.danger}>
            {error}
          </AppText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  field: {
    minHeight: sizes.input,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.inputBackground,
  },
  fieldError: { borderColor: colors.danger, backgroundColor: colors.dangerTint },
  input: { flex: 1, ...typography.body, color: colors.text, paddingVertical: spacing.sm },
  trailing: {
    minWidth: sizes.touchTarget,
    minHeight: sizes.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
});
