import { useState } from 'react';
import { Alert } from 'react-native';

import { useDependencies } from '@/core/di';
import { SYNC_TABLES } from '@/shared/domain';
import { formatDate, formatTime, STRINGS } from '@/shared/lib';
import { useLiveData, useOnlineStatus } from '@/shared/ui';

const { support: TEXT } = STRINGS;

export function useSupportViewModel() {
  const { sync, changes, connectivity, config, logger } = useDependencies();
  const queue = useLiveData(() => sync.listQueue(), changes, SYNC_TABLES);
  const rejected = useLiveData(() => sync.listAttention(), changes, SYNC_TABLES);
  const online = useOnlineStatus(connectivity);
  const [syncing, setSyncing] = useState(false);
  const [failed, setFailed] = useState(false);

  const run = async (action: () => Promise<void>, what: string) => {
    setFailed(false);
    try {
      await action();
    } catch (error) {
      logger.error(what, { error: String(error) });
      setFailed(true);
    }
  };

  const savedAt = (iso: string) => {
    const date = new Date(iso);
    return TEXT.savedAt(formatDate(date, config.timeZone), formatTime(date, config.timeZone));
  };

  const confirm = (
    title: string,
    message: string,
    action: { label: string; destructive?: boolean },
    onConfirm: () => void,
  ) =>
    Alert.alert(title, message, [
      { text: TEXT.cancel, style: 'cancel' },
      {
        text: action.label,
        style: action.destructive ? 'destructive' : 'default',
        onPress: onConfirm,
      },
    ]);

  const queued = queue.data ?? [];
  const attention = rejected.data ?? [];

  return {
    loading: queue.data === undefined || rejected.data === undefined,
    offline: online === false,
    syncing,
    failed,
    counts: {
      queued: queued.filter((item) => item.status !== 'failed').length,
      failed: queued.filter((item) => item.status === 'failed').length,
      rejected: attention.length,
    },
    queue: queued.map((item) => ({
      id: item.id,
      title: item.title,
      status: item.status,
      statusLabel: TEXT.status[item.status],
      attempts: TEXT.attempts(item.attempts),
      savedAt: savedAt(item.createdAt),
      lastError: item.lastError,
    })),
    rejected: attention.map((item) => ({
      id: item.id,
      title: item.title,
      savedAt: savedAt(item.createdAt),
      reason: item.message ?? item.reason,
      canResend: item.canResend,
    })),
    syncAll: () => {
      setSyncing(true);
      void run(() => sync.syncNow(), 'No se pudo sincronizar').finally(() => setSyncing(false));
    },
    syncItem: (id: string) => void run(() => sync.syncItem(id), 'No se pudo sincronizar'),
    resend: (id: string) =>
      confirm(
        TEXT.resendTitle,
        TEXT.resendMessage,
        { label: TEXT.resend },
        () => void run(() => sync.resendAttention(id), 'No se pudo reenviar'),
      ),
    dismiss: (id: string) =>
      confirm(
        TEXT.dismissTitle,
        TEXT.dismissMessage,
        { label: TEXT.dismiss, destructive: true },
        () => void run(() => sync.dismissAttention(id), 'No se pudo descartar'),
      ),
  };
}
