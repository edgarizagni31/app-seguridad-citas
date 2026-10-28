import {
  companionItems,
  pedestrianConfirmRequest,
  recordPerson,
  recordUnit,
  vehicleConfirmRequest,
  type GateAppointment,
  type GateEntryConfirmation,
  type GateGatewayError,
  type GatePresentationGateway,
  type GateSession,
  type NothingToConfirm,
  type PresentationItem,
  type PresentationResult,
} from '../domain';
import { err, ok, type Result } from '@/shared/domain';

export type GateDeps = {
  readonly gateway: GatePresentationGateway;
  readonly isOnline: () => Promise<boolean>;
};

export type GateError = { readonly type: 'offline' } | GateGatewayError;

export type LookupError = GateError | { readonly type: 'not-found'; readonly message: string };

export type PresentError =
  GateError | { readonly type: 'not-presented'; readonly reason: string; readonly message: string };

export type ConfirmGateError = GateError | NothingToConfirm;

export type RejectedCompanion = { readonly personId: string; readonly message: string };

export type GateEntryOutcome = {
  readonly confirmation: GateEntryConfirmation;
  readonly rejectedCompanions: readonly RejectedCompanion[];
};

const OFFLINE = { type: 'offline' } as const;

export const lookupAppointment =
  (deps: GateDeps) =>
  async (qrCode: string): Promise<Result<GateAppointment, LookupError>> => {
    if (!(await deps.isOnline())) return err(OFFLINE);
    const result = await deps.gateway.lookup(qrCode.trim());
    if (!result.ok) return result;
    if (!result.value.found) return err({ type: 'not-found', message: result.value.message });
    return ok(result.value.appointment);
  };

// Registra un único item y devuelve su resultado, o el motivo del rechazo
async function registerOne(
  deps: GateDeps,
  voucherId: string,
  item: PresentationItem,
): Promise<Result<Extract<PresentationResult, { registered: true }>, PresentError>> {
  if (!(await deps.isOnline())) return err(OFFLINE);
  const result = await deps.gateway.register(voucherId, [item]);
  if (!result.ok) return result;
  const [first] = result.value;
  if (!first) return err({ type: 'unknown' });
  if (!first.registered) {
    return err({ type: 'not-presented', reason: first.reason, message: first.message });
  }
  return ok(first);
}

export const presentUnit =
  (deps: GateDeps) =>
  async (
    session: GateSession,
    unitId: string,
    driverDocument: string | null,
  ): Promise<Result<GateSession, PresentError>> => {
    const document = driverDocument?.trim() || null;
    const result = await registerOne(deps, session.appointment.voucherId, {
      mode: 'vehicular',
      unitId,
      driverDocument: document,
    });
    if (!result.ok) return result;
    if (!result.value.unitAccessId) return err({ type: 'unknown' });
    return ok(
      recordUnit(session, unitId, {
        unitAccessId: result.value.unitAccessId,
        driverAccessId: result.value.personAccessId,
      }),
    );
  };

export const presentPerson =
  (deps: GateDeps) =>
  async (session: GateSession, personId: string): Promise<Result<GateSession, PresentError>> => {
    const result = await registerOne(deps, session.appointment.voucherId, {
      mode: 'pedestrian',
      personId,
    });
    if (!result.ok) return result;
    if (!result.value.personAccessId) return err({ type: 'unknown' });
    return ok(recordPerson(session, personId, result.value.personAccessId));
  };

// Los acompañantes se presentan justo antes de confirmar; un rechazo no frena al resto
async function presentCompanions(deps: GateDeps, session: GateSession) {
  const items = companionItems(session);
  if (items.length === 0) return ok({ accessIds: [], rejected: [] });
  const result = await deps.gateway.register(session.appointment.voucherId, items);
  if (!result.ok) return result;

  const accessIds: string[] = [];
  const rejected: RejectedCompanion[] = [];
  items.forEach((item, index) => {
    const outcome = result.value[index];
    if (outcome?.registered && outcome.personAccessId) accessIds.push(outcome.personAccessId);
    else rejected.push({ personId: item.personId, message: outcome?.message ?? '' });
  });
  return ok({ accessIds, rejected });
}

export const confirmVehicleEntry =
  (deps: GateDeps) =>
  async (session: GateSession): Promise<Result<GateEntryOutcome, ConfirmGateError>> => {
    if (!(await deps.isOnline())) return err(OFFLINE);
    const companions = await presentCompanions(deps, session);
    if (!companions.ok) return companions;

    const request = vehicleConfirmRequest(session, companions.value.accessIds);
    if (!request.ok) return request;
    const confirmed = await deps.gateway.confirm(request.value);
    if (!confirmed.ok) return confirmed;
    return ok({ confirmation: confirmed.value, rejectedCompanions: companions.value.rejected });
  };

export const confirmPedestrianEntry =
  (deps: GateDeps) =>
  async (session: GateSession): Promise<Result<GateEntryOutcome, ConfirmGateError>> => {
    if (!(await deps.isOnline())) return err(OFFLINE);
    const request = pedestrianConfirmRequest(session);
    if (!request.ok) return request;
    const confirmed = await deps.gateway.confirm(request.value);
    if (!confirmed.ok) return confirmed;
    return ok({ confirmation: confirmed.value, rejectedCompanions: [] });
  };
