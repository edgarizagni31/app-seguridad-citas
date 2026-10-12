import type { Migration } from '../db';

export const SYNC_MIGRATIONS: readonly Migration[] = [
  {
    id: 'sync-001',
    statements: [
      `CREATE TABLE outbox (
        id TEXT PRIMARY KEY NOT NULL,
        kind TEXT NOT NULL,
        aggregate_id TEXT NOT NULL,
        payload TEXT NOT NULL,
        status TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        next_attempt_at TEXT NOT NULL,
        last_error TEXT,
        created_at TEXT NOT NULL
      )`,
      'CREATE INDEX outbox_status_created ON outbox (status, created_at)',
      `CREATE TABLE attention_items (
        id TEXT PRIMARY KEY NOT NULL,
        kind TEXT NOT NULL,
        aggregate_id TEXT NOT NULL,
        title TEXT NOT NULL,
        reason TEXT NOT NULL,
        message TEXT,
        created_at TEXT NOT NULL
      )`,
    ],
  },
];

export const SYNC_TABLES = ['outbox', 'attention_items'] as const;
