import { createTestDatabase } from '@/test/sqljs-database';

import { SYNC_MIGRATIONS } from '../sync/sync-migrations';
import { createLocalDataInspector } from './local-data-inspector';
import { runMigrations } from './migrations';

async function setup() {
  const db = await createTestDatabase();
  await runMigrations(db, SYNC_MIGRATIONS);
  for (const id of ['a', 'b', 'c']) {
    await db.run(
      `INSERT INTO outbox (id, kind, aggregate_id, payload, status, next_attempt_at, created_at)
       VALUES (?, 'vehicle-entry', ?, '{"plate":"ABC-123"}', 'pending', 'x', 'x')`,
      [id, `agg-${id}`],
    );
  }
  return createLocalDataInspector(db);
}

describe('createLocalDataInspector', () => {
  it('lista las tablas de la app con su cantidad de filas', async () => {
    const inspector = await setup();

    expect(await inspector.listTables()).toEqual([
      { name: 'attention_items', rows: 0 },
      { name: 'outbox', rows: 3 },
      { name: 'schema_migrations', rows: 2 },
    ]);
  });

  it('lee una tabla con sus columnas, de lo más reciente a lo más antiguo y por páginas', async () => {
    const inspector = await setup();

    const page = await inspector.readTable('outbox', { limit: 2, offset: 0 });

    expect(page?.columns).toEqual([
      'id',
      'kind',
      'aggregate_id',
      'payload',
      'status',
      'attempts',
      'next_attempt_at',
      'last_error',
      'created_at',
    ]);
    expect(page?.rows.map((row) => row.id)).toEqual(['c', 'b']);
    expect(page?.rows[0]).toMatchObject({ payload: '{"plate":"ABC-123"}', last_error: null });
    expect(page?.total).toBe(3);
    expect(
      (await inspector.readTable('outbox', { limit: 2, offset: 2 }))?.rows.map((row) => row.id),
    ).toEqual(['a']);
  });

  it('solo lee tablas que existen: un nombre armado no llega a SQL', async () => {
    const inspector = await setup();

    expect(
      await inspector.readTable('outbox; DROP TABLE outbox', { limit: 5, offset: 0 }),
    ).toBeNull();
    expect((await inspector.listTables()).map((table) => table.name)).toContain('outbox');
  });
});
