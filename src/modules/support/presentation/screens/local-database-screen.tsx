import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { useLocalDatabase } from '../view-models/use-local-database';
import { STRINGS } from '@/shared/lib';
import {
  AppText,
  Banner,
  Button,
  colors,
  Icon,
  IconButton,
  radius,
  Screen,
  sizes,
  spacing,
} from '@/shared/ui';

const { database: TEXT } = STRINGS.support;

export function LocalDatabaseScreen() {
  const router = useRouter();
  const vm = useLocalDatabase();

  return (
    <Screen>
      <View style={styles.bar}>
        <IconButton icon="arrow-left" label={STRINGS.common.back} onPress={() => router.back()} />
        <AppText variant="bodyStrong" role="heading" style={styles.flex}>
          {TEXT.title}
        </AppText>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={vm.refreshing} onRefresh={vm.refresh} />}
      >
        <AppText color={colors.textMuted}>{TEXT.subtitle}</AppText>
        {vm.state.type === 'loading' && <ActivityIndicator color={colors.primary} />}
        {vm.state.type === 'error' && (
          <>
            <Banner tone="error" message={TEXT.loadFailed} />
            <Button label={TEXT.retry} icon="refresh" variant="outline" onPress={vm.retry} />
          </>
        )}
        {vm.state.type === 'ready' &&
          vm.state.tables.map((table) => (
            <Pressable
              key={table.name}
              role="button"
              aria-label={`${table.name}, ${TEXT.rows(table.rows)}`}
              onPress={() => vm.openTable(table.name)}
              style={({ pressed }) => [styles.table, pressed && styles.pressed]}
            >
              <Icon name="table" color={colors.primaryText} size={sizes.icon} />
              <View style={styles.flex}>
                <AppText variant="bodyStrong">{table.name}</AppText>
                <AppText variant="caption" color={colors.textMuted}>
                  {TEXT.rows(table.rows)}
                </AppText>
              </View>
              <Icon name="chevron-right" color={colors.textMuted} size={sizes.icon} />
            </Pressable>
          ))}
      </ScrollView>
    </Screen>
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
  content: { padding: spacing.md, gap: spacing.sm },
  table: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: sizes.button,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pressed: { opacity: 0.7 },
});
