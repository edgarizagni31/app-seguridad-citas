import { err, ok, type OutboxHandler, type OutboxItem } from '@/shared/domain';
import { createFixedClock } from '@/test/fakes/fixed-clock';
import { silentLogger } from '@/test/fakes/test-dependencies';
import { createTestDatabase } from '@/test/sqljs-database';

import { createChangeBus, runMigrations, type SqlDatabase } from '../db';
import { backoffDelayMs } from './backoff';
import { createOutboxStore, enqueue } from './outbox';
import { createSyncEngine } from './sync-engine';
import { SYNC_MIGRATIONS } from './sync-migrations';

type Behaviour = 'done' | 'reject' | 'retry' | 'throw' | 'offline';

function createHandler(behaviours: Behaviour[] = []) {
  const sent: OutboxItem[] = [];
  const onRejected = jest.fn(async () => undefined);
  const onRequeued = jest.fn(async (_aggregateId: string) => undefined);
  const handler: OutboxHandler = {
    kind: 'test',
    describe: (item) => ({ title: `Registro ${item.aggregateId}` }),
    onRejected,
    onRequeued,
    async send(item) {
      sent.push(item);
      const behaviour = behaviours.shift() ?? 'done';
      if (behaviour === 'throw') throw new Error('boom');
      if (behaviour === 'retry') return err({ type: 'retryable' });
      if (behaviour === 'offline') return err({ type: 'retryable', cause: 'network' });
      if (behaviour === 'reject')
        return ok({ type: 'rejected', reason: 'VisitorBlacklisted', message: 'En lista negra' });
      return ok({ type: 'done' });
    },
  };
  return { handler, sent, onRejected, onRequeued };
}

async function setup(
  behaviours: Behaviour[] = [],
  options: { online?: boolean; maxAttempts?: number } = {},
) {
  const db: SqlDatabase = await createTestDatabase();
  await runMigrations(db, SYNC_MIGRATIONS);
  const clock = createFixedClock('2026-10-12T15:00:00.000Z');
  const store = createOutboxStore(db);
  const { handler, sent, onRejected, onRequeued } = createHandler(behaviours);
  const onAttention = jest.fn();
  let ids = 0;
  const engine = createSyncEngine({
    store,
    handlers: [handler],
    clock,
    logger: silentLogger,
    changes: createChangeBus(),
    isOnline: async () => options.online ?? true,
    createId: () => `att-${++ids}`,
    onAttention,
    maxAttempts: options.maxAttempts,
    random: () => 0,
  });
  const add = (id: string, kind = 'test', aggregateId = `agg-${id}`) =>
    enqueue(db, { id, kind, aggregateId, payload: { id } }, clock.now());
  return { db, clock, engine, add, sent, onRejected, onRequeued, onAttention };
}

describe('createSyncEngine', () => {
  it('envía en orden FIFO y elimina lo sincronizado', async () => {
    const { engine, add, sent } = await setup();
    await add('1');
    await add('2');

    await engine.requestSync();

    expect(sent.map((item) => item.payload)).toEqual([{ id: '1' }, { id: '2' }]);
    expect(await engine.snapshot()).toEqual({ pending: 0, failed: 0, attention: 0 });
  });

  it('sin red no envía nada', async () => {
    const { engine, add, sent } = await setup([], { online: false });
    await add('1');

    await engine.requestSync();

    expect(sent).toHaveLength(0);
    expect((await engine.snapshot()).pending).toBe(1);
  });

  it('un rechazo va a "Requiere atención" y avisa', async () => {
    const { engine, add, onRejected, onAttention } = await setup(['reject']);
    await add('1');

    await engine.requestSync();

    expect(onRejected).toHaveBeenCalledTimes(1);
    expect(await engine.listAttention()).toEqual([
      {
        id: 'att-1',
        kind: 'test',
        aggregateId: 'agg-1',
        title: 'Registro agg-1',
        reason: 'VisitorBlacklisted',
        message: 'En lista negra',
        createdAt: '2026-10-12T15:00:00.000Z',
        canResend: true,
      },
    ]);
    expect(onAttention).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'VisitorBlacklisted' }),
    );
    expect((await engine.snapshot()).pending).toBe(0);
  });

  it('un fallo reintentable detiene la pasada y se reprograma con backoff', async () => {
    const { engine, add, sent, clock } = await setup(['retry']);
    await add('1');

    await engine.requestSync();
    await engine.requestSync();
    expect(sent).toHaveLength(1);

    clock.advanceSeconds(backoffDelayMs(1, () => 0) / 1000);
    await engine.requestSync();
    expect(sent).toHaveLength(2);
  });

  it('un registro trabado no bloquea a los demás', async () => {
    const { engine, add, sent } = await setup(['retry']);
    await add('1');
    await add('2');

    await engine.requestSync();
    await engine.requestSync();

    expect(sent.map((item) => item.payload)).toEqual([{ id: '1' }, { id: '2' }]);
  });

  it('una operación nunca adelanta a otra anterior del mismo registro', async () => {
    const { engine, add, sent, clock } = await setup(['retry']);
    await add('1', 'test', 'agg-compartido');
    await add('2', 'test', 'agg-compartido');

    await engine.requestSync();
    await engine.requestSync();
    expect(sent.map((item) => item.payload)).toEqual([{ id: '1' }]);

    clock.advanceSeconds(backoffDelayMs(1, () => 0) / 1000);
    await engine.requestSync();
    expect(sent.map((item) => item.payload)).toEqual([{ id: '1' }, { id: '1' }, { id: '2' }]);
  });

  it('una excepción del handler se trata como reintentable', async () => {
    const { engine, add } = await setup(['throw']);
    await add('1');

    await engine.requestSync();

    expect((await engine.snapshot()).pending).toBe(1);
  });

  it('tras el máximo de intentos queda fallido y se puede reintentar', async () => {
    const { engine, add, sent } = await setup(['retry'], { maxAttempts: 1 });
    await add('1');

    await engine.requestSync();
    expect(await engine.snapshot()).toEqual({ pending: 0, failed: 1, attention: 0 });

    await engine.retryFailed();
    expect(sent).toHaveLength(2);
    expect(await engine.snapshot()).toEqual({ pending: 0, failed: 0, attention: 0 });
  });

  it('un tipo sin handler queda fallido sin bloquear al resto', async () => {
    const { engine, add, sent } = await setup();
    await add('1', 'desconocido');
    await add('2');

    await engine.requestSync();

    expect(sent.map((item) => item.payload)).toEqual([{ id: '2' }]);
    expect((await engine.snapshot()).failed).toBe(1);
  });

  it('las solicitudes concurrentes no envían dos veces', async () => {
    const { engine, add, sent } = await setup();
    await add('1');

    await Promise.all([engine.requestSync(), engine.requestSync(), engine.requestSync()]);

    expect(sent).toHaveLength(1);
  });

  it('al arrancar recupera lo que quedó en vuelo', async () => {
    const { engine, add, db, sent } = await setup();
    await add('1');
    await db.run("UPDATE outbox SET status = 'in_flight'");

    await engine.start();
    await engine.requestSync();

    expect(sent).toHaveLength(1);
  });

  it('se pueden descartar avisos de atención', async () => {
    const { engine, add } = await setup(['reject']);
    await add('1');
    await engine.requestSync();

    await engine.dismissAttention('att-1');

    expect(await engine.listAttention()).toEqual([]);
  });
});

describe('createSyncEngine · soporte', () => {
  it('lista la cola con su título, estado, intentos y último error', async () => {
    const { engine, add } = await setup(['offline']);
    await add('1');
    await add('2', 'desconocido');

    await engine.requestSync();
    await engine.requestSync();

    expect(await engine.listQueue()).toEqual([
      {
        id: '1',
        kind: 'test',
        aggregateId: 'agg-1',
        title: 'Registro agg-1',
        status: 'pending',
        attempts: 1,
        lastError: 'network',
        createdAt: '2026-10-12T15:00:00.000Z',
      },
      expect.objectContaining({ id: '2', title: 'desconocido', status: 'failed' }),
    ]);
  });

  it('sincronizar ahora no espera el backoff y reintenta lo fallido desde cero', async () => {
    const { engine, add, sent } = await setup(['retry', 'retry'], { maxAttempts: 1 });
    await add('1');
    await add('2');

    await engine.requestSync();
    await engine.requestSync();
    expect((await engine.snapshot()).failed).toBe(2);

    await engine.syncNow();

    expect(sent.map((item) => item.payload)).toEqual([
      { id: '1' },
      { id: '2' },
      { id: '1' },
      { id: '2' },
    ]);
    expect(await engine.listQueue()).toEqual([]);
  });

  it('sincroniza un solo registro sin tocar los demás', async () => {
    const { engine, add, sent } = await setup(['retry', 'retry']);
    await add('1');
    await add('2');
    await engine.requestSync();
    await engine.requestSync();
    sent.length = 0;

    await engine.syncItem('2');

    expect(sent.map((item) => item.payload)).toEqual([{ id: '2' }]);
    expect((await engine.listQueue()).map((item) => item.id)).toEqual(['1']);
  });

  it('reenvía un rechazo con su envío original y el registro vuelve a pendiente', async () => {
    const { engine, add, sent, onRequeued } = await setup(['reject', 'done']);
    await add('1');
    await engine.requestSync();

    await engine.resendAttention('att-1');

    expect(onRequeued).toHaveBeenCalledWith('agg-1');
    expect(sent.map((item) => item.payload)).toEqual([{ id: '1' }, { id: '1' }]);
    expect(await engine.listAttention()).toEqual([]);
    expect(await engine.snapshot()).toEqual({ pending: 0, failed: 0, attention: 0 });
  });

  it('un aviso sin envío guardado no se puede reenviar', async () => {
    const { engine, db, onRequeued } = await setup();
    await db.run(
      `INSERT INTO attention_items (id, kind, aggregate_id, title, reason, message, created_at)
       VALUES ('viejo', 'test', 'agg-1', 'Registro agg-1', 'X', NULL, '2026-10-01T00:00:00.000Z')`,
    );

    expect((await engine.listAttention())[0]?.canResend).toBe(false);
    await engine.resendAttention('viejo');

    expect(onRequeued).not.toHaveBeenCalled();
    expect(await engine.listAttention()).toHaveLength(1);
    expect(await engine.listQueue()).toEqual([]);
  });
});

describe('backoffDelayMs', () => {
  it('crece exponencialmente con un tope de 10 minutos', () => {
    const noJitter = () => 1;

    expect(backoffDelayMs(1, noJitter)).toBe(2_000);
    expect(backoffDelayMs(3, noJitter)).toBe(8_000);
    expect(backoffDelayMs(20, noJitter)).toBe(600_000);
  });

  it('el jitter reduce el retraso como máximo a la mitad', () => {
    expect(backoffDelayMs(3, () => 0)).toBe(4_000);
  });
});
