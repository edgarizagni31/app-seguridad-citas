import { Pressable, StyleSheet, View } from 'react-native';

import { STRINGS } from '@/shared/lib';
import { AppText, colors, Icon, radius, sizes, spacing } from '@/shared/ui';

const { inspection: TEXT } = STRINGS;

type YesNoOptionsProps = {
  label: string;
  value: boolean | null;
  disabled: boolean;
  onChoose: (value: boolean) => void;
};

// Opciones tipo radio de ancho completo; la elegida va rellena en verde con check (RF-G1c)
export function YesNoOptions({ label, value, disabled, onChoose }: YesNoOptionsProps) {
  const options = [
    { value: true, label: TEXT.yes },
    { value: false, label: TEXT.no },
  ];
  return (
    <View role="radiogroup" aria-label={label} style={styles.group}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.label}
            role="radio"
            aria-label={option.label}
            aria-checked={selected}
            aria-disabled={disabled}
            disabled={disabled}
            onPress={() => onChoose(option.value)}
            style={({ pressed }) => [
              styles.option,
              selected && styles.selected,
              pressed && styles.pressed,
            ]}
          >
            <Icon
              name={selected ? 'check-circle' : 'radiobox-blank'}
              color={selected ? colors.textOnDark : colors.textMuted}
            />
            <AppText variant="bodyStrong" color={selected ? colors.textOnDark : colors.text}>
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  option: {
    minHeight: sizes.button,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  selected: { backgroundColor: colors.primary, borderColor: colors.primary },
  pressed: { opacity: 0.8 },
});
