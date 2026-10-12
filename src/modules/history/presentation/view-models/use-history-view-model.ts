import { useDependencies } from '@/core/di';
import { SYNC_TABLES, type HistoryEntry } from '@/shared/domain';
import { formatTime } from '@/shared/lib';
import { useLiveData } from '@/shared/ui';

export type HistoryRow = HistoryEntry & { readonly time: string };

export function useHistoryViewModel() {
  const { history, sync, changes, config, logger } = useDependencies();
  const entries = useLiveData(() => history.list(), changes, [...history.tables, ...SYNC_TABLES]);
  const attention = useLiveData(() => sync.listAttention(), changes, SYNC_TABLES);

  const rows: HistoryRow[] = (entries.data ?? []).map((entry) => ({
    ...entry,
    time: formatTime(new Date(entry.occurredAt), config.timeZone),
  }));

  const dismiss = async (id: string) => {
    try {
      await sync.dismissAttention(id);
    } catch (error) {
      logger.error('No se pudo descartar el aviso', { error: String(error) });
    }
  };

  return {
    loading: entries.data === undefined,
    rows,
    attention: attention.data ?? [],
    dismiss: (id: string) => void dismiss(id),
  };
}
