import type { UnitRejection, UnitValidationError } from '../../domain';
import { assertNever } from '@/shared/domain';
import { formatTime, STRINGS } from '@/shared/lib';

const { rejection: TEXT } = STRINGS.entry;

function describeUnit(rejection: UnitRejection, timeZone: string): string {
  const time = (iso: string) => formatTime(new Date(iso), timeZone);
  switch (rejection.type) {
    case 'VoucherNotFound':
      return TEXT.unit.VoucherNotFound(rejection.voucherCode);
    case 'VoucherInactive':
      return TEXT.unit.VoucherInactive(rejection.voucherCode);
    case 'PlateNotInVoucher':
      return TEXT.unit.PlateNotInVoucher(rejection.plate, rejection.voucherCode);
    case 'AlreadyEntered':
      return TEXT.unit.AlreadyEntered(rejection.plate, time(rejection.enteredAt));
    case 'OutsideEntryWindow':
      return TEXT.unit.OutsideEntryWindow(
        rejection.voucherCode,
        time(rejection.opensAt),
        time(rejection.closesAt),
      );
    default:
      return assertNever(rejection);
  }
}

export function describeValidationError(error: UnitValidationError, timeZone: string): string {
  switch (error.type) {
    case 'no-shift':
      return TEXT.noShift;
    case 'qr':
      return TEXT.qr[error.error.type];
    case 'unit':
      return describeUnit(error.rejection, timeZone);
    case 'server':
      return error.message;
    default:
      return assertNever(error);
  }
}
