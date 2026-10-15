import {
  INSPECTION_OUTBOX_KIND,
  type InspectionGateway,
  type InspectionRepository,
  type PhotoStore,
  type StoredInspection,
  type SubmitInspectionRequest,
} from '../domain';
import {
  err,
  ok,
  type HistorySource,
  type InspectionStatus,
  type OutboxHandler,
} from '@/shared/domain';
import { STRINGS } from '@/shared/lib';

export function createInspectionSyncHandler(deps: {
  readonly gateway: InspectionGateway;
  readonly repo: InspectionRepository;
  readonly photos: PhotoStore;
}): OutboxHandler {
  const requestOf = (payload: unknown) => payload as SubmitInspectionRequest;

  return {
    kind: INSPECTION_OUTBOX_KIND,
    async send(item) {
      const { photos, ...request } = requestOf(item.payload);
      const stored = await deps.repo.findById(request.inspectionId);
      // Retoma la subida donde quedó: el servidor es idempotente por hash
      const start = stored?.uploadedPhotos ?? 0;
      for (const [offset, pending] of photos.slice(start).entries()) {
        const uploaded = await deps.gateway.uploadPhoto({
          inspectionId: request.inspectionId,
          stepId: pending.stepId,
          photo: pending.photo,
        });
        if (!uploaded.ok) return err({ type: 'retryable', cause: uploaded.error.type });
        await deps.repo.setUploadedPhotos(request.inspectionId, start + offset + 1);
      }

      const result = await deps.gateway.submit(request, item.aggregateId);
      if (!result.ok) return err({ type: 'retryable', cause: result.error.type });
      if (result.value.type === 'rejected') {
        return ok({ type: 'rejected', reason: result.value.reason, message: result.value.message });
      }
      await deps.repo.markSynced(request.inspectionId);
      // RF-I2: con el servidor de acuerdo, las fotos ya no se guardan en el teléfono
      await deps.photos.deleteAll(request.inspectionId);
      return ok({ type: 'done' });
    },
    describe(item) {
      return { title: STRINGS.inspection.attentionTitle(requestOf(item.payload).plate) };
    },
    async onRejected(item, outcome) {
      await deps.repo.markRejected(item.aggregateId, outcome.message ?? outcome.reason);
    },
    onRequeued: (aggregateId) => deps.repo.markPending(aggregateId),
  };
}

export function statusOf(
  inspection: Pick<StoredInspection, 'state'> | null,
): InspectionStatus | null {
  if (!inspection) return null;
  if (inspection.state === 'draft') return 'in_progress';
  return inspection.state === 'observed' ? 'observed' : 'inspected';
}

export const inspectionHistoryFrom = (repo: InspectionRepository): HistorySource => ({
  tables: repo.tables,
  async list() {
    const inspections = await repo.list();
    return inspections
      .filter((inspection) => inspection.state !== 'draft')
      .map((inspection) => ({
        id: inspection.id,
        kind: 'inspection' as const,
        title: inspection.plate,
        subtitle: STRINGS.inspection.historySubtitle(
          inspection.state === 'observed',
          inspection.clientName,
        ),
        occurredAt: inspection.finishedAt ?? inspection.updatedAt,
        syncStatus: inspection.syncStatus ?? 'pending',
      }));
  },
});
