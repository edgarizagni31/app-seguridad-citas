import { startInspection, toExecuteRequest } from '../domain';
import { createChangeBus, runMigrations } from '@/shared/infrastructure/db';
import { SYNC_MIGRATIONS } from '@/shared/infrastructure/sync';
import { createFixedClock } from '@/test/fakes/fixed-clock';
import { createTestDatabase } from '@/test/sqljs-database';

import { buildDemoProtocol } from './demo-protocol';
import { INSPECTION_MIGRATIONS } from './inspection-migrations';
import { createSqliteInspectionRepository } from './sqlite-inspection-repository';

const NOW = new Date('2026-10-05T17:00:00Z');
const draft = (id = 'insp-1', unitId = 'vtu-1') =>
  startInspection(
    {
      id,
      voucherId: 'voucher-1',
      unitId,
      voucherCode: 'APPASP0000000000000094',
      clientName: 'DOLLAR CITY',
      plate: 'MNP-456',
      inspectorId: 'user-ana',
      inspectorName: 'Ana Morales',
    },
    buildDemoProtocol(),
    NOW,
  );

async function setup() {
  const db = await createTestDatabase();
  await runMigrations(db, [...SYNC_MIGRATIONS, ...INSPECTION_MIGRATIONS]);
  const changes = createChangeBus();
  const onChange = jest.fn();
  changes.subscribe(['unit_inspections'], onChange);
  let ids = 0;
  const repo = createSqliteInspectionRepository({
    db,
    changes,
    clock: createFixedClock(NOW.toISOString()),
    createId: () => `out-${(ids += 1)}`,
  });
  return { db, repo, onChange };
}

describe('createSqliteInspectionRepository', () => {
  it('guarda el borrador con su protocolo y lo encuentra por id o por voucher + unidad', async () => {
    const { repo, onChange } = await setup();

    await repo.save(draft());
    await repo.save({ ...draft(), observation: 'Actualizado' });

    const stored = await repo.findById('insp-1');
    expect(stored).toMatchObject({ observation: 'Actualizado', syncStatus: null, verdict: null });
    expect(stored?.protocol.questions).toHaveLength(15);
    expect((await repo.findByUnit('voucher-1', 'vtu-1'))?.id).toBe('insp-1');
    expect(await repo.findByUnit('voucher-1', 'otra')).toBeNull();
    expect(await repo.findById('nope')).toBeNull();
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('una sola inspección por voucher + unidad', async () => {
    const { repo } = await setup();
    await repo.save(draft('insp-1'));

    await expect(repo.save(draft('insp-2'))).rejects.toThrow();
  });

  it('el cierre guarda el estado y encola el envío en la misma transacción', async () => {
    const { db, repo } = await setup();
    const finished = { ...draft(), state: 'observed' as const };

    await repo.saveFinished(finished, toExecuteRequest(finished));

    expect(await repo.findById('insp-1')).toMatchObject({
      state: 'observed',
      syncStatus: 'pending',
    });
    expect(await db.all('SELECT kind, aggregate_id FROM outbox')).toEqual([
      { kind: 'vehicle-inspection', aggregate_id: 'insp-1' },
    ]);
  });

  it('guarda el veredicto del servidor, los rechazos y limpia lo sincronizado', async () => {
    const { repo } = await setup();
    await repo.saveFinished(draft('insp-1', 'vtu-1'), toExecuteRequest(draft()));
    await repo.saveFinished(draft('insp-2', 'vtu-2'), toExecuteRequest(draft()));

    await repo.markSynced('insp-1', { compliant: false, nonCompliant: ['Precinto: No'] });
    await repo.markRejected('insp-2', 'La foto supera el tamaño máximo.');
    expect(await repo.findById('insp-1')).toMatchObject({
      syncStatus: 'synced',
      verdict: { compliant: false, nonCompliant: ['Precinto: No'] },
    });

    await repo.clearSynced();

    expect((await repo.list()).map((item) => [item.id, item.syncStatus, item.syncMessage])).toEqual(
      [['insp-2', 'rejected', 'La foto supera el tamaño máximo.']],
    );

    // Soporte lo reenvía: vuelve a pendiente y sin mensaje
    await repo.markPending('insp-2');
    expect(await repo.findById('insp-2')).toMatchObject({
      syncStatus: 'pending',
      syncMessage: null,
    });

    await repo.delete('insp-2');
    expect(await repo.list()).toEqual([]);
  });

  it('la migración descarta la tabla y los envíos del paquete simulado', async () => {
    const db = await createTestDatabase();
    await runMigrations(db, [...SYNC_MIGRATIONS, INSPECTION_MIGRATIONS[0]!]);
    await db.run(
      `INSERT INTO outbox (id, kind, aggregate_id, payload, status, next_attempt_at, created_at)
       VALUES ('o1', 'vehicle-inspection', 'old', '{}', 'pending', 'x', 'x'),
              ('o2', 'vehicle-entry', 'e1', '{}', 'pending', 'x', 'x')`,
    );

    await runMigrations(db, [...SYNC_MIGRATIONS, ...INSPECTION_MIGRATIONS]);

    expect(await db.all('SELECT id FROM outbox')).toEqual([{ id: 'o2' }]);
    expect(
      await db.all(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE '%inspections'",
      ),
    ).toEqual([{ name: 'unit_inspections' }]);
  });
});
