import {
  admitUnit,
  checkQrValidity,
  checkVisitorAccess,
  isValidDocument,
  type AccessGatewayError,
  type AccessValidationGateway,
  type CheckedBy,
  type IdentifiedVehicle,
  type ServerVerdict,
  type UnitValidation,
  type UnitValidationError,
  type VehicleQr,
  type VehicleQrVerifier,
  type VisitorDocument,
  type VisitorValidation,
  type VisitorValidationError,
} from '../domain';
import {
  applyEntries,
  err,
  normalizePlate,
  ok,
  type Clock,
  type EntryLog,
  type Result,
  type ShiftReader,
  type ShiftSnapshot,
} from '@/shared/domain';

export type ValidationDeps = {
  readonly shift: ShiftReader;
  readonly entries: EntryLog;
  readonly verifier: VehicleQrVerifier;
  readonly gateway: AccessValidationGateway;
  readonly isOnline: () => Promise<boolean>;
  readonly clock: Clock;
};

// Verifica firma, vigencia y sede del QR contra el paquete del día con los ingresos locales
async function readVehicleQr(
  deps: ValidationDeps,
  token: string,
): Promise<Result<{ snapshot: ShiftSnapshot; qr: VehicleQr; now: Date }, UnitValidationError>> {
  const baseline = await deps.shift.current();
  if (!baseline) return err({ type: 'no-shift' });
  // Los ingresos confirmados offline todavía no están en el paquete del día
  const snapshot = applyEntries(baseline, await deps.entries.list());

  const now = deps.clock.now();
  const verified = deps.verifier.verify(token, snapshot.qrPublicKey);
  const qr = verified.ok
    ? checkQrValidity(verified.value, { now, siteId: snapshot.siteId })
    : verified;
  if (!qr.ok) return err({ type: 'qr', error: qr.error });
  return ok({ snapshot, qr: qr.value, now });
}

export const validateUnit =
  (deps: ValidationDeps) =>
  async (token: string): Promise<Result<UnitValidation, UnitValidationError>> => {
    const read = await readVehicleQr(deps, token);
    if (!read.ok) return read;
    const { snapshot, qr, now } = read.value;

    // Las reglas locales se aplican siempre: dan el motivo al instante y cubren el modo sin red
    const admission = admitUnit(snapshot, qr, now);
    if (!admission.ok) return err({ type: 'unit', rejection: admission.error });

    const checkedBy = await askServer(deps, () => deps.gateway.validateUnit(token));
    if (checkedBy.type === 'rejected') {
      return err({ type: 'server', reason: checkedBy.reason, message: checkedBy.message });
    }
    return ok({ ...admission.value, qr, checkedBy: checkedBy.type });
  };

// RF-F5: desde Inspecciones el QR solo identifica el vehículo, sin reglas de ingreso
export const identifyVehicle =
  (deps: ValidationDeps) =>
  async (token: string): Promise<Result<IdentifiedVehicle, UnitValidationError>> => {
    const read = await readVehicleQr(deps, token);
    if (!read.ok) return read;
    const { snapshot, qr } = read.value;
    const appointment = snapshot.appointments.find((item) => item.id === qr.appointmentId);
    if (!appointment) {
      return err({
        type: 'unit',
        rejection: { type: 'VoucherNotFound', voucherCode: qr.voucherCode },
      });
    }
    const vehicle = appointment.vehicles.find(
      (item) => normalizePlate(item.plate) === normalizePlate(qr.plate),
    );
    if (!vehicle) {
      return err({
        type: 'unit',
        rejection: { type: 'PlateNotInVoucher', plate: qr.plate, voucherCode: qr.voucherCode },
      });
    }
    return ok({ vehicleId: vehicle.id, plate: vehicle.plate, entered: vehicle.enteredAt !== null });
  };

export const validateVisitor =
  (deps: ValidationDeps) =>
  async (
    visitor: VisitorDocument & { readonly voucherId: string },
  ): Promise<Result<VisitorValidation, VisitorValidationError>> => {
    if (!isValidDocument(visitor.documentType, visitor.documentNumber)) {
      return err({ type: 'invalid-document' });
    }
    const snapshot = await deps.shift.current();
    if (!snapshot) return err({ type: 'no-shift' });

    if (!checkVisitorAccess(snapshot, visitor).ok)
      return err({ type: 'blacklisted', message: null });

    const checkedBy = await askServer(deps, () => deps.gateway.validateVisitor(visitor));
    if (checkedBy.type === 'rejected') {
      return err({ type: 'blacklisted', message: checkedBy.message });
    }
    return ok({ checkedBy: checkedBy.type });
  };

type ServerAnswer =
  | { readonly type: CheckedBy }
  | { readonly type: 'rejected'; readonly reason: string; readonly message: string };

// Con red manda el servidor; si no responde, vale la validación local
async function askServer(
  deps: ValidationDeps,
  call: () => Promise<Result<ServerVerdict, AccessGatewayError>>,
): Promise<ServerAnswer> {
  if (!(await deps.isOnline())) return { type: 'local' };
  const result = await call();
  if (!result.ok) return { type: 'local' };
  if (result.value.type === 'accepted') return { type: 'server' };
  return { type: 'rejected', reason: result.value.reason, message: result.value.message };
}
