import { useEffect, useEffectEvent, useState } from 'react';

import type { ChangeFeed } from '@/shared/domain';

type LiveData<T> = { readonly data: T | undefined; readonly error: unknown };

// Carga datos locales y los recarga cuando cambian las tablas indicadas
export function useLiveData<T>(
  load: () => Promise<T>,
  feed: ChangeFeed,
  tables: readonly string[],
): LiveData<T> {
  const [state, setState] = useState<LiveData<T>>({ data: undefined, error: null });
  const loadLatest = useEffectEvent(load);
  const tablesKey = tables.join('|');

  useEffect(() => {
    let active = true;
    const refresh = () => {
      loadLatest().then(
        (data) => active && setState({ data, error: null }),
        (error: unknown) => active && setState((previous) => ({ ...previous, error })),
      );
    };
    refresh();
    const unsubscribe = feed.subscribe(tablesKey.split('|'), refresh);
    return () => {
      active = false;
      unsubscribe();
    };
  }, [feed, tablesKey]);

  return state;
}
