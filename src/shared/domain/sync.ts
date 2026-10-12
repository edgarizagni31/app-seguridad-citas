import type { Result } from './result';

// Tablas que avisan cuando cambia el estado de sincronización
export const SYNC_TABLES = ['outbox', 'attention_items'] as const;

export type OutboxStatus = 'pending' | 'in_flight' | 'failed';

export type OutboxItem = {
  readonly id: string;
  readonly kind: string;
  readonly aggregateId: string;
  readonly payload: unknown;
  readonly attempts: number;
  readonly createdAt: string;
};

export type SendOutcome =
  | { readonly type: 'done' }
  | { readonly type: 'rejected'; readonly reason: string; readonly message?: string };

export type SendFailure = { readonly type: 'retryable'; readonly cause?: unknown };

export interface OutboxHandler {
  readonly kind: string;
  send(item: OutboxItem): Promise<Result<SendOutcome, SendFailure>>;
  describe(item: OutboxItem): { readonly title: string };
  onRejected?(item: OutboxItem, outcome: Extract<SendOutcome, { type: 'rejected' }>): Promise<void>;
}

export type AttentionItem = {
  readonly id: string;
  readonly kind: string;
  readonly aggregateId: string;
  readonly title: string;
  readonly reason: string;
  readonly message: string | null;
  readonly createdAt: string;
};

export type SyncSnapshot = {
  readonly pending: number;
  readonly failed: number;
  readonly attention: number;
};

export interface SyncService {
  requestSync(): Promise<void>;
  retryFailed(): Promise<void>;
  snapshot(): Promise<SyncSnapshot>;
  listAttention(): Promise<AttentionItem[]>;
  dismissAttention(id: string): Promise<void>;
}
