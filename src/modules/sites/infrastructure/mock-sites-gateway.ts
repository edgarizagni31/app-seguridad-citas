import type { ShiftGateway, SitesGateway } from '../domain';
import { err, ok, type Clock } from '@/shared/domain';
import { buildDemoSnapshot } from '@/shared/infrastructure/demo';

// Solo para el modo demo (EXPO_PUBLIC_AUTH_PROVIDER=mock): con R360 las sedes vienen del backend
export const DEMO_SITES = [
  { id: 'site-central', name: 'Sede demo 1' },
  { id: 'site-norte', name: 'Sede demo 2' },
] as const;

type MockOptions = {
  readonly isOnline: () => Promise<boolean>;
  readonly latencyMs?: number;
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function createMockSitesGateway({ isOnline, latencyMs = 500 }: MockOptions): SitesGateway {
  return {
    async listMySites() {
      await wait(latencyMs);
      if (!(await isOnline())) return err({ type: 'network' });
      return ok(DEMO_SITES);
    },
  };
}

// El backend aún no expone el paquete del día: se arma uno de ejemplo para la sede elegida
export function createMockShiftGateway({
  clock,
  isOnline,
  latencyMs = 500,
}: MockOptions & { readonly clock: Clock }): ShiftGateway {
  return {
    async downloadSnapshot(site, date) {
      await wait(latencyMs);
      if (!(await isOnline())) return err({ type: 'network' });
      return ok(buildDemoSnapshot(site.id, site.name, date, clock.now()));
    },
  };
}
