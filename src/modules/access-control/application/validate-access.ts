import {
  admitUnit,
  checkQrValidity,
  checkVisitorAccess,
  isValidDocument,
  type AccessGatewayError,
  type AccessValidationGateway,
  type CheckedBy,
  type ServerVerdict,
  type UnitValidation,
  type UnitValidationError,
  type VehicleQrVerifier,
  type VisitorDocument,
  type VisitorValidation,
  type VisitorValidationError,
} from '../domain';
import { err, ok, type Clock, type Result, type ShiftReader } from '@/shared/domain';

export type ValidationDeps = {
  readonly shift: ShiftReader;
  readonly verifier: VehicleQrVerifier;
  readonly gateway: AccessValidationGateway;
  readonly isOnline: () => Promise<boolean>;
  readonly clock: Clock;
};

export const validateUnit =
  (deps: ValidationDeps) =>
  async (token: string): Promise<Result<UnitValidation, UnitValidationError>> => {
    const snapshot = await deps.shift.current();
    if (!snapshot) return err({ type: 'no-shift' });

    const now = deps.clock.now();
    const verified = deps.verifier.verify(token, snapshot.qrPublicKey);
    const qr = verified.ok
      ? checkQrValidity(verified.value, { now, siteId: snapshot.siteId })
      : verified;
    if (!qr.ok) return err({ type: 'qr', error: qr.error });

    // Las reglas locales se aplican siempre: dan el motivo al instante y cubren el modo sin red
    const admission = admitUnit(snapshot, qr.value, now);
    if (!admission.ok) return err({ type: 'unit', rejection: admission.error });

    const checkedBy = await askServer(deps, () => deps.gateway.validateUnit(token));
    if (checkedBy.type === 'rejected') {
      return err({ type: 'server', reason: checkedBy.reason, message: checkedBy.message });
    }
    return ok({ ...admission.value, qr: qr.value, checkedBy: checkedBy.type });
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
