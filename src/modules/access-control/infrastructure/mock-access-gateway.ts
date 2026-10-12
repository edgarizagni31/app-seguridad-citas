import type { AccessValidationGateway } from '../domain';
import { err, normalizeDocument, ok } from '@/shared/domain';

// Documento bloqueado solo en el "servidor": simula una lista negra más nueva que el paquete
export const SERVER_ONLY_BLACKLIST = [{ documentType: 'DUI', documentNumber: '07777777-7' }];

type MockOptions = {
  readonly isOnline: () => Promise<boolean>;
  readonly latencyMs?: number;
};

export function createMockAccessGateway({
  isOnline,
  latencyMs = 400,
}: MockOptions): AccessValidationGateway {
  const delay = () => new Promise((resolve) => setTimeout(resolve, latencyMs));

  const isBlocked = (documentType: string, documentNumber: string) =>
    SERVER_ONLY_BLACKLIST.some(
      (entry) =>
        entry.documentType === documentType &&
        normalizeDocument(entry.documentNumber) === normalizeDocument(documentNumber),
    );
  const confirmed = new Set<string>();

  return {
    async validateUnit() {
      await delay();
      if (!(await isOnline())) return err({ type: 'network' });
      return ok({ type: 'accepted' });
    },
    async validateVisitor({ documentType, documentNumber }) {
      await delay();
      if (!(await isOnline())) return err({ type: 'network' });
      if (!isBlocked(documentType, documentNumber)) return ok({ type: 'accepted' });
      return ok({
        type: 'rejected',
        reason: 'VisitorBlacklisted',
        message: 'El visitante se encuentra en la lista negra de la sede.',
      });
    },
    async confirmEntry(request, idempotencyKey) {
      await delay();
      if (!(await isOnline())) return err({ type: 'network' });
      // Idempotente: reintentar con la misma clave no duplica el ingreso
      if (confirmed.has(idempotencyKey)) return ok({ type: 'accepted' });
      const blocked = request.visitors.find(
        (visitor) =>
          visitor.status === 'ARRIVED' && isBlocked(visitor.documentType, visitor.documentNumber),
      );
      if (blocked) {
        return ok({
          type: 'rejected',
          reason: 'VisitorBlacklisted',
          message: `${blocked.name} se encuentra en la lista negra de la sede.`,
        });
      }
      confirmed.add(idempotencyKey);
      return ok({ type: 'accepted' });
    },
  };
}
