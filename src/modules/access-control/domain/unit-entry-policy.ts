import type { VehicleQr } from './vehicle-qr';
import {
  err,
  normalizePlate,
  ok,
  type Result,
  type ShiftAppointment,
  type ShiftSnapshot,
  type ShiftVehicle,
  type ShiftVisitor,
} from '@/shared/domain';

const MINUTE_MS = 60_000;

// Mismos códigos que AccessScanRejectionReasonEnum del backend
export type UnitRejection =
  | { readonly type: 'VoucherNotFound'; readonly voucherCode: string }
  | { readonly type: 'VoucherInactive'; readonly voucherCode: string }
  | { readonly type: 'PlateNotInVoucher'; readonly plate: string; readonly voucherCode: string }
  | { readonly type: 'AlreadyEntered'; readonly plate: string; readonly enteredAt: string }
  | {
      readonly type: 'OutsideEntryWindow';
      readonly voucherCode: string;
      readonly opensAt: string;
      readonly closesAt: string;
    };

export type UnitAdmission = {
  readonly appointment: ShiftAppointment;
  readonly vehicle: ShiftVehicle;
  // late-arrival: la unidad ya ingresó y solo faltan visitantes
  readonly mode: 'entry' | 'late-arrival';
  readonly pendingVisitors: readonly ShiftVisitor[];
};

type QrUnit = Pick<VehicleQr, 'appointmentId' | 'voucherCode' | 'plate' | 'visitors'>;

export function entryWindow(appointment: ShiftAppointment) {
  // Con ingresos previos en el voucher la tolerancia no aplica: solo la hora fin
  const started = appointment.vehicles.some((vehicle) => vehicle.enteredAt !== null);
  if (started) return { opensAt: appointment.windowStart, closesAt: appointment.windowEnd };
  const closesAt = new Date(
    new Date(appointment.windowStart).getTime() + appointment.entryToleranceMinutes * MINUTE_MS,
  ).toISOString();
  return { opensAt: appointment.windowStart, closesAt };
}

export function admitUnit(
  snapshot: Pick<ShiftSnapshot, 'appointments'>,
  qr: QrUnit,
  now: Date,
): Result<UnitAdmission, UnitRejection> {
  const appointment = snapshot.appointments.find((candidate) => candidate.id === qr.appointmentId);
  if (!appointment) return err({ type: 'VoucherNotFound', voucherCode: qr.voucherCode });

  const plate = normalizePlate(qr.plate);
  const vehicle = appointment.vehicles.find(
    (candidate) => normalizePlate(candidate.plate) === plate,
  );
  if (!vehicle) {
    return err({ type: 'PlateNotInVoucher', plate: qr.plate, voucherCode: qr.voucherCode });
  }

  const pendingVisitors = qr.visitors.filter(
    (visitor) => !vehicle.enteredVisitorIds.includes(visitor.id),
  );
  if (vehicle.enteredAt) {
    if (pendingVisitors.length === 0) {
      return err({ type: 'AlreadyEntered', plate: vehicle.plate, enteredAt: vehicle.enteredAt });
    }
    return ok({ appointment, vehicle, mode: 'late-arrival', pendingVisitors });
  }

  if (!appointment.active) return err({ type: 'VoucherInactive', voucherCode: qr.voucherCode });

  const window = entryWindow(appointment);
  const time = now.getTime();
  if (time < new Date(window.opensAt).getTime() || time > new Date(window.closesAt).getTime()) {
    return err({ type: 'OutsideEntryWindow', voucherCode: qr.voucherCode, ...window });
  }
  return ok({ appointment, vehicle, mode: 'entry', pendingVisitors });
}
