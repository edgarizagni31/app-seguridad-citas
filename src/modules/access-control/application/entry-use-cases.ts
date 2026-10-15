import {
  confirmDraft,
  ENTRY_OUTBOX_KIND,
  toConfirmEntryRequest,
  type AccessValidationGateway,
  type ConfirmEntryRequest,
  type EntryDraft,
  type ConfirmEntryError,
  type EntryRepository,
  type VehicleEntryRecord,
} from '../domain';
import {
  err,
  ok,
  type Clock,
  type EntryLog,
  type HistorySource,
  type Logger,
  type OutboxHandler,
  type Result,
} from '@/shared/domain';
import { STRINGS } from '@/shared/lib';

export type EntryDeps = {
  readonly repo: EntryRepository;
  readonly clock: Clock;
  readonly createId: () => string;
  readonly requestSync: () => Promise<void>;
  readonly logger: Logger;
};

export const confirmEntry =
  (deps: EntryDeps) =>
  async (draft: EntryDraft): Promise<Result<VehicleEntryRecord, ConfirmEntryError>> => {
    const record = confirmDraft(draft, { id: deps.createId(), now: deps.clock.now() });
    if (!record.ok) return record;
    try {
      await deps.repo.saveConfirmed(record.value, toConfirmEntryRequest(record.value));
    } catch (cause) {
      deps.logger.error('No se pudo guardar el ingreso', { error: String(cause) });
      return err({ type: 'storage' });
    }
    // El envío no bloquea: el ingreso ya quedó guardado y en la outbox
    void deps.requestSync();
    return ok(record.value);
  };

// Un ingreso rechazado por el servidor no cuenta como ingresado
export const entryLogFrom = (repo: EntryRepository): EntryLog => ({
  tables: repo.tables,
  async list() {
    const entries = await repo.list();
    return entries
      .filter((entry) => entry.syncStatus !== 'rejected')
      .map((entry) => ({
        vehicleId: entry.vehicleId,
        enteredAt: entry.confirmedAt,
        visitorIds: entry.arrivedVisitorIds,
      }));
  },
});

export const entryHistoryFrom = (repo: EntryRepository): HistorySource => ({
  tables: repo.tables,
  async list() {
    const entries = await repo.list();
    return entries.map((entry) => ({
      id: entry.id,
      kind: 'entry' as const,
      title: entry.plate,
      subtitle: STRINGS.entry.historySubtitle(entry.entering, entry.notArriving),
      occurredAt: entry.confirmedAt,
      syncStatus: entry.syncStatus,
    }));
  },
});

export function createEntrySyncHandler(deps: {
  readonly gateway: AccessValidationGateway;
  readonly repo: EntryRepository;
}): OutboxHandler {
  const requestOf = (payload: unknown) => payload as ConfirmEntryRequest;

  return {
    kind: ENTRY_OUTBOX_KIND,
    async send(item) {
      const request = requestOf(item.payload);
      const result = await deps.gateway.confirmEntry(request, item.aggregateId);
      if (!result.ok) return err({ type: 'retryable', cause: result.error.type });
      if (result.value.type === 'rejected') {
        return ok({ type: 'rejected', reason: result.value.reason, message: result.value.message });
      }
      await deps.repo.markSynced(request.entryId);
      return ok({ type: 'done' });
    },
    describe(item) {
      return { title: STRINGS.entry.attentionTitle(requestOf(item.payload).plate) };
    },
    async onRejected(item, outcome) {
      await deps.repo.markRejected(item.aggregateId, outcome.message ?? outcome.reason);
    },
    onRequeued: (aggregateId) => deps.repo.markPending(aggregateId),
  };
}
