import type { ShiftGateway, SitesGateway } from '../domain';
import { err, ok, type Clock } from '@/shared/domain';
import { buildDemoSnapshot } from '@/shared/infrastructure/demo';

export const DEMO_SITES = [
  { id: 'site-central', name: 'Almacén Central' },
  { id: 'site-norte', name: 'Almacén Norte' },
] as const;

type MockOptions = {
  readonly clock: Clock;
  readonly isOnline: () => Promise<boolean>;
  readonly latencyMs?: number;
};

export function createMockSitesGateways({ clock, isOnline, latencyMs = 500 }: MockOptions): {
  sitesGateway: SitesGateway;
  shiftGateway: ShiftGateway;
} {
  const delay = () => new Promise((resolve) => setTimeout(resolve, latencyMs));
  return {
    sitesGateway: {
      async listMySites() {
        await delay();
        if (!(await isOnline())) return err({ type: 'network' });
        return ok(DEMO_SITES);
      },
    },
    shiftGateway: {
      async downloadSnapshot(siteId, date) {
        await delay();
        if (!(await isOnline())) return err({ type: 'network' });
        const site = DEMO_SITES.find((candidate) => candidate.id === siteId);
        if (!site) return err({ type: 'unknown' });
        return ok(buildDemoSnapshot(site.id, site.name, date, clock.now()));
      },
    },
  };
}
