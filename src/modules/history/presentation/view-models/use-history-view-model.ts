import { useRouter } from 'expo-router';

import { useDependencies } from '@/core/di';
import { SYNC_TABLES, type HistoryEntry } from '@/shared/domain';
import { formatTime } from '@/shared/lib';
import { useLiveData } from '@/shared/ui';

export type HistoryRow = HistoryEntry & { readonly time: string };

export function useHistoryViewModel() {
  const router = useRouter();
  const { history, sync, changes, config } = useDependencies();
  const entries = useLiveData(() => history.list(), changes, [...history.tables, ...SYNC_TABLES]);
  const attention = useLiveData(() => sync.listAttention(), changes, SYNC_TABLES);

  const rows: HistoryRow[] = (entries.data ?? []).map((entry) => ({
    ...entry,
    time: formatTime(new Date(entry.occurredAt), config.timeZone),
  }));

  return {
    loading: entries.data === undefined,
    rows,
    attention: attention.data ?? [],
    openAttention: () => router.push('/attention'),
  };
}
