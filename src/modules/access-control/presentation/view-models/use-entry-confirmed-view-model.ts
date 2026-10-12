import { useRouter } from 'expo-router';

import { resetEntryFlow, useEntryFlowStore } from '../stores/entry-flow-store';
import { useDependencies } from '@/core/di';
import { SYNC_TABLES } from '@/shared/domain';
import { formatTime } from '@/shared/lib';
import { useLiveData } from '@/shared/ui';

export function useEntryConfirmedViewModel() {
  const router = useRouter();
  const { config, sync, changes } = useDependencies();
  const record = useEntryFlowStore((state) => state.record);
  const { data: syncState } = useLiveData(() => sync.snapshot(), changes, SYNC_TABLES);

  // Primero los que ingresaron, como en el mockup
  const visitors = record
    ? [...record.visitors].sort(
        (a, b) => Number(b.status === 'arrived') - Number(a.status === 'arrived'),
      )
    : [];

  return {
    record,
    visitors,
    time: record ? formatTime(new Date(record.confirmedAt), config.timeZone) : '',
    pendingSync: (syncState?.pending ?? 0) > 0,
    backHome: () => {
      resetEntryFlow();
      router.dismissTo('/');
    },
    inspect: () => {
      const vehicleId = record?.vehicleId;
      resetEntryFlow();
      if (vehicleId) router.replace({ pathname: '/inspection/[vehicleId]', params: { vehicleId } });
    },
  };
}
