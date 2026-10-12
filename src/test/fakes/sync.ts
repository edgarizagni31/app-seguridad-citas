import type { AttentionItem, SyncService, SyncSnapshot } from '@/shared/domain';

export function createFakeSync(snapshot: SyncSnapshot = { pending: 0, failed: 0, attention: 0 }) {
  let attention: AttentionItem[] = [];
  return {
    requestSync: jest.fn(async () => undefined),
    retryFailed: jest.fn(async () => undefined),
    snapshot: jest.fn(async () => snapshot),
    listAttention: jest.fn(async () => attention),
    dismissAttention: jest.fn(async (id: string) => {
      attention = attention.filter((item) => item.id !== id);
    }),
    setAttention(items: AttentionItem[]) {
      attention = items;
    },
  } satisfies SyncService & Record<string, unknown>;
}
