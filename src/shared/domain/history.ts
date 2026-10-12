export type RecordSyncStatus = 'pending' | 'synced' | 'rejected';

export type HistoryEntry = {
  readonly id: string;
  readonly kind: 'entry' | 'inspection';
  readonly title: string;
  readonly subtitle: string;
  readonly occurredAt: string;
  readonly syncStatus: RecordSyncStatus;
};

// Cada módulo aporta sus registros del turno; el historial los combina
export interface HistorySource {
  readonly tables: readonly string[];
  list(): Promise<HistoryEntry[]>;
}

export function mergeHistory(sources: readonly HistorySource[]): HistorySource {
  return {
    tables: [...new Set(sources.flatMap((source) => source.tables))],
    async list() {
      const lists = await Promise.all(sources.map((source) => source.list()));
      return lists.flat().sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
    },
  };
}
