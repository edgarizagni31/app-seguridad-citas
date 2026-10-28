import { Pressable, StyleSheet, View } from 'react-native';

import { colors, sizes, spacing } from '../theme';
import { AppText } from './app-text';

export type TabOption<T extends string> = { readonly value: T; readonly label: string };

type TabsProps<T extends string> = {
  options: readonly TabOption<T>[];
  value: T;
  onChange: (value: T) => void;
};

// Pestañas con subrayado: separan vistas de un mismo contenido (no son una elección de valor)
export function Tabs<T extends string>({ options, value, onChange }: TabsProps<T>) {
  return (
    <View role="tablist" style={styles.row}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            role="tab"
            aria-label={option.label}
            aria-selected={selected}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
          >
            <AppText variant="label" color={selected ? colors.primaryText : colors.textMuted}>
              {option.label}
            </AppText>
            <View style={[styles.indicator, selected && styles.indicatorOn]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: {
    flex: 1,
    minHeight: sizes.touchTarget,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
  indicator: { alignSelf: 'stretch', height: 3, borderRadius: 2 },
  indicatorOn: { backgroundColor: colors.primary },
  pressed: { opacity: 0.7 },
});
