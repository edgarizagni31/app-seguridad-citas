import type { InspectionGateway } from '../domain';
import { err, ok } from '@/shared/domain';

type MockOptions = {
  readonly isOnline: () => Promise<boolean>;
  readonly latencyMs?: number;
};

// Simula la subida por partes y el registro idempotente del contrato propuesto
export function createMockInspectionGateway({
  isOnline,
  latencyMs = 350,
}: MockOptions): InspectionGateway {
  const delay = () => new Promise((resolve) => setTimeout(resolve, latencyMs));
  const submitted = new Set<string>();

  return {
    async uploadPhoto() {
      await delay();
      if (!(await isOnline())) return err({ type: 'network' });
      return ok(undefined);
    },
    async submit(_request, idempotencyKey) {
      await delay();
      if (!(await isOnline())) return err({ type: 'network' });
      if (submitted.has(idempotencyKey)) return ok({ type: 'accepted' });
      submitted.add(idempotencyKey);
      return ok({ type: 'accepted' });
    },
  };
}
