import { useDependencies } from '@/core/di';
import { SYNC_TABLES } from '@/shared/domain';
import { formatTime, STRINGS } from '@/shared/lib';
import { useLiveData } from '@/shared/ui';

const { attention: TEXT } = STRINGS;

export function useAttentionViewModel() {
  const { sync, changes, config, logger } = useDependencies();
  const { data } = useLiveData(() => sync.listAttention(), changes, SYNC_TABLES);

  const dismiss = async (id: string) => {
    try {
      await sync.dismissAttention(id);
    } catch (error) {
      logger.error('No se pudo descartar el aviso', { error: String(error) });
    }
  };

  return {
    loading: data === undefined,
    items: (data ?? []).map((item) => ({
      id: item.id,
      title: item.title,
      time: formatTime(new Date(item.createdAt), config.timeZone),
      message: item.message ?? item.reason,
      // Acción sugerida según el motivo del rechazo (RF-H3)
      action: TEXT.actions[item.reason] ?? TEXT.actions.default,
    })),
    dismiss: (id: string) => void dismiss(id),
  };
}
