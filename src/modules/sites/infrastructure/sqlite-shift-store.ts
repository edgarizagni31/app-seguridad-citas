import type { ShiftStore, Site } from '../domain';
import type { ShiftReader, ShiftSnapshot } from '@/shared/domain';
import type { ChangeBus, SqlDatabase } from '@/shared/infrastructure/db';

import { SITES_TABLES } from './sites-migrations';

const SELECTED_SITE = 'selected_site';

export function createSqliteShiftStore(
  db: SqlDatabase,
  changes: ChangeBus,
): ShiftStore & ShiftReader {
  let cached: ShiftSnapshot | null | undefined;

  const snapshot = async () => {
    if (cached !== undefined) return cached;
    const row = await db.first<{ payload: string }>(
      'SELECT payload FROM shift_snapshot WHERE id = 1',
    );
    cached = row ? (JSON.parse(row.payload) as ShiftSnapshot) : null;
    return cached;
  };

  return {
    async selectedSite() {
      const row = await db.first<{ value: string }>(
        'SELECT value FROM app_settings WHERE key = ?',
        [SELECTED_SITE],
      );
      return row ? (JSON.parse(row.value) as Site) : null;
    },
    async saveSelectedSite(site) {
      await db.run('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)', [
        SELECTED_SITE,
        JSON.stringify(site),
      ]);
      changes.emit(SITES_TABLES);
    },
    snapshot,
    current: snapshot,
    async saveSnapshot(next) {
      await db.run(
        'INSERT OR REPLACE INTO shift_snapshot (id, site_id, date, payload) VALUES (1, ?, ?, ?)',
        [next.siteId, next.date, JSON.stringify(next)],
      );
      cached = next;
      changes.emit(SITES_TABLES);
    },
    async clearSelectedSite() {
      await db.run('DELETE FROM app_settings WHERE key = ?', [SELECTED_SITE]);
      changes.emit(SITES_TABLES);
    },
    // La sede elegida se recuerda; el paquete del día se descarta
    async clear() {
      await db.run('DELETE FROM shift_snapshot');
      cached = null;
      changes.emit(SITES_TABLES);
    },
  };
}
