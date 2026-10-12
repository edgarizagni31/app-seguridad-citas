import { SHIFT_TABLES } from '@/shared/domain';
import type { Migration } from '@/shared/infrastructure/db';

export const SITES_MIGRATIONS: readonly Migration[] = [
  {
    id: 'sites-001',
    statements: [
      'CREATE TABLE app_settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)',
      `CREATE TABLE shift_snapshot (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        site_id TEXT NOT NULL,
        date TEXT NOT NULL,
        payload TEXT NOT NULL
      )`,
    ],
  },
];

export const SITES_TABLES = SHIFT_TABLES;
