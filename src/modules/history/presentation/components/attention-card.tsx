import { Pressable, StyleSheet, View } from 'react-native';

import { STRINGS } from '@/shared/lib';
import { AppText, colors, Icon, radius, spacing } from '@/shared/ui';

const { history: TEXT } = STRINGS;

type AttentionCardProps = { count: number; onOpen: () => void };

// Resumen en el historial; el detalle y las acciones están en la bandeja
export function AttentionCard({ count, onOpen }: AttentionCardProps) {
  return (
    <Pressable
      role="button"
      aria-label={STRINGS.attention.open}
      onPress={onOpen}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <Icon name="alert-octagon" color={colors.danger} />
      <View style={styles.flex}>
        <AppText variant="bodyStrong" color={colors.danger}>
          {TEXT.attentionTitle}
        </AppText>
        <AppText variant="caption">{TEXT.attentionCount(count)}</AppText>
      </View>
      <Icon name="chevron-right" color={colors.danger} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    marginTop: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: colors.dangerTint,
  },
  pressed: { opacity: 0.75 },
});
