import { err, ok, type Result, type ShiftVisitor } from '@/shared/domain';

// Contenido verificado del QR firmado de un vehículo (ver ADR 0005)
export type VehicleQr = {
  readonly tokenId: string;
  readonly siteId: string;
  readonly appointmentId: string;
  readonly voucherId: string;
  readonly voucherCode: string;
  readonly plate: string;
  readonly issuedAt: Date;
  readonly expiresAt: Date;
  readonly notBefore: Date | null;
  readonly visitors: readonly ShiftVisitor[];
};

export type VehicleQrError =
  | { readonly type: 'InvalidFormat' }
  | { readonly type: 'InvalidSignature' }
  | { readonly type: 'Expired' }
  | { readonly type: 'NotYetValid' }
  | { readonly type: 'OtherSite' };

export interface VehicleQrVerifier {
  // Solo comprueba firma y esquema; la vigencia y la sede son reglas de dominio
  verify(token: string, publicKeyHex: string): Result<VehicleQr, VehicleQrError>;
}

export const QR_CLOCK_SKEW_MS = 120_000;

export function checkQrValidity(
  qr: VehicleQr,
  context: { readonly now: Date; readonly siteId: string },
): Result<VehicleQr, VehicleQrError> {
  const now = context.now.getTime();
  if (now > qr.expiresAt.getTime() + QR_CLOCK_SKEW_MS) return err({ type: 'Expired' });
  if (qr.notBefore && now < qr.notBefore.getTime() - QR_CLOCK_SKEW_MS) {
    return err({ type: 'NotYetValid' });
  }
  if (qr.siteId !== context.siteId) return err({ type: 'OtherSite' });
  return ok(qr);
}
