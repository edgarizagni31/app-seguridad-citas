import {
  arrivedVisitorIds,
  ENTRY_OUTBOX_KIND,
  type EntryRepository,
  type StoredEntry,
} from '../domain';
import type { Clock, RecordSyncStatus } from '@/shared/domain';
import type { ChangeBus, SqlDatabase } from '@/shared/infrastructure/db';
import { enqueue, SYNC_TABLES } from '@/shared/infrastructure/sync';

import { ACCESS_TABLES } from './access-migrations';

type EntryRow = {
  id: string;
  mode: StoredEntry['mode'];
  vehicle_id: string;
  plate: string;
  carrier_name: string;
  confirmed_at: string;
  arrived_visitor_ids: string;
  entering: number;
  not_arriving: number;
  sync_status: RecordSyncStatus;
  sync_message: string | null;
};

const toEntry = (row: EntryRow): StoredEntry => ({
  id: row.id,
  mode: row.mode,
  vehicleId: row.vehicle_id,
  plate: row.plate,
  carrierName: row.carrier_name,
  confirmedAt: row.confirmed_at,
  arrivedVisitorIds: JSON.parse(row.arrived_visitor_ids) as string[],
  entering: row.entering,
  notArriving: row.not_arriving,
  syncStatus: row.sync_status,
  syncMessage: row.sync_message,
});

export function createSqliteEntryRepository(deps: {
  readonly db: SqlDatabase;
  readonly changes: ChangeBus;
  readonly clock: Clock;
  readonly createId: () => string;
}): EntryRepository {
  const { db, changes } = deps;
  const notify = () => changes.emit(ACCESS_TABLES);

  return {
    tables: ACCESS_TABLES,
    async saveConfirmed(record, request) {
      const arrived = arrivedVisitorIds(record);
      await db.transaction(async (tx) => {
        await tx.run(
          `INSERT INTO vehicle_entries (id, mode, vehicle_id, plate, carrier_name, confirmed_at,
             arrived_visitor_ids, entering, not_arriving)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            record.id,
            record.mode,
            record.vehicleId,
            record.plate,
            record.carrierName,
            record.confirmedAt,
            JSON.stringify(arrived),
            arrived.length,
            record.visitors.length - arrived.length,
          ],
        );
        await enqueue(
          tx,
          {
            id: deps.createId(),
            kind: ENTRY_OUTBOX_KIND,
            aggregateId: record.id,
            payload: request,
          },
          deps.clock.now(),
        );
      });
      changes.emit([...ACCESS_TABLES, ...SYNC_TABLES]);
    },
    async list() {
      const rows = await db.all<EntryRow>(
        'SELECT * FROM vehicle_entries ORDER BY confirmed_at DESC',
      );
      return rows.map(toEntry);
    },
    async markSynced(id) {
      await db.run("UPDATE vehicle_entries SET sync_status = 'synced' WHERE id = ?", [id]);
      notify();
    },
    async markPending(id) {
      await db.run(
        "UPDATE vehicle_entries SET sync_status = 'pending', sync_message = NULL WHERE id = ?",
        [id],
      );
      notify();
    },
    async markRejected(id, message) {
      await db.run(
        "UPDATE vehicle_entries SET sync_status = 'rejected', sync_message = ? WHERE id = ?",
        [message, id],
      );
      notify();
    },
    async clearSynced() {
      await db.run("DELETE FROM vehicle_entries WHERE sync_status = 'synced'");
      notify();
    },
  };
}
