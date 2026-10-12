import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, sizes, spacing } from '../theme';
import { AppText } from './app-text';

export type SegmentOption<T extends string> = {
  readonly value: T;
  readonly label: string;
  // Color de fondo cuando está elegida (por defecto el verde de marca)
  readonly selectedColor?: string;
  readonly disabled?: boolean;
};

type SegmentedControlProps<T extends string> = {
  label: string;
  options: readonly SegmentOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  size?: 'md' | 'sm';
};

export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  size = 'md',
}: SegmentedControlProps<T>) {
  return (
    <View role="radiogroup" aria-label={label} style={styles.row}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            role="radio"
            aria-label={option.label}
            aria-checked={selected}
            aria-disabled={option.disabled}
            disabled={option.disabled}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.segment,
              size === 'sm' && styles.small,
              selected && { backgroundColor: option.selectedColor ?? colors.primary },
              option.disabled && !selected && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            <AppText variant="label" color={selected ? colors.textOnDark : colors.text}>
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.xs },
  segment: {
    flex: 1,
    minHeight: sizes.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.border,
  },
  small: { minHeight: 40 },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.75 },
});
