import {
  ENTRY_OUTBOX_KIND,
  toConfirmEntryRequest,
  type EntryRepository,
  type StoredEntry,
} from '../domain';
import { err, ok, type OutboxItem } from '@/shared/domain';
import { buildEntryDraft, buildEntryRecord } from '@/test/factories/entry';
import { createFixedClock } from '@/test/fakes/fixed-clock';
import { silentLogger } from '@/test/fakes/test-dependencies';

import {
  confirmEntry,
  createEntrySyncHandler,
  entryHistoryFrom,
  entryLogFrom,
} from './entry-use-cases';

const stored = (overrides: Partial<StoredEntry> = {}): StoredEntry => ({
  id: 'entry-1',
  mode: 'entry',
  vehicleId: 'veh-abc-123',
  plate: 'ABC-123',
  carrierName: 'Transportes Cuscatlán',
  confirmedAt: '2026-10-05T16:44:00.000Z',
  arrivedVisitorIds: ['vis-luis'],
  entering: 1,
  notArriving: 1,
  syncStatus: 'pending',
  syncMessage: null,
  ...overrides,
});

const createRepo = (entries: StoredEntry[] = []) =>
  ({
    tables: ['vehicle_entries'],
    saveConfirmed: jest.fn(async () => undefined),
    list: jest.fn(async () => entries),
    markSynced: jest.fn(async () => undefined),
    markRejected: jest.fn(async () => undefined),
    clearSynced: jest.fn(async () => undefined),
  }) satisfies EntryRepository;

const entryDeps = (repo = createRepo()) => ({
  repo,
  clock: createFixedClock('2026-10-05T16:44:00Z'),
  createId: () => 'entry-1',
  requestSync: jest.fn(async () => undefined),
  logger: silentLogger,
});

describe('confirmEntry', () => {
  it('guarda el ingreso con su envío y pide sincronizar', async () => {
    const deps = entryDeps();

    const result = await confirmEntry(deps)(buildEntryDraft());

    expect(result).toMatchObject({ ok: true, value: { id: 'entry-1', plate: 'ABC-123' } });
    const record = result.ok ? result.value : buildEntryRecord();
    expect(deps.repo.saveConfirmed).toHaveBeenCalledWith(record, toConfirmEntryRequest(record));
    expect(deps.requestSync).toHaveBeenCalled();
  });

  it('con visitantes sin marcar no guarda nada', async () => {
    const deps = entryDeps();
    const draft = buildEntryDraft();
    const incomplete = {
      ...draft,
      visitors: draft.visitors.map((visitor) => ({ ...visitor, status: 'pending' as const })),
    };

    expect(await confirmEntry(deps)(incomplete)).toEqual(err({ type: 'incomplete' }));
    expect(deps.repo.saveConfirmed).not.toHaveBeenCalled();
  });

  it('si falla el guardado devuelve error de almacenamiento', async () => {
    const deps = entryDeps();
    deps.repo.saveConfirmed.mockRejectedValueOnce(new Error('disco lleno'));

    expect(await confirmEntry(deps)(buildEntryDraft())).toEqual(err({ type: 'storage' }));
    expect(deps.requestSync).not.toHaveBeenCalled();
  });
});

describe('entryLogFrom / entryHistoryFrom', () => {
  it('los ingresos rechazados no cuentan como ingresados', async () => {
    const repo = createRepo([stored(), stored({ id: 'entry-2', syncStatus: 'rejected' })]);

    expect(await entryLogFrom(repo).list()).toEqual([
      { vehicleId: 'veh-abc-123', enteredAt: '2026-10-05T16:44:00.000Z', visitorIds: ['vis-luis'] },
    ]);
  });

  it('el historial muestra placa, conteo y estado de sincronización', async () => {
    const repo = createRepo([stored({ syncStatus: 'synced' })]);

    expect(await entryHistoryFrom(repo).list()).toEqual([
      {
        id: 'entry-1',
        kind: 'entry',
        title: 'ABC-123',
        subtitle: '1 ingresaron · 1 no llegaron',
        occurredAt: '2026-10-05T16:44:00.000Z',
        syncStatus: 'synced',
      },
    ]);
  });
});

describe('createEntrySyncHandler', () => {
  const request = toConfirmEntryRequest(buildEntryRecord());
  const item: OutboxItem = {
    id: 'out-1',
    kind: ENTRY_OUTBOX_KIND,
    aggregateId: 'entry-1',
    payload: request,
    attempts: 0,
    createdAt: '2026-10-05T16:44:00.000Z',
  };
  const setup = (verdict: unknown) => {
    const repo = createRepo();
    const gateway = {
      validateUnit: jest.fn(),
      validateVisitor: jest.fn(),
      confirmEntry: jest.fn(async () => verdict as never),
    };
    return { repo, gateway, handler: createEntrySyncHandler({ gateway, repo }) };
  };

  it('envía con la clave de idempotencia y marca sincronizado', async () => {
    const { handler, gateway, repo } = setup(ok({ type: 'accepted' }));

    expect(await handler.send(item)).toEqual(ok({ type: 'done' }));
    expect(gateway.confirmEntry).toHaveBeenCalledWith(request, 'entry-1');
    expect(repo.markSynced).toHaveBeenCalledWith('entry-1');
  });

  it('sin red es reintentable', async () => {
    const { handler } = setup(err({ type: 'network' }));

    expect(await handler.send(item)).toEqual(err({ type: 'retryable', cause: 'network' }));
  });

  it('un rechazo del servidor marca el ingreso como rechazado', async () => {
    const { handler, repo } = setup(
      ok({ type: 'rejected', reason: 'VisitorBlacklisted', message: 'En lista negra.' }) as never,
    );

    const outcome = await handler.send(item);
    expect(outcome).toEqual(
      ok({ type: 'rejected', reason: 'VisitorBlacklisted', message: 'En lista negra.' }),
    );
    await handler.onRejected?.(item, {
      type: 'rejected',
      reason: 'VisitorBlacklisted',
      message: 'En lista negra.',
    });
    expect(repo.markRejected).toHaveBeenCalledWith('entry-1', 'En lista negra.');
    expect(handler.describe(item)).toEqual({ title: 'Ingreso ABC-123' });
  });
});
