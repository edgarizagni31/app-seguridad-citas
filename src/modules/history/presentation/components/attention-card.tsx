import { StyleSheet, View } from 'react-native';

import type { AttentionItem } from '@/shared/domain';
import { STRINGS } from '@/shared/lib';
import { AppText, Button, colors, Icon, radius, spacing } from '@/shared/ui';

const { history: TEXT } = STRINGS;

type AttentionCardProps = {
  items: readonly AttentionItem[];
  onDismiss: (id: string) => void;
};

export function AttentionCard({ items, onDismiss }: AttentionCardProps) {
  return (
    <View style={styles.card} role="alert">
      <View style={styles.header}>
        <Icon name="alert-octagon" color={colors.danger} />
        <View style={styles.flex}>
          <AppText variant="bodyStrong" color={colors.danger} role="heading">
            {TEXT.attentionTitle}
          </AppText>
          <AppText variant="caption" color={colors.text}>
            {TEXT.attentionCount(items.length)}
          </AppText>
        </View>
      </View>
      {items.map((item) => (
        <View key={item.id} style={styles.item}>
          <AppText variant="bodyStrong">{item.title}</AppText>
          <AppText variant="caption" color={colors.textMuted}>
            {item.message ?? item.reason}
          </AppText>
          <Button label={TEXT.dismiss} variant="text" onPress={() => onDismiss(item.id)} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: {
    gap: spacing.sm,
    padding: spacing.md,
    marginTop: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.dangerTint,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  item: {
    gap: 2,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderStrong,
  },
});
