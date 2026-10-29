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
  {
    // Inspección real (GetInspectionProtocol/ExecuteInspectionProtocol): una por voucher + unidad.
    // La tabla anterior y sus envíos eran del paquete simulado y tenían otro formato
    id: 'inspection-002',
    statements: [
      'DROP TABLE inspections',
      "DELETE FROM outbox WHERE kind = 'vehicle-inspection'",
      `CREATE TABLE unit_inspections (
        id TEXT PRIMARY KEY NOT NULL,
        voucher_id TEXT NOT NULL,
        unit_id TEXT NOT NULL,
        state TEXT NOT NULL,
        payload TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        sync_status TEXT,
        sync_message TEXT,
        verdict TEXT
      )`,
      'CREATE UNIQUE INDEX unit_inspections_unit ON unit_inspections (voucher_id, unit_id)',
    ],
  },
];

export const INSPECTION_TABLES = ['unit_inspections'] as const;
