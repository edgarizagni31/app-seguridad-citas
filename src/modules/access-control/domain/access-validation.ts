import type { UnitAdmission, UnitRejection } from './unit-entry-policy';
import type { VehicleQr, VehicleQrError } from './vehicle-qr';

// local: sin red se decidió solo con el paquete del día; el servidor puede rechazar después
export type CheckedBy = 'server' | 'local';

export type UnitValidation = UnitAdmission & {
  readonly qr: VehicleQr;
  readonly checkedBy: CheckedBy;
};

export type UnitValidationError =
  | { readonly type: 'no-shift' }
  | { readonly type: 'qr'; readonly error: VehicleQrError }
  | { readonly type: 'unit'; readonly rejection: UnitRejection }
  | { readonly type: 'server'; readonly reason: string; readonly message: string };

export type VisitorValidation = { readonly checkedBy: CheckedBy };

export type VisitorValidationError =
  | { readonly type: 'no-shift' }
  | { readonly type: 'invalid-document' }
  | { readonly type: 'blacklisted'; readonly message: string | null };

export type IdentifiedVehicle = {
  readonly vehicleId: string;
  readonly plate: string;
  readonly entered: boolean;
};
