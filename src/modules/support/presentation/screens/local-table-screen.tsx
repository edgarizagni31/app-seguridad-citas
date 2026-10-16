import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { useLocalTable } from '../view-models/use-local-table';
import { STRINGS } from '@/shared/lib';
import {
  AppText,
  Banner,
  Button,
  Card,
  colors,
  EmptyState,
  fontFamilies,
  IconButton,
  Screen,
  spacing,
} from '@/shared/ui';

const { database: TEXT } = STRINGS.support;
const COLLAPSED_LINES = 3;

export function LocalTableScreen() {
  const router = useRouter();
  const vm = useLocalTable();

  return (
    <Screen>
      <View style={styles.bar}>
        <IconButton icon="arrow-left" label={STRINGS.common.back} onPress={() => router.back()} />
        <AppText variant="bodyStrong" role="heading" style={styles.flex}>
          {vm.name}
        </AppText>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {vm.state.type === 'loading' && <ActivityIndicator color={colors.primary} />}
        {vm.state.type === 'missing' && <Banner tone="warning" message={TEXT.missing} />}
        {vm.state.type === 'error' && (
          <>
            <Banner tone="error" message={TEXT.loadFailed} />
            <Button label={TEXT.retry} icon="refresh" variant="outline" onPress={vm.retry} />
          </>
        )}
        {vm.state.type === 'ready' && vm.total === 0 && (
          <EmptyState icon="table-off" title={vm.name} message={TEXT.emptyTable} />
        )}
        {vm.state.type === 'ready' && vm.total > 0 && (
          <AppText variant="caption" color={colors.textMuted}>
            {TEXT.showing(vm.shown, vm.total)}
          </AppText>
        )}
        {vm.rows.map((cells, index) => (
          <RowCard key={index} index={index + 1} cells={cells} />
        ))}
        {vm.hasMore && (
          <Button
            label={TEXT.loadMore}
            icon="chevron-down"
            variant="outline"
            onPress={vm.loadMore}
          />
        )}
      </ScrollView>
    </Screen>
  );
}

type RowCardProps = {
  index: number;
  cells: readonly { readonly column: string; readonly text: string }[];
};

function RowCard({ index, cells }: RowCardProps) {
  const [expanded, setExpanded] = useState(false);
  const long = cells.some((cell) => cell.text.includes('\n') || cell.text.length > 120);

  return (
    <Card>
      <AppText variant="label">{TEXT.row(index)}</AppText>
      {cells.map((cell) => (
        <View key={cell.column}>
          <AppText variant="caption" color={colors.textMuted}>
            {cell.column}
          </AppText>
          <AppText
            selectable
            numberOfLines={expanded ? undefined : COLLAPSED_LINES}
            style={styles.value}
          >
            {cell.text}
          </AppText>
        </View>
      ))}
      {long && (
        <Button
          label={expanded ? TEXT.collapse : TEXT.expand}
          variant="text"
          onPress={() => setExpanded((current) => !current)}
        />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  content: { padding: spacing.md, gap: spacing.md },
  value: { fontFamily: fontFamilies.mono, fontSize: 13, lineHeight: 18 },
});
