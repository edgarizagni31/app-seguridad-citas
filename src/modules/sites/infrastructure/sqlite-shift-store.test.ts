import type { ShiftSnapshot } from '@/shared/domain';
import { createChangeBus, runMigrations } from '@/shared/infrastructure/db';
import { createTestDatabase } from '@/test/sqljs-database';

import { SITES_MIGRATIONS } from './sites-migrations';
import { createSqliteShiftStore } from './sqlite-shift-store';

const snapshot = {
  siteId: 'site-central',
  date: '2026-10-12',
  appointments: [],
} as unknown as ShiftSnapshot;
const SITE = { id: 'site-central', name: 'Almacén Central' };

async function setup() {
  const db = await createTestDatabase();
  await runMigrations(db, SITES_MIGRATIONS);
  const changes = createChangeBus();
  const onChange = jest.fn();
  changes.subscribe(['shift_snapshot', 'app_settings'], onChange);
  return { store: createSqliteShiftStore(db, changes), db, changes, onChange };
}

describe('createSqliteShiftStore', () => {
  it('guarda y recupera la sede elegida y el paquete del día', async () => {
    const { store, onChange } = await setup();

    await store.saveSelectedSite(SITE);
    await store.saveSnapshot(snapshot);

    expect(await store.selectedSite()).toEqual(SITE);
    expect(await store.current()).toEqual(snapshot);
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('lee el paquete persistido al crear un store nuevo', async () => {
    const { store, db, changes } = await setup();
    await store.saveSnapshot(snapshot);

    expect(await createSqliteShiftStore(db, changes).snapshot()).toEqual(snapshot);
  });

  it('clear descarta el paquete pero recuerda la sede', async () => {
    const { store } = await setup();
    await store.saveSelectedSite(SITE);
    await store.saveSnapshot(snapshot);

    await store.clear();

    expect(await store.current()).toBeNull();
    expect(await store.selectedSite()).toEqual(SITE);
  });
});
