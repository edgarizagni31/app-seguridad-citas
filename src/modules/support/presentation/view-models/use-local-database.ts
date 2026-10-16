import { useRouter } from 'expo-router';
import { useEffect, useEffectEvent, useState } from 'react';

import { useDependencies } from '@/core/di';
import type { LocalTable } from '@/shared/domain';

type DatabaseState =
  | { readonly type: 'loading' }
  | { readonly type: 'ready'; readonly tables: readonly LocalTable[] }
  | { readonly type: 'error' };

export function useLocalDatabase() {
  const { localData, logger } = useDependencies();
  const router = useRouter();
  const [state, setState] = useState<DatabaseState>({ type: 'loading' });
  const [refreshing, setRefreshing] = useState(false);

  const load = () =>
    localData.listTables().then(
      (tables) => setState({ type: 'ready', tables }),
      (error: unknown) => {
        logger.error('No se pudo leer la base local', { error: String(error) });
        setState({ type: 'error' });
      },
    );
  const loadOnMount = useEffectEvent(load);

  useEffect(() => {
    void loadOnMount();
  }, [localData]);

  return {
    state,
    refreshing,
    refresh: () => {
      setRefreshing(true);
      void load().finally(() => setRefreshing(false));
    },
    retry: () => {
      setState({ type: 'loading' });
      void load();
    },
    openTable: (name: string) =>
      router.push({ pathname: '/support/table/[name]', params: { name } }),
  };
}
