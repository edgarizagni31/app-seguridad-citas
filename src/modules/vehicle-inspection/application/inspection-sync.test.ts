import {
  INSPECTION_OUTBOX_KIND,
  startInspection,
  toExecuteRequest,
  type ExecuteInspectionRequest,
  type InspectionGateway,
  type PhotoRef,
} from '../domain';
import { buildDemoProtocol } from '../infrastructure/demo-protocol';
import { err, ok, type OutboxItem } from '@/shared/domain';
import {
  createFakePhotoStore,
  createMemoryInspectionRepository,
  TEST_TARGET,
} from '@/test/fakes/inspections';

import { createInspectionSyncHandler, inspectionHistoryFrom, statusOf } from './inspection-sync';

const NOW = new Date('2026-10-29T15:00:00Z');
const local = { id: 'ph-1', uri: 'file:///a.jpg', hash: 'h1', takenAt: 't' } as PhotoRef;
const remote = { id: 'ph-2', uri: 'https://s3/b.jpg', remoteUrl: 'https://s3/b.jpg' } as PhotoRef;

const REQUEST: ExecuteInspectionRequest = {
  inspectionId: 'insp-1',
  protocolId: 'p-1',
  voucherId: 'voucher-1',
  unitId: 'vtu-1',
  plate: 'ABC-123',
  observation: null,
  answers: [
    { questionId: 'q1', status: 'ANSWERED', optionId: 'o1', photo: null },
    { questionId: 'q2', status: 'ANSWERED', optionId: null, photo: local },
    { questionId: 'q3', status: 'ANSWERED', optionId: null, photo: remote },
  ],
};

const item = (payload: ExecuteInspectionRequest = REQUEST): OutboxItem => ({
  id: 'out-1',
  kind: INSPECTION_OUTBOX_KIND,
  aggregateId: payload.inspectionId,
  payload,
  attempts: 0,
  createdAt: NOW.toISOString(),
});

function setup(execute: InspectionGateway['execute']) {
  const repo = createMemoryInspectionRepository();
  const photos = createFakePhotoStore();
  const gateway = { getProtocol: jest.fn(), execute: jest.fn(execute) };
  const handler = createInspectionSyncHandler({ gateway, repo, photos });
  return { repo, photos, gateway, handler };
}

describe('createInspectionSyncHandler', () => {
  it('envía las fotos nuevas en base64 (no las ya subidas), guarda el veredicto y borra las fotos', async () => {
    const { handler, gateway, repo, photos } = setup(async () =>
      ok({ type: 'accepted', compliant: false, nonCompliant: ['Precinto: No'] }),
    );

    const outcome = await handler.send(item());

    expect(photos.readBase64).toHaveBeenCalledTimes(1);
    expect(gateway.execute).toHaveBeenCalledWith(REQUEST, { 'ph-1': 'base64-ph-1' });
    expect(repo.markSynced).toHaveBeenCalledWith('insp-1', {
      compliant: false,
      nonCompliant: ['Precinto: No'],
    });
    expect(photos.deleteAll).toHaveBeenCalledWith('insp-1');
    expect(outcome).toEqual(ok({ type: 'done' }));
  });

  it('sin red o con error del servidor se reintenta después', async () => {
    const { handler, repo } = setup(async () => err({ type: 'network' as const }));

    expect(await handler.send(item())).toEqual(err({ type: 'retryable', cause: 'network' }));
    expect(repo.markSynced).not.toHaveBeenCalled();
  });

  it('un rechazo del servidor va a «Requiere atención» con su mensaje', async () => {
    const { handler, repo } = setup(async () =>
      ok({ type: 'rejected' as const, message: 'La foto supera el tamaño máximo.' }),
    );

    const outcome = await handler.send(item());
    expect(outcome).toEqual(
      ok({
        type: 'rejected',
        reason: 'INSPECTION_REJECTED',
        message: 'La foto supera el tamaño máximo.',
      }),
    );
    await handler.onRejected?.(item(), {
      type: 'rejected',
      reason: 'INSPECTION_REJECTED',
      message: 'La foto supera el tamaño máximo.',
    });
    await handler.onRejected?.(item(), { type: 'rejected', reason: 'INSPECTION_REJECTED' });

    expect(repo.markRejected).toHaveBeenCalledWith('insp-1', 'La foto supera el tamaño máximo.');
    expect(repo.markRejected).toHaveBeenLastCalledWith('insp-1', 'INSPECTION_REJECTED');
  });

  it('se titula con la placa y al reenviarlo desde soporte vuelve a pendiente', async () => {
    const { handler, repo } = setup(async () =>
      ok({ type: 'accepted', compliant: true, nonCompliant: [] }),
    );

    expect(handler.describe(item())).toEqual({ title: 'Inspección ABC-123' });
    await handler.onRequeued?.('insp-1');

    expect(repo.markPending).toHaveBeenCalledWith('insp-1');
  });
});

describe('statusOf / inspectionHistoryFrom', () => {
  it('traduce el estado de la inspección', () => {
    expect(statusOf(null)).toBeNull();
    expect(statusOf({ state: 'draft' })).toBe('in_progress');
    expect(statusOf({ state: 'submitted' })).toBe('inspected');
    expect(statusOf({ state: 'observed' })).toBe('observed');
  });

  it('el historial muestra solo las inspecciones cerradas', async () => {
    const draft = startInspection(
      { ...TEST_TARGET, id: 'insp-1', inspectorId: 'u', inspectorName: 'Ana' },
      buildDemoProtocol(),
      NOW,
    );
    const repo = createMemoryInspectionRepository([
      { ...draft, syncStatus: null, syncMessage: null, verdict: null },
      {
        ...draft,
        id: 'insp-2',
        state: 'observed',
        finishedAt: NOW.toISOString(),
        syncStatus: 'synced',
        syncMessage: null,
        verdict: null,
      },
      {
        ...draft,
        id: 'insp-3',
        state: 'submitted',
        syncStatus: null,
        syncMessage: null,
        verdict: null,
      },
    ]);

    const history = await inspectionHistoryFrom(repo).list();

    expect(history).toEqual([
      expect.objectContaining({ id: 'insp-2', title: 'ABC-123', syncStatus: 'synced' }),
      expect.objectContaining({
        id: 'insp-3',
        syncStatus: 'pending',
        occurredAt: NOW.toISOString(),
      }),
    ]);
    expect(toExecuteRequest(draft).plate).toBe('ABC-123');
  });
});
