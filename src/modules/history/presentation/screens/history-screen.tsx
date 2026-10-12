import { FlashList } from '@shopify/flash-list';
import { StyleSheet, View } from 'react-native';

import { AttentionCard } from '../components/attention-card';
import { HistoryRowItem } from '../components/history-row';
import { useHistoryViewModel } from '../view-models/use-history-view-model';
import { STRINGS } from '@/shared/lib';
import { AppText, colors, EmptyState, Screen, spacing } from '@/shared/ui';

const { history: TEXT } = STRINGS;

export function HistoryScreen() {
  const vm = useHistoryViewModel();

  return (
    <Screen edges={[]}>
      <FlashList
        data={vm.rows}
        keyExtractor={(row) => row.id}
        renderItem={({ item }) => <HistoryRowItem row={item} />}
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={Separator}
        ListHeaderComponent={
          <View style={styles.header}>
            <AppText variant="title" role="heading">
              {TEXT.title}
            </AppText>
            <AppText color={colors.textMuted}>{TEXT.subtitle}</AppText>
            {vm.attention.length > 0 && (
              <AttentionCard count={vm.attention.length} onOpen={vm.openAttention} />
            )}
          </View>
        }
        ListEmptyComponent={
          vm.loading ? null : (
            <View style={styles.empty}>
              <EmptyState icon="history" title={TEXT.emptyTitle} message={TEXT.emptyMessage} />
            </View>
          )
        }
      />
    </Screen>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  content: { padding: spacing.md },
  header: { gap: spacing.xs, marginBottom: spacing.md },
  empty: { paddingVertical: spacing.xl },
  separator: { height: spacing.sm },
});
