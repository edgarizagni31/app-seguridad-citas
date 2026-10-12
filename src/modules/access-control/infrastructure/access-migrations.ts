import type { Migration } from '@/shared/infrastructure/db';

export const ACCESS_MIGRATIONS: readonly Migration[] = [
  {
    id: 'access-001',
    statements: [
      `CREATE TABLE vehicle_entries (
        id TEXT PRIMARY KEY NOT NULL,
        mode TEXT NOT NULL,
        vehicle_id TEXT NOT NULL,
        plate TEXT NOT NULL,
        carrier_name TEXT NOT NULL,
        confirmed_at TEXT NOT NULL,
        arrived_visitor_ids TEXT NOT NULL,
        entering INTEGER NOT NULL,
        not_arriving INTEGER NOT NULL,
        sync_status TEXT NOT NULL DEFAULT 'pending',
        sync_message TEXT
      )`,
      'CREATE INDEX vehicle_entries_vehicle ON vehicle_entries (vehicle_id)',
    ],
  },
];

export const ACCESS_TABLES = ['vehicle_entries'] as const;
