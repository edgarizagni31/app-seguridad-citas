import type { AttentionItem, OutboxItem, OutboxStatus, SyncSnapshot } from '@/shared/domain';

import type { SqlDatabase } from '../db';

type OutboxRow = {
  id: string;
  kind: string;
  aggregate_id: string;
  payload: string;
  attempts: number;
  created_at: string;
};

type QueueRow = OutboxRow & { status: OutboxStatus; last_error: string | null };

type AttentionRow = {
  id: string;
  kind: string;
  aggregate_id: string;
  title: string;
  reason: string;
  message: string | null;
  created_at: string;
  payload: string | null;
};

export type NewOutboxItem = {
  readonly id: string;
  readonly kind: string;
  readonly aggregateId: string;
  readonly payload: unknown;
};

const toItem = (row: OutboxRow): OutboxItem => ({
  id: row.id,
  kind: row.kind,
  aggregateId: row.aggregate_id,
  payload: JSON.parse(row.payload) as unknown,
  attempts: row.attempts,
  createdAt: row.created_at,
});

// Se usa dentro de la misma transacción que la escritura del agregado (Unit of Work)
export async function enqueue(tx: SqlDatabase, item: NewOutboxItem, now: Date): Promise<void> {
  const at = now.toISOString();
  await tx.run(
    `INSERT INTO outbox (id, kind, aggregate_id, payload, status, attempts, next_attempt_at, created_at)
     VALUES (?, ?, ?, ?, 'pending', 0, ?, ?)`,
    [item.id, item.kind, item.aggregateId, JSON.stringify(item.payload), at, at],
  );
}

export function createOutboxStore(db: SqlDatabase) {
  return {
    async nextDue(now: Date): Promise<OutboxItem | null> {
      // El orden se garantiza por agregado: una operación nunca adelanta a otra anterior del mismo registro
      const row = await db.first<OutboxRow>(
        `SELECT o.* FROM outbox o
         WHERE o.status = 'pending' AND o.next_attempt_at <= ?
           AND NOT EXISTS (
             SELECT 1 FROM outbox p WHERE p.aggregate_id = o.aggregate_id AND p.rowid < o.rowid
           )
         ORDER BY o.created_at, o.rowid LIMIT 1`,
        [now.toISOString()],
      );
      return row ? toItem(row) : null;
    },
    markInFlight: (id: string) =>
      db.run("UPDATE outbox SET status = 'in_flight' WHERE id = ?", [id]),
    remove: (id: string) => db.run('DELETE FROM outbox WHERE id = ?', [id]),
    reschedule: (id: string, attempts: number, nextAttemptAt: Date, error: string) =>
      db.run(
        "UPDATE outbox SET status = 'pending', attempts = ?, next_attempt_at = ?, last_error = ? WHERE id = ?",
        [attempts, nextAttemptAt.toISOString(), error, id],
      ),
    markFailed: (id: string, error: string) =>
      db.run("UPDATE outbox SET status = 'failed', last_error = ? WHERE id = ?", [error, id]),
    recoverInFlight: () =>
      db.run("UPDATE outbox SET status = 'pending' WHERE status = 'in_flight'"),
    retryFailed: (now: Date) =>
      db.run(
        "UPDATE outbox SET status = 'pending', attempts = 0, next_attempt_at = ? WHERE status = 'failed'",
        [now.toISOString()],
      ),
    async addAttention(item: Omit<AttentionItem, 'canResend'>, payload: unknown): Promise<void> {
      await db.run(
        `INSERT INTO attention_items (id, kind, aggregate_id, title, reason, message, created_at, payload)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.id,
          item.kind,
          item.aggregateId,
          item.title,
          item.reason,
          item.message,
          item.createdAt,
          JSON.stringify(payload),
        ],
      );
    },
    async listAttention(): Promise<AttentionItem[]> {
      const rows = await db.all<AttentionRow>(
        'SELECT * FROM attention_items ORDER BY created_at DESC',
      );
      return rows.map((row) => ({
        id: row.id,
        kind: row.kind,
        aggregateId: row.aggregate_id,
        title: row.title,
        reason: row.reason,
        message: row.message,
        createdAt: row.created_at,
        canResend: row.payload !== null,
      }));
    },
    dismissAttention: (id: string) => db.run('DELETE FROM attention_items WHERE id = ?', [id]),
    async listQueue(): Promise<
      (OutboxItem & { status: OutboxStatus; lastError: string | null })[]
    > {
      const rows = await db.all<QueueRow>('SELECT * FROM outbox ORDER BY created_at, rowid');
      return rows.map((row) => ({ ...toItem(row), status: row.status, lastError: row.last_error }));
    },
    // Lo que agotó sus intentos vuelve a empezar; lo que está enviándose no se toca
    forceDue: (now: Date, id?: string) =>
      db.run(
        `UPDATE outbox SET status = 'pending', next_attempt_at = ?,
           attempts = CASE WHEN status = 'failed' THEN 0 ELSE attempts END
         WHERE status != 'in_flight' AND (? IS NULL OR id = ?)`,
        [now.toISOString(), id ?? null, id ?? null],
      ),
    // Devuelve el aviso a la cola con su envío original, en una sola transacción
    async requeueAttention(
      id: string,
      outboxId: string,
      now: Date,
    ): Promise<{ readonly kind: string; readonly aggregateId: string } | null> {
      let requeued: { kind: string; aggregateId: string } | null = null;
      await db.transaction(async (tx) => {
        const row = await tx.first<AttentionRow>('SELECT * FROM attention_items WHERE id = ?', [
          id,
        ]);
        if (!row?.payload) return;
        await enqueue(
          tx,
          {
            id: outboxId,
            kind: row.kind,
            aggregateId: row.aggregate_id,
            payload: JSON.parse(row.payload) as unknown,
          },
          now,
        );
        await tx.run('DELETE FROM attention_items WHERE id = ?', [id]);
        requeued = { kind: row.kind, aggregateId: row.aggregate_id };
      });
      return requeued;
    },
    async snapshot(): Promise<SyncSnapshot> {
      const counts = await db.first<{ pending: number; failed: number; attention: number }>(
        `SELECT
          (SELECT COUNT(*) FROM outbox WHERE status != 'failed') AS pending,
          (SELECT COUNT(*) FROM outbox WHERE status = 'failed') AS failed,
          (SELECT COUNT(*) FROM attention_items) AS attention`,
      );
      return counts ?? { pending: 0, failed: 0, attention: 0 };
    },
  };
}

export type OutboxStore = ReturnType<typeof createOutboxStore>;
