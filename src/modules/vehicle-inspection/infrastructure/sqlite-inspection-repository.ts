import {
  INSPECTION_OUTBOX_KIND,
  type Inspection,
  type InspectionRepository,
  type InspectionVerdict,
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
  verdict: string | null;
};

const toStored = (row: InspectionRow): StoredInspection => ({
  ...(JSON.parse(row.payload) as Inspection),
  syncStatus: row.sync_status,
  syncMessage: row.sync_message,
  verdict: row.verdict ? (JSON.parse(row.verdict) as InspectionVerdict) : null,
});

// Una inspección por voucher + unidad: el borrador se reemplaza en cada respuesta
const UPSERT = `INSERT INTO unit_inspections (id, voucher_id, unit_id, state, payload, updated_at)
  VALUES (?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET state = excluded.state, payload = excluded.payload,
    updated_at = excluded.updated_at`;

const upsertParams = (inspection: Inspection) => [
  inspection.id,
  inspection.voucherId,
  inspection.unitId,
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
  const one = async (sql: string, params: string[]) => {
    const row = await db.first<InspectionRow>(sql, params);
    return row ? toStored(row) : null;
  };

  return {
    tables: INSPECTION_TABLES,
    async save(inspection) {
      await db.run(UPSERT, upsertParams(inspection));
      notify();
    },
    findById: (id) => one('SELECT * FROM unit_inspections WHERE id = ?', [id]),
    findByUnit: (voucherId, unitId) =>
      one('SELECT * FROM unit_inspections WHERE voucher_id = ? AND unit_id = ?', [
        voucherId,
        unitId,
      ]),
    async list() {
      const rows = await db.all<InspectionRow>(
        'SELECT * FROM unit_inspections ORDER BY updated_at DESC',
      );
      return rows.map(toStored);
    },
    async saveFinished(inspection, request) {
      await db.transaction(async (tx) => {
        await tx.run(UPSERT, upsertParams(inspection));
        await tx.run(
          "UPDATE unit_inspections SET sync_status = 'pending', sync_message = NULL, verdict = NULL WHERE id = ?",
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
    async markSynced(id, verdict) {
      await db.run("UPDATE unit_inspections SET sync_status = 'synced', verdict = ? WHERE id = ?", [
        JSON.stringify(verdict),
        id,
      ]);
      notify();
    },
    async markPending(id) {
      await db.run(
        "UPDATE unit_inspections SET sync_status = 'pending', sync_message = NULL WHERE id = ?",
        [id],
      );
      notify();
    },
    async markRejected(id, message) {
      await db.run(
        "UPDATE unit_inspections SET sync_status = 'rejected', sync_message = ? WHERE id = ?",
        [message, id],
      );
      notify();
    },
    async clearSynced() {
      await db.run("DELETE FROM unit_inspections WHERE sync_status = 'synced'");
      notify();
    },
    async delete(id) {
      await db.run('DELETE FROM unit_inspections WHERE id = ?', [id]);
      notify();
    },
  };
}
