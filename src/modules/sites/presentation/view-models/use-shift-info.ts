import { useState } from 'react';

import { useDependencies } from '@/core/di';
import { SHIFT_TABLES } from '@/shared/domain';
import { minutesBetween } from '@/shared/lib';
import { useLiveData } from '@/shared/ui';

export function useShiftInfo() {
  const { sites, changes, clock, logger } = useDependencies();
  const { data } = useLiveData(() => sites.shiftStatus(), changes, SHIFT_TABLES);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshFailed, setRefreshFailed] = useState(false);
  const ready = data?.ok && data.value.type === 'ready' ? data.value : null;

  const refresh = async () => {
    if (!ready || refreshing) return;
    setRefreshing(true);
    setRefreshFailed(false);
    const result = await sites.startShift(ready.site);
    setRefreshing(false);
    if (result.ok) return;
    if (result.error.type !== 'network') {
      logger.error('No se pudo actualizar el paquete', { error: result.error.type });
    }
    setRefreshFailed(true);
  };

  return {
    site: ready?.site ?? null,
    minutesSinceUpdate: ready
      ? minutesBetween(new Date(ready.snapshot.generatedAt), clock.now())
      : null,
    refreshing,
    refreshFailed,
    refresh: () => void refresh(),
    changeSite: () => void sites.changeSite(),
  };
}
