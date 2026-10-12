import {
  INSPECTION_OUTBOX_KIND,
  type PhotoRef,
  type StoredInspection,
  type SubmitInspectionRequest,
} from '../domain';
import { err, ok, type OutboxItem } from '@/shared/domain';
import { createFakePhotoStore, createMemoryInspectionRepository } from '@/test/fakes/inspections';

import { createInspectionSyncHandler, inspectionHistoryFrom, statusOf } from './inspection-sync';

const photo = (id: string) => ({ id, hash: `hash-${id}` }) as PhotoRef;

const REQUEST: SubmitInspectionRequest = {
  inspectionId: 'insp-1',
  definitionVersion: 'v1',
  vehicleId: 'veh-mnp-456',
  appointmentId: 'apt-dollarcity',
  plate: 'MNP-456',
  inspectorId: 'user-ana',
  startedAt: '2026-10-05T17:00:00.000Z',
  finishedAt: '2026-10-05T17:10:00.000Z',
  result: 'COMPLETED',
  observation: '',
  answers: [],
  photos: [
    { stepId: 'front-photo', photo: photo('a') },
    { stepId: 'cabin-photo', photo: photo('b') },
    { stepId: 'waybill-photo', photo: photo('c') },
  ],
};

const item: OutboxItem = {
  id: 'out-1',
  kind: INSPECTION_OUTBOX_KIND,
  aggregateId: 'insp-1',
  payload: REQUEST,
  attempts: 0,
  createdAt: '2026-10-05T17:10:00.000Z',
};

const stored = (overrides: Partial<StoredInspection> = {}) =>
  ({
    id: 'insp-1',
    vehicleId: 'veh-mnp-456',
    plate: 'MNP-456',
    clientName: 'DOLLAR CITY',
    state: 'submitted',
    updatedAt: '2026-10-05T17:10:00.000Z',
    finishedAt: '2026-10-05T17:10:00.000Z',
    syncStatus: 'pending',
    syncMessage: null,
    uploadedPhotos: 0,
    ...overrides,
  }) as StoredInspection;

function setup(uploadedPhotos = 0) {
  const repo = createMemoryInspectionRepository([stored({ uploadedPhotos })]);
  const photos = createFakePhotoStore();
  const gateway = {
    uploadPhoto: jest.fn(async () => ok(undefined)),
    submit: jest.fn(async () => ok({ type: 'accepted' as const })),
  };
  return { repo, photos, gateway, handler: createInspectionSyncHandler({ gateway, repo, photos }) };
}

describe('createInspectionSyncHandler', () => {
  it('sube cada foto, registra la inspección y borra las fotos locales', async () => {
    const { handler, gateway, repo, photos } = setup();

    expect(await handler.send(item)).toEqual(ok({ type: 'done' }));

    expect(gateway.uploadPhoto).toHaveBeenCalledTimes(3);
    expect(repo.setUploadedPhotos).toHaveBeenLastCalledWith('insp-1', 3);
    const { photos: _, ...body } = REQUEST;
    expect(gateway.submit).toHaveBeenCalledWith(body, 'insp-1');
    expect(repo.markSynced).toHaveBeenCalledWith('insp-1');
    expect(photos.deleteAll).toHaveBeenCalledWith('insp-1');
  });

  it('retoma la subida desde la última foto confirmada', async () => {
    const { handler, gateway } = setup(2);

    await handler.send(item);

    expect(gateway.uploadPhoto).toHaveBeenCalledTimes(1);
    expect(gateway.uploadPhoto).toHaveBeenCalledWith(
      expect.objectContaining({ stepId: 'waybill-photo' }),
    );
  });

  it('si se corta la red a mitad, guarda el avance y se reintenta', async () => {
    const { handler, gateway, repo } = setup();
    gateway.uploadPhoto
      .mockResolvedValueOnce(ok(undefined))
      .mockResolvedValueOnce(err({ type: 'network' }) as never);

    expect(await handler.send(item)).toEqual(err({ type: 'retryable', cause: 'network' }));
    expect(repo.setUploadedPhotos).toHaveBeenCalledWith('insp-1', 1);
    expect(gateway.submit).not.toHaveBeenCalled();
  });

  it('un rechazo del servidor marca la inspección para atención', async () => {
    const { handler, gateway, repo, photos } = setup(3);
    gateway.submit.mockResolvedValueOnce(
      ok({
        type: 'rejected',
        reason: 'InspectionClosed',
        message: 'Ya fue inspeccionado.',
      }) as never,
    );

    expect(await handler.send(item)).toEqual(
      ok({ type: 'rejected', reason: 'InspectionClosed', message: 'Ya fue inspeccionado.' }),
    );
    await handler.onRejected?.(item, {
      type: 'rejected',
      reason: 'InspectionClosed',
      message: 'Ya fue inspeccionado.',
    });
    expect(repo.markRejected).toHaveBeenCalledWith('insp-1', 'Ya fue inspeccionado.');
    expect(photos.deleteAll).not.toHaveBeenCalled();
    expect(handler.describe(item)).toEqual({ title: 'Inspección MNP-456' });
  });

  it('si el registro falla por red es reintentable', async () => {
    const { handler, gateway } = setup(3);
    gateway.submit.mockResolvedValueOnce(err({ type: 'network' }) as never);

    expect(await handler.send(item)).toEqual(err({ type: 'retryable', cause: 'network' }));
  });
});

describe('createInspectionSyncHandler · casos límite', () => {
  it('sin registro local sube todas las fotos desde el principio', async () => {
    const repo = createMemoryInspectionRepository();
    const gateway = {
      uploadPhoto: jest.fn(async () => ok(undefined)),
      submit: jest.fn(async () => ok({ type: 'accepted' as const })),
    };
    const handler = createInspectionSyncHandler({ gateway, repo, photos: createFakePhotoStore() });

    expect(await handler.send(item)).toEqual(ok({ type: 'done' }));
    expect(gateway.uploadPhoto).toHaveBeenCalledTimes(3);
  });

  it('un rechazo sin mensaje guarda el código del motivo', async () => {
    const { handler, repo } = setup();

    await handler.onRejected?.(item, { type: 'rejected', reason: 'InspectionClosed' });

    expect(repo.markRejected).toHaveBeenCalledWith('insp-1', 'InspectionClosed');
  });
});

describe('statusOf / inspectionHistoryFrom', () => {
  it('traduce el estado local al estado de la lista HSE', () => {
    expect(statusOf(null)).toBeNull();
    expect(statusOf({ state: 'draft' })).toBe('in_progress');
    expect(statusOf({ state: 'submitted' })).toBe('inspected');
    expect(statusOf({ state: 'observed' })).toBe('observed');
  });

  it('el historial muestra solo las inspecciones cerradas', async () => {
    const repo = createMemoryInspectionRepository([
      stored(),
      stored({ id: 'insp-2', state: 'observed', syncStatus: 'synced' }),
      stored({ id: 'insp-3', state: 'draft' }),
      stored({ id: 'insp-4', vehicleId: 'veh-2', finishedAt: null, syncStatus: null }),
    ]);

    expect(await inspectionHistoryFrom(repo).list()).toEqual([
      expect.objectContaining({
        id: 'insp-1',
        subtitle: 'Inspeccionado · DOLLAR CITY',
        syncStatus: 'pending',
      }),
      expect.objectContaining({
        id: 'insp-2',
        subtitle: 'Observada · DOLLAR CITY',
        syncStatus: 'synced',
      }),
      // Sin fecha de cierre ni estado de envío, usa la última actualización y queda pendiente
      expect.objectContaining({
        id: 'insp-4',
        occurredAt: '2026-10-05T17:10:00.000Z',
        syncStatus: 'pending',
      }),
    ]);
  });
});
