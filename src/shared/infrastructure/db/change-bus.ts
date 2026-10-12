import type { ChangeFeed, ChangeListener } from '@/shared/domain';

export type ChangeBus = ChangeFeed & { emit(tables: readonly string[]): void };

export function createChangeBus(): ChangeBus {
  const listeners = new Set<{ tables: ReadonlySet<string>; listener: ChangeListener }>();

  return {
    subscribe(tables, listener) {
      const entry = { tables: new Set(tables), listener };
      listeners.add(entry);
      return () => listeners.delete(entry);
    },
    emit(tables) {
      for (const entry of [...listeners]) {
        if (tables.some((table) => entry.tables.has(table))) entry.listener();
      }
    },
  };
}
