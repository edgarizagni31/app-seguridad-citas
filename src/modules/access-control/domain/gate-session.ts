import {
  DOCUMENT_STATUS,
  type ConfirmGateEntryRequest,
  type GateEntryConfirmation,
  type GateGatewayError,
  type GateAppointment,
  type GateDocument,
  type GatePerson,
  type GateUnit,
  type PresentationItem,
} from './gate-presentation';
import { err, normalizeDocument, normalizePlate, ok, type Result } from '@/shared/domain';

export type GateMode = 'vehicular' | 'pedestrian';

export type PresentedUnit = {
  readonly unitAccessId: string;
  readonly driverAccessId: string | null;
};

// Lo presentado vive solo en la sesión: el backend no devuelve el estado de llegada
export type GateSession = {
  readonly appointment: GateAppointment;
  readonly mode: GateMode | null;
  readonly presentedUnits: Readonly<Record<string, PresentedUnit>>;
  readonly presentedPeople: Readonly<Record<string, string>>;
  readonly arrivedCompanions: readonly string[];
};

export type DocumentCheck = 'valid' | 'expired' | 'rejected' | 'pending';

export const startSession = (appointment: GateAppointment): GateSession => ({
  appointment,
  mode: null,
  presentedUnits: {},
  presentedPeople: {},
  arrivedCompanions: [],
});

export const chooseMode = (session: GateSession, mode: GateMode): GateSession => ({
  ...session,
  mode,
});

export const recordUnit = (
  session: GateSession,
  unitId: string,
  presented: PresentedUnit,
): GateSession => ({
  ...session,
  presentedUnits: { ...session.presentedUnits, [unitId]: presented },
});

export const recordPerson = (
  session: GateSession,
  personId: string,
  accessId: string,
): GateSession => ({
  ...session,
  presentedPeople: { ...session.presentedPeople, [personId]: accessId },
});

export const markCompanion = (
  session: GateSession,
  personId: string,
  arrived: boolean,
): GateSession => {
  const others = session.arrivedCompanions.filter((id) => id !== personId);
  return { ...session, arrivedCompanions: arrived ? [...others, personId] : others };
};

const driverIds = (appointment: GateAppointment) =>
  new Set(appointment.units.flatMap((unit) => (unit.driver ? [unit.driver.personId] : [])));

// Conductores de la cita: los que la unidad nomina o los marcados como tal
export function isDriver(appointment: GateAppointment, person: GatePerson) {
  return person.isConductor || driverIds(appointment).has(person.id);
}

export const nonDrivers = (appointment: GateAppointment) =>
  appointment.people.filter((person) => !isDriver(appointment, person));

export const driverOf = (appointment: GateAppointment, unit: GateUnit) =>
  unit.driver
    ? (appointment.people.find((person) => person.id === unit.driver?.personId) ?? null)
    : null;

export const availableModes = (appointment: GateAppointment) => ({
  vehicular: appointment.units.length > 0,
  pedestrian: nonDrivers(appointment).length > 0,
});

export const unitNumber = (appointment: GateAppointment, unitId: string) =>
  appointment.units.findIndex((unit) => unit.id === unitId) + 1;

export function matchesUnit(unit: GateUnit, query: string) {
  const term = normalizePlate(query);
  return term === '' || unit.normalizedPlate.includes(term);
}

export function matchesPerson(person: GatePerson, query: string) {
  const text = query.trim().toLowerCase();
  if (text === '') return true;
  const document = normalizeDocument(text);
  return (
    person.name.toLowerCase().includes(text) ||
    (document !== '' && normalizeDocument(person.documentNumber ?? '').includes(document))
  );
}

// Los archivados son versiones históricas: en garita solo se ve el documento vigente
export const visibleDocuments = (documents: readonly GateDocument[]) =>
  documents.filter((document) => document.status !== DOCUMENT_STATUS.archived);

// ✓ solo si está vigente (status 3) y no venció; las alertas informan, no bloquean
export function checkDocument(document: GateDocument, now: Date): DocumentCheck {
  if (document.status === DOCUMENT_STATUS.rejected) return 'rejected';
  const expired =
    document.status === DOCUMENT_STATUS.expired ||
    (document.expiresAt !== null && new Date(document.expiresAt).getTime() < now.getTime());
  if (expired) return 'expired';
  return document.status === DOCUMENT_STATUS.valid ? 'valid' : 'pending';
}

export const presentedUnitCount = (session: GateSession) =>
  Object.keys(session.presentedUnits).length;

export const presentedPeopleCount = (session: GateSession) =>
  Object.keys(session.presentedPeople).length;

type PedestrianItem = Extract<PresentationItem, { mode: 'pedestrian' }>;

export const companionItems = (session: GateSession): PedestrianItem[] =>
  session.arrivedCompanions.map((personId) => ({ mode: 'pedestrian', personId }));

export type NothingToConfirm = { readonly type: 'nothing-to-confirm' };

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

const unique = (ids: readonly string[]) => [...new Set(ids)];

// Siempre con ids explícitos: una lista vacía el backend la toma como «todas las pendientes»
export function vehicleConfirmRequest(
  session: GateSession,
  companionAccessIds: readonly string[],
): Result<ConfirmGateEntryRequest, NothingToConfirm> {
  const units = Object.values(session.presentedUnits);
  if (units.length === 0) return err({ type: 'nothing-to-confirm' });
  const drivers = units.flatMap((unit) => (unit.driverAccessId ? [unit.driverAccessId] : []));
  return ok({
    voucherId: session.appointment.voucherId,
    unitAccessIds: unique(units.map((unit) => unit.unitAccessId)),
    personAccessIds: unique([...drivers, ...companionAccessIds]),
  });
}

export function pedestrianConfirmRequest(
  session: GateSession,
): Result<ConfirmGateEntryRequest, NothingToConfirm> {
  const people = Object.values(session.presentedPeople);
  if (people.length === 0) return err({ type: 'nothing-to-confirm' });
  return ok({
    voucherId: session.appointment.voucherId,
    unitAccessIds: [],
    personAccessIds: unique(people),
  });
}
