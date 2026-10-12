import { startInspection, STANDARD_DEFINITION_V1, toSubmitRequest } from '../domain';
import { createChangeBus, runMigrations } from '@/shared/infrastructure/db';
import { SYNC_MIGRATIONS } from '@/shared/infrastructure/sync';
import { createFixedClock } from '@/test/fakes/fixed-clock';
import { createTestDatabase } from '@/test/sqljs-database';

import { INSPECTION_MIGRATIONS } from './inspection-migrations';
import { createSqliteInspectionRepository } from './sqlite-inspection-repository';

const NOW = new Date('2026-10-05T17:00:00Z');
const draft = (id = 'insp-1', vehicleId = 'veh-mnp-456') =>
  startInspection(
    {
      id,
      vehicleId,
      appointmentId: 'apt-dollarcity',
      voucherCode: 'APPASP0000000000000094',
      clientName: 'DOLLAR CITY',
      plate: 'MNP-456',
      inspectorId: 'user-ana',
      inspectorName: 'Ana Morales',
    },
    STANDARD_DEFINITION_V1,
    NOW,
  );

async function setup() {
  const db = await createTestDatabase();
  await runMigrations(db, [...SYNC_MIGRATIONS, ...INSPECTION_MIGRATIONS]);
  const changes = createChangeBus();
  const onChange = jest.fn();
  changes.subscribe(['inspections'], onChange);
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
  it('guarda el borrador y lo encuentra por id o por vehículo', async () => {
    const { repo, onChange } = await setup();

    await repo.save(draft());
    await repo.save({ ...draft(), observation: 'Actualizado' });

    expect(await repo.findById('insp-1')).toMatchObject({
      observation: 'Actualizado',
      syncStatus: null,
      uploadedPhotos: 0,
    });
    expect((await repo.findByVehicle('veh-mnp-456'))?.id).toBe('insp-1');
    expect(await repo.findById('nope')).toBeNull();
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('una sola inspección por vehículo', async () => {
    const { repo } = await setup();
    await repo.save(draft('insp-1'));

    await expect(repo.save(draft('insp-2'))).rejects.toThrow();
  });

  it('el cierre guarda el estado y encola el envío en la misma transacción', async () => {
    const { db, repo } = await setup();
    const finished = { ...draft(), state: 'observed' as const };

    await repo.saveFinished(finished, toSubmitRequest(finished));

    expect(await repo.findById('insp-1')).toMatchObject({
      state: 'observed',
      syncStatus: 'pending',
    });
    expect(await db.all('SELECT kind, aggregate_id FROM outbox')).toEqual([
      { kind: 'vehicle-inspection', aggregate_id: 'insp-1' },
    ]);
  });

  it('registra el avance de subida, el resultado y limpia lo sincronizado', async () => {
    const { repo } = await setup();
    await repo.saveFinished(draft('insp-1', 'veh-1'), toSubmitRequest(draft()));
    await repo.saveFinished(draft('insp-2', 'veh-2'), toSubmitRequest(draft()));

    await repo.setUploadedPhotos('insp-1', 4);
    await repo.markSynced('insp-1');
    await repo.markRejected('insp-2', 'Ya fue inspeccionado.');
    expect(await repo.findById('insp-1')).toMatchObject({
      uploadedPhotos: 4,
      syncStatus: 'synced',
    });

    await repo.clearSynced();

    expect((await repo.list()).map((item) => [item.id, item.syncStatus, item.syncMessage])).toEqual(
      [['insp-2', 'rejected', 'Ya fue inspeccionado.']],
    );
  });
});
