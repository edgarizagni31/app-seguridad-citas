import {
  err,
  type AttentionItem,
  type Clock,
  type Logger,
  type OutboxHandler,
  type OutboxItem,
  type QueuedItem,
  type Result,
  type SendFailure,
  type SendOutcome,
} from '@/shared/domain';

import type { ChangeBus } from '../db';
import { backoffDelayMs } from './backoff';
import type { OutboxStore } from './outbox';
import { SYNC_TABLES } from './sync-migrations';

export type SyncEngineDeps = {
  readonly store: OutboxStore;
  readonly handlers: readonly OutboxHandler[];
  readonly clock: Clock;
  readonly logger: Logger;
  readonly changes: ChangeBus;
  readonly isOnline: () => Promise<boolean>;
  readonly createId: () => string;
  readonly onAttention?: (item: AttentionItem) => void;
  readonly maxAttempts?: number;
  readonly random?: () => number;
};

const DEFAULT_MAX_ATTEMPTS = 10;

export function createSyncEngine(deps: SyncEngineDeps) {
  const handlers = new Map(deps.handlers.map((handler) => [handler.kind, handler]));
  const maxAttempts = deps.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  let running: Promise<void> | null = null;
  let rerun = false;

  async function send(
    handler: OutboxHandler,
    item: OutboxItem,
  ): Promise<Result<SendOutcome, SendFailure>> {
    try {
      return await handler.send(item);
    } catch (cause) {
      return err({ type: 'retryable', cause });
    }
  }

  async function reject(
    handler: OutboxHandler,
    item: OutboxItem,
    outcome: Extract<SendOutcome, { type: 'rejected' }>,
  ) {
    await handler.onRejected?.(item, outcome);
    await deps.store.remove(item.id);
    const attention: Omit<AttentionItem, 'canResend'> = {
      id: deps.createId(),
      kind: item.kind,
      aggregateId: item.aggregateId,
      title: handler.describe(item).title,
      reason: outcome.reason,
      message: outcome.message ?? null,
      createdAt: deps.clock.now().toISOString(),
    };
    await deps.store.addAttention(attention, item.payload);
    deps.onAttention?.({ ...attention, canResend: true });
  }

  // Devuelve false cuando hay que detenerse para no romper el orden FIFO
  async function process(item: OutboxItem): Promise<boolean> {
    const handler = handlers.get(item.kind);
    if (!handler) {
      await deps.store.markFailed(item.id, `Sin handler para ${item.kind}`);
      return true;
    }
    await deps.store.markInFlight(item.id);
    const result = await send(handler, item);
    if (result.ok) {
      const outcome = result.value;
      if (outcome.type === 'done') await deps.store.remove(item.id);
      else await reject(handler, item, outcome);
      return true;
    }
    const attempts = item.attempts + 1;
    const { cause } = result.error;
    const error =
      cause instanceof Error ? cause.message : typeof cause === 'string' ? cause : 'retryable';
    if (attempts >= maxAttempts) {
      await deps.store.markFailed(item.id, error);
    } else {
      const next = new Date(deps.clock.now().getTime() + backoffDelayMs(attempts, deps.random));
      await deps.store.reschedule(item.id, attempts, next, error);
    }
    deps.logger.warn('Sincronización pospuesta', { kind: item.kind, attempts });
    return false;
  }

  async function drain() {
    if (!(await deps.isOnline())) return;
    for (;;) {
      const item = await deps.store.nextDue(deps.clock.now());
      if (!item) return;
      const keepGoing = await process(item);
      deps.changes.emit(SYNC_TABLES);
      if (!keepGoing) return;
    }
  }

  function requestSync(): Promise<void> {
    if (running) {
      rerun = true;
      return running;
    }
    running = (async () => {
      do {
        rerun = false;
        await drain();
      } while (rerun);
    })()
      .catch((error: unknown) => deps.logger.error('Falló la sincronización', { error }))
      .finally(() => {
        running = null;
      });
    return running;
  }

  const titleOf = (item: OutboxItem) => handlers.get(item.kind)?.describe(item).title ?? item.kind;

  async function forceAndSync(id?: string) {
    await deps.store.forceDue(deps.clock.now(), id);
    deps.changes.emit(SYNC_TABLES);
    return requestSync();
  }

  return {
    async start() {
      await deps.store.recoverInFlight();
    },
    requestSync,
    async retryFailed() {
      await deps.store.retryFailed(deps.clock.now());
      deps.changes.emit(SYNC_TABLES);
      return requestSync();
    },
    snapshot: () => deps.store.snapshot(),
    listAttention: () => deps.store.listAttention(),
    async dismissAttention(id: string) {
      await deps.store.dismissAttention(id);
      deps.changes.emit(SYNC_TABLES);
    },
    async listQueue(): Promise<QueuedItem[]> {
      const items = await deps.store.listQueue();
      return items.map((item) => ({
        id: item.id,
        kind: item.kind,
        aggregateId: item.aggregateId,
        title: titleOf(item),
        status: item.status,
        attempts: item.attempts,
        lastError: item.lastError,
        createdAt: item.createdAt,
      }));
    },
    syncNow: () => forceAndSync(),
    syncItem: (id: string) => forceAndSync(id),
    async resendAttention(id: string) {
      const requeued = await deps.store.requeueAttention(id, deps.createId(), deps.clock.now());
      if (!requeued) return;
      await handlers.get(requeued.kind)?.onRequeued?.(requeued.aggregateId);
      deps.changes.emit(SYNC_TABLES);
      return requestSync();
    },
  };
}

export type SyncEngine = ReturnType<typeof createSyncEngine>;
