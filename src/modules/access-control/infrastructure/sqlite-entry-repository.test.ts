import { toConfirmEntryRequest } from '../domain';
import { createChangeBus, runMigrations } from '@/shared/infrastructure/db';
import { SYNC_MIGRATIONS } from '@/shared/infrastructure/sync';
import { buildEntryRecord } from '@/test/factories/entry';
import { createFixedClock } from '@/test/fakes/fixed-clock';
import { createTestDatabase } from '@/test/sqljs-database';

import { ACCESS_MIGRATIONS } from './access-migrations';
import { createSqliteEntryRepository } from './sqlite-entry-repository';

async function setup(createId: () => string = () => 'out-1') {
  const db = await createTestDatabase();
  await runMigrations(db, [...SYNC_MIGRATIONS, ...ACCESS_MIGRATIONS]);
  const changes = createChangeBus();
  const onChange = jest.fn();
  changes.subscribe(['vehicle_entries', 'outbox'], onChange);
  const repo = createSqliteEntryRepository({
    db,
    changes,
    clock: createFixedClock('2026-10-05T16:44:00Z'),
    createId,
  });
  return { db, repo, onChange };
}

const record = buildEntryRecord();
const request = toConfirmEntryRequest(record);

describe('createSqliteEntryRepository', () => {
  it('guarda el ingreso sin documentos y encola su envío en la misma transacción', async () => {
    const { db, repo, onChange } = await setup();

    await repo.saveConfirmed(record, request);

    expect(await repo.list()).toEqual([
      expect.objectContaining({
        id: 'entry-1',
        plate: 'ABC-123',
        arrivedVisitorIds: ['vis-luis'],
        entering: 1,
        notArriving: 1,
        syncStatus: 'pending',
      }),
    ]);
    const outbox = await db.all<{ kind: string; aggregate_id: string; payload: string }>(
      'SELECT kind, aggregate_id, payload FROM outbox',
    );
    expect(outbox).toEqual([
      { kind: 'vehicle-entry', aggregate_id: 'entry-1', payload: JSON.stringify(request) },
    ]);
    const columns = JSON.stringify(await db.all('SELECT * FROM vehicle_entries'));
    expect(columns).not.toContain('04512378-9');
    expect(onChange).toHaveBeenCalled();
  });

  it('si no se puede encolar, tampoco queda el ingreso', async () => {
    const { repo } = await setup(() => 'out-duplicado');
    await repo.saveConfirmed(record, request);

    await expect(
      repo.saveConfirmed(buildEntryRecord({ id: 'entry-2' }), request),
    ).rejects.toThrow();
    expect((await repo.list()).map((entry) => entry.id)).toEqual(['entry-1']);
  });

  it('marca sincronizado o rechazado y limpia solo lo sincronizado', async () => {
    let next = 0;
    const { repo } = await setup(() => `out-${(next += 1)}`);
    await repo.saveConfirmed(record, request);
    await repo.saveConfirmed(buildEntryRecord({ id: 'entry-2' }), request);
    await repo.saveConfirmed(buildEntryRecord({ id: 'entry-3' }), request);

    await repo.markSynced('entry-1');
    await repo.markRejected('entry-2', 'En lista negra.');
    await repo.clearSynced();

    const entries = await repo.list();
    expect(entries.map((entry) => [entry.id, entry.syncStatus, entry.syncMessage])).toEqual(
      expect.arrayContaining([
        ['entry-2', 'rejected', 'En lista negra.'],
        ['entry-3', 'pending', null],
      ]),
    );
    expect(entries).toHaveLength(2);

    // Soporte lo reenvía: vuelve a pendiente y sin mensaje
    await repo.markPending('entry-2');
    expect((await repo.list()).find((entry) => entry.id === 'entry-2')).toMatchObject({
      syncStatus: 'pending',
      syncMessage: null,
    });
  });
});
