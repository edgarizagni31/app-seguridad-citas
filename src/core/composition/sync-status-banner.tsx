import { StyleSheet, View } from 'react-native';

import { useDependencies } from '@/core/di';
import { spacing, SyncBanner, useLiveData, useOnlineStatus } from '@/shared/ui';

const SYNC_TABLES = ['outbox', 'attention_items'];

export function SyncStatusBanner() {
  const { connectivity, changes, sync } = useDependencies();
  const online = useOnlineStatus(connectivity);
  const { data } = useLiveData(() => sync.snapshot(), changes, SYNC_TABLES);
  const pending = data?.pending ?? 0;

  if (online !== false && pending === 0) return null;
  return (
    <View style={styles.container}>
      <SyncBanner online={online} pending={pending} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: spacing.md, paddingTop: spacing.xs },
});
