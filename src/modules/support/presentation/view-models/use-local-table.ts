import { useLocalSearchParams } from 'expo-router';
import { useEffect, useEffectEvent, useState } from 'react';

import { useDependencies } from '@/core/di';
import type { LocalCell, LocalTablePage } from '@/shared/domain';

export const PAGE_SIZE = 50;

type TableState =
  | { readonly type: 'loading' }
  | { readonly type: 'ready'; readonly page: LocalTablePage }
  | { readonly type: 'missing' }
  | { readonly type: 'error' };

// Los JSON guardados (respuestas, envíos) se muestran indentados para poder leerlos
export function cellText(value: LocalCell): string {
  if (value === null) return 'NULL';
  if (typeof value === 'number') return String(value);
  const trimmed = value.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return value;
  try {
    return JSON.stringify(JSON.parse(trimmed), null, 2);
  } catch {
    return value;
  }
}

export function useLocalTable() {
  const { localData, changes, logger } = useDependencies();
  const { name } = useLocalSearchParams<{ name: string }>();
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [state, setState] = useState<TableState>({ type: 'loading' });

  const show = useEffectEvent((page: LocalTablePage | null) =>
    setState(page ? { type: 'ready', page } : { type: 'missing' }),
  );
  const fail = useEffectEvent((error: unknown) => {
    logger.error('No se pudo leer la tabla local', { error: String(error) });
    setState({ type: 'error' });
  });

  useEffect(() => {
    let active = true;
    const load = () => {
      localData.readTable(name, { limit, offset: 0 }).then(
        (page) => active && show(page),
        (error: unknown) => active && fail(error),
      );
    };
    load();
    // Se refresca sola cuando la app escribe en esta tabla
    const unsubscribe = changes.subscribe([name], load);
    return () => {
      active = false;
      unsubscribe();
    };
  }, [localData, changes, name, limit]);

  const page = state.type === 'ready' ? state.page : null;

  return {
    name,
    state,
    columns: page?.columns ?? [],
    rows: (page?.rows ?? []).map((row) =>
      (page?.columns ?? []).map((column) => ({ column, text: cellText(row[column] ?? null) })),
    ),
    shown: page?.rows.length ?? 0,
    total: page?.total ?? 0,
    hasMore: page !== null && page.rows.length < page.total,
    loadMore: () => setLimit((current) => current + PAGE_SIZE),
    retry: () => {
      setState({ type: 'loading' });
      void localData.readTable(name, { limit, offset: 0 }).then(
        (result) => setState(result ? { type: 'ready', page: result } : { type: 'missing' }),
        () => setState({ type: 'error' }),
      );
    },
  };
}
