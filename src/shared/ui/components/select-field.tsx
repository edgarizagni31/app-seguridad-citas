import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, sizes, spacing } from '../theme';
import { AppText } from './app-text';
import { BottomSheet } from './bottom-sheet';
import { Icon } from './icon';

type SelectOption<T extends string> = { readonly value: T; readonly label: string };

type SelectFieldProps<T extends string> = {
  label: string;
  placeholder: string;
  closeLabel: string;
  options: readonly SelectOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  error?: string;
};

export function SelectField<T extends string>({
  label,
  placeholder,
  closeLabel,
  options,
  value,
  onChange,
  error,
}: SelectFieldProps<T>) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  const choose = (next: T) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <View style={styles.container}>
      <AppText variant="label">{label}</AppText>
      <Pressable
        role="combobox"
        aria-label={label}
        aria-expanded={open}
        aria-invalid={Boolean(error)}
        onPress={() => setOpen(true)}
        style={[styles.field, error ? styles.fieldError : null]}
      >
        <AppText color={selected ? colors.text : colors.textMuted} style={styles.value}>
          {selected?.label ?? placeholder}
        </AppText>
        <Icon name="chevron-down" color={colors.textMuted} />
      </Pressable>
      {error && (
        <View style={styles.errorRow}>
          <Icon name="alert-circle" color={colors.danger} size={sizes.iconSm} />
          <AppText variant="caption" color={colors.danger}>
            {error}
          </AppText>
        </View>
      )}
      <BottomSheet visible={open} onClose={() => setOpen(false)} closeLabel={closeLabel}>
        <AppText variant="heading" role="heading">
          {label.replace(/\s*\*$/, '')}
        </AppText>
        <View role="radiogroup" aria-label={label}>
          {options.map((option) => {
            const checked = option.value === value;
            return (
              <Pressable
                key={option.value}
                role="radio"
                aria-label={option.label}
                aria-checked={checked}
                onPress={() => choose(option.value)}
                style={({ pressed }) => [styles.option, pressed && styles.pressed]}
              >
                <AppText variant={checked ? 'bodyStrong' : 'body'} style={styles.value}>
                  {option.label}
                </AppText>
                <Icon
                  name={checked ? 'radiobox-marked' : 'radiobox-blank'}
                  color={checked ? colors.primary : colors.textMuted}
                />
              </Pressable>
            );
          })}
        </View>
      </BottomSheet>
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
  value: { flex: 1 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  option: {
    minHeight: sizes.touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  pressed: { opacity: 0.7 },
});
