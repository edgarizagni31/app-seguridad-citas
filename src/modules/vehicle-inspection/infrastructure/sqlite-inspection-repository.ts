import {
  INSPECTION_OUTBOX_KIND,
  type Inspection,
  type InspectionRepository,
  type StoredInspection,
} from '../domain';
import type { Clock, RecordSyncStatus } from '@/shared/domain';
import type { ChangeBus, SqlDatabase } from '@/shared/infrastructure/db';
import { enqueue, SYNC_TABLES } from '@/shared/infrastructure/sync';

import { INSPECTION_TABLES } from './inspection-migrations';

type InspectionRow = {
  payload: string;
  sync_status: RecordSyncStatus | null;
  sync_message: string | null;
  uploaded_photos: number;
};

const toStored = (row: InspectionRow): StoredInspection => ({
  ...(JSON.parse(row.payload) as Inspection),
  syncStatus: row.sync_status,
  syncMessage: row.sync_message,
  uploadedPhotos: row.uploaded_photos,
});

// Una inspección por vehículo: el borrador se reemplaza en cada respuesta
const UPSERT = `INSERT INTO inspections (id, vehicle_id, state, payload, updated_at)
  VALUES (?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET state = excluded.state, payload = excluded.payload,
    updated_at = excluded.updated_at`;

const upsertParams = (inspection: Inspection) => [
  inspection.id,
  inspection.vehicleId,
  inspection.state,
  JSON.stringify(inspection),
  inspection.updatedAt,
];

export function createSqliteInspectionRepository(deps: {
  readonly db: SqlDatabase;
  readonly changes: ChangeBus;
  readonly clock: Clock;
  readonly createId: () => string;
}): InspectionRepository {
  const { db, changes } = deps;
  const notify = () => changes.emit(INSPECTION_TABLES);
  const first = async (where: string, value: string) => {
    const row = await db.first<InspectionRow>(`SELECT * FROM inspections WHERE ${where} = ?`, [
      value,
    ]);
    return row ? toStored(row) : null;
  };

  return {
    tables: INSPECTION_TABLES,
    async save(inspection) {
      await db.run(UPSERT, upsertParams(inspection));
      notify();
    },
    findById: (id) => first('id', id),
    findByVehicle: (vehicleId) => first('vehicle_id', vehicleId),
    async list() {
      const rows = await db.all<InspectionRow>(
        'SELECT * FROM inspections ORDER BY updated_at DESC',
      );
      return rows.map(toStored);
    },
    async saveFinished(inspection, request) {
      await db.transaction(async (tx) => {
        await tx.run(UPSERT, upsertParams(inspection));
        await tx.run(
          "UPDATE inspections SET sync_status = 'pending', uploaded_photos = 0 WHERE id = ?",
          [inspection.id],
        );
        await enqueue(
          tx,
          {
            id: deps.createId(),
            kind: INSPECTION_OUTBOX_KIND,
            aggregateId: inspection.id,
            payload: request,
          },
          deps.clock.now(),
        );
      });
      changes.emit([...INSPECTION_TABLES, ...SYNC_TABLES]);
    },
    async setUploadedPhotos(id, count) {
      await db.run('UPDATE inspections SET uploaded_photos = ? WHERE id = ?', [count, id]);
      notify();
    },
    async markSynced(id) {
      await db.run("UPDATE inspections SET sync_status = 'synced' WHERE id = ?", [id]);
      notify();
    },
    async markRejected(id, message) {
      await db.run(
        "UPDATE inspections SET sync_status = 'rejected', sync_message = ? WHERE id = ?",
        [message, id],
      );
      notify();
    },
    async clearSynced() {
      await db.run("DELETE FROM inspections WHERE sync_status = 'synced'");
      notify();
    },
  };
}
