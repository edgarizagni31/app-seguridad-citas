import type { ConfirmEntryRequest } from './entry-ports';
import type { VisitorDocument } from './visitor-policy';
import type { Result } from '@/shared/domain';

export type AccessGatewayError = { readonly type: 'network' } | { readonly type: 'server' };

// rejectionReason usa los catálogos del backend; message viene listo para mostrar
export type ServerVerdict =
  | { readonly type: 'accepted' }
  | { readonly type: 'rejected'; readonly reason: string; readonly message: string };

export interface AccessValidationGateway {
  validateUnit(vehicleQrToken: string): Promise<Result<ServerVerdict, AccessGatewayError>>;
  validateVisitor(
    input: VisitorDocument & { readonly voucherId: string },
  ): Promise<Result<ServerVerdict, AccessGatewayError>>;
  // idempotencyKey evita duplicar el ingreso si se reintenta el envío
  confirmEntry(
    request: ConfirmEntryRequest,
    idempotencyKey: string,
  ): Promise<Result<ServerVerdict, AccessGatewayError>>;
}
