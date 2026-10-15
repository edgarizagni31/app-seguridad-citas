import type { AttentionItem, QueuedItem, SyncService, SyncSnapshot } from '@/shared/domain';

export function createFakeSync(snapshot: SyncSnapshot = { pending: 0, failed: 0, attention: 0 }) {
  let attention: AttentionItem[] = [];
  let queue: QueuedItem[] = [];
  return {
    requestSync: jest.fn(async () => undefined),
    retryFailed: jest.fn(async () => undefined),
    snapshot: jest.fn(async () => snapshot),
    listAttention: jest.fn(async () => attention),
    dismissAttention: jest.fn(async (id: string) => {
      attention = attention.filter((item) => item.id !== id);
    }),
    listQueue: jest.fn(async () => queue),
    syncNow: jest.fn(async () => undefined),
    syncItem: jest.fn(async (_id: string) => undefined),
    resendAttention: jest.fn(async (_id: string) => undefined),
    setAttention(items: AttentionItem[]) {
      attention = items;
    },
    setQueue(items: QueuedItem[]) {
      queue = items;
    },
  } satisfies SyncService & Record<string, unknown>;
}
