import type { Migration } from '@/shared/infrastructure/db';

export const INSPECTION_MIGRATIONS: readonly Migration[] = [
  {
    id: 'inspection-001',
    statements: [
      `CREATE TABLE inspections (
        id TEXT PRIMARY KEY NOT NULL,
        vehicle_id TEXT NOT NULL,
        state TEXT NOT NULL,
        payload TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        sync_status TEXT,
        sync_message TEXT,
        uploaded_photos INTEGER NOT NULL DEFAULT 0
      )`,
      'CREATE UNIQUE INDEX inspections_vehicle ON inspections (vehicle_id)',
    ],
  },
];

export const INSPECTION_TABLES = ['inspections'] as const;
