import type { UnitValidation } from './access-validation';
import {
  err,
  normalizeDocument,
  ok,
  type DocumentType,
  type Result,
  type ShiftVisitor,
  type VisitorRole,
} from '@/shared/domain';

export type ArrivalStatus = 'pending' | 'arrived' | 'not_arrived';

export type EntryVisitor = ShiftVisitor & {
  readonly status: ArrivalStatus;
  readonly added: boolean;
  // Ya ingresó en una confirmación anterior: se muestra bloqueado
  readonly enteredAt: string | null;
  readonly blockedReason: string | null;
};

export type EntryDraft = {
  readonly mode: UnitValidation['mode'];
  readonly appointmentId: string;
  readonly voucherId: string;
  readonly voucherCode: string;
  readonly clientName: string;
  readonly carrierName: string;
  readonly windowStart: string;
  readonly windowEnd: string;
  readonly vehicleId: string;
  readonly plate: string;
  readonly visitors: readonly EntryVisitor[];
};

export type NewVisitor = {
  readonly id: string;
  readonly name: string;
  readonly documentType: DocumentType;
  readonly documentNumber: string;
  readonly role: VisitorRole;
};

export type EntryError =
  | { readonly type: 'duplicate-document' }
  | { readonly type: 'locked-visitor' }
  | { readonly type: 'blocked-visitor' }
  | { readonly type: 'incomplete' };

export function startDraft(validation: UnitValidation): EntryDraft {
  const { appointment, vehicle, qr } = validation;
  return {
    mode: validation.mode,
    appointmentId: appointment.id,
    voucherId: appointment.voucherId,
    voucherCode: appointment.voucherCode,
    clientName: appointment.clientName,
    carrierName: appointment.carrierName,
    windowStart: appointment.windowStart,
    windowEnd: appointment.windowEnd,
    vehicleId: vehicle.id,
    plate: vehicle.plate,
    visitors: qr.visitors.map((visitor) => {
      const entered = vehicle.enteredVisitorIds.includes(visitor.id);
      return {
        ...visitor,
        status: entered ? 'arrived' : 'pending',
        added: false,
        enteredAt: entered ? vehicle.enteredAt : null,
        blockedReason: null,
      };
    }),
  };
}

const isOpen = (visitor: EntryVisitor) => visitor.enteredAt === null;

const updateVisitor = (
  draft: EntryDraft,
  visitorId: string,
  change: (visitor: EntryVisitor) => Result<EntryVisitor, EntryError>,
): Result<EntryDraft, EntryError> => {
  const target = draft.visitors.find((visitor) => visitor.id === visitorId);
  if (!target) return ok(draft);
  const next = change(target);
  if (!next.ok) return next;
  return ok({
    ...draft,
    visitors: draft.visitors.map((visitor) => (visitor.id === visitorId ? next.value : visitor)),
  });
};

export const markVisitor = (draft: EntryDraft, visitorId: string, status: ArrivalStatus) =>
  updateVisitor(draft, visitorId, (visitor) => {
    if (!isOpen(visitor)) return err({ type: 'locked-visitor' });
    if (visitor.blockedReason && status === 'arrived') return err({ type: 'blocked-visitor' });
    return ok({ ...visitor, status });
  });

// En lista negra: no puede marcarse "Llegó" y queda como "No llegó"
export const blockVisitor = (draft: EntryDraft, visitorId: string, reason: string) =>
  updateVisitor(draft, visitorId, (visitor) =>
    ok({ ...visitor, status: 'not_arrived', blockedReason: reason }),
  );

export function addVisitor(draft: EntryDraft, visitor: NewVisitor): Result<EntryDraft, EntryError> {
  const document = normalizeDocument(visitor.documentNumber);
  const duplicated = draft.visitors.some(
    (existing) =>
      existing.documentType === visitor.documentType &&
      normalizeDocument(existing.documentNumber) === document,
  );
  if (duplicated) return err({ type: 'duplicate-document' });
  return ok({
    ...draft,
    visitors: [
      ...draft.visitors,
      {
        ...visitor,
        name: visitor.name.trim(),
        documentNumber: visitor.documentNumber.trim().toUpperCase(),
        status: 'arrived',
        added: true,
        enteredAt: null,
        blockedReason: null,
      },
    ],
  });
}

export function entrySummary(draft: EntryDraft) {
  const open = draft.visitors.filter(isOpen);
  const entering = open.filter((visitor) => visitor.status === 'arrived').length;
  const notArriving = open.filter((visitor) => visitor.status === 'not_arrived').length;
  const pending = open.length - entering - notArriving;
  // Todos marcados y al menos uno ingresa
  return { entering, notArriving, pending, canConfirm: pending === 0 && entering > 0 };
}

export type VehicleEntryRecord = {
  readonly id: string;
  readonly mode: EntryDraft['mode'];
  readonly appointmentId: string;
  readonly voucherId: string;
  readonly vehicleId: string;
  readonly plate: string;
  readonly carrierName: string;
  readonly confirmedAt: string;
  readonly visitors: readonly EntryVisitor[];
};

export function confirmDraft(
  draft: EntryDraft,
  context: { readonly id: string; readonly now: Date },
): Result<VehicleEntryRecord, EntryError> {
  if (!entrySummary(draft).canConfirm) return err({ type: 'incomplete' });
  return ok({
    id: context.id,
    mode: draft.mode,
    appointmentId: draft.appointmentId,
    voucherId: draft.voucherId,
    vehicleId: draft.vehicleId,
    plate: draft.plate,
    carrierName: draft.carrierName,
    confirmedAt: context.now.toISOString(),
    visitors: draft.visitors.filter(isOpen),
  });
}

export const arrivedVisitorIds = (record: Pick<VehicleEntryRecord, 'visitors'>) =>
  record.visitors.filter((visitor) => visitor.status === 'arrived').map((visitor) => visitor.id);
