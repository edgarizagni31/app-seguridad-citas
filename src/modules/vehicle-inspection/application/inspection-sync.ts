import {
  INSPECTION_OUTBOX_KIND,
  type ExecuteInspectionRequest,
  type InspectionGateway,
  type InspectionRepository,
  type PhotoStore,
  type StoredInspection,
} from '../domain';
import {
  err,
  ok,
  type HistorySource,
  type InspectionStatus,
  type OutboxHandler,
} from '@/shared/domain';
import { STRINGS } from '@/shared/lib';

// Las fotos nuevas se leen recién al enviar: nunca viven en base64 dentro del estado
async function readPhotos(photos: PhotoStore, request: ExecuteInspectionRequest) {
  const contents: Record<string, string> = {};
  for (const answer of request.answers) {
    const { photo } = answer;
    if (photo && !photo.remoteUrl) contents[photo.id] = await photos.readBase64(photo);
  }
  return contents;
}

export function createInspectionSyncHandler(deps: {
  readonly gateway: InspectionGateway;
  readonly repo: InspectionRepository;
  readonly photos: PhotoStore;
}): OutboxHandler {
  const requestOf = (payload: unknown) => payload as ExecuteInspectionRequest;

  return {
    kind: INSPECTION_OUTBOX_KIND,
    async send(item) {
      const request = requestOf(item.payload);
      const contents = await readPhotos(deps.photos, request);
      const result = await deps.gateway.execute(request, contents);
      if (!result.ok) return err({ type: 'retryable', cause: result.error.type });
      if (result.value.type === 'rejected') {
        return ok({
          type: 'rejected',
          reason: 'INSPECTION_REJECTED',
          message: result.value.message,
        });
      }
      const { compliant, nonCompliant } = result.value;
      await deps.repo.markSynced(request.inspectionId, { compliant, nonCompliant });
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
