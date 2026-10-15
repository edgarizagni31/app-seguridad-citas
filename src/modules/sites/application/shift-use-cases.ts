import {
  isSnapshotForDate,
  type ShiftGateway,
  type ShiftStore,
  type ShiftStatus,
  type Site,
  type SitesError,
  type SitesGateway,
} from '../domain';
import { err, ok, type Result, type ShiftSnapshot } from '@/shared/domain';

export type ShiftDeps = {
  readonly sitesGateway: SitesGateway;
  readonly shiftGateway: ShiftGateway;
  readonly store: ShiftStore;
  readonly today: () => string;
};

const wrapStorage = async <T>(task: () => Promise<T>): Promise<Result<T, SitesError>> => {
  try {
    return ok(await task());
  } catch (cause) {
    return err({ type: 'storage', cause });
  }
};

export const listSites = (deps: Pick<ShiftDeps, 'sitesGateway'>) => async () => {
  const sites = await deps.sitesGateway.listMySites();
  if (sites.ok && sites.value.length === 0) return err<SitesError>({ type: 'no-sites' });
  return sites;
};

export const shiftStatus =
  (deps: Pick<ShiftDeps, 'store' | 'today'>) =>
  async (): Promise<Result<ShiftStatus, SitesError>> =>
    wrapStorage(async () => {
      const site = await deps.store.selectedSite();
      if (!site) return { type: 'no-site' } as const;
      const snapshot = await deps.store.snapshot();
      if (!snapshot || snapshot.siteId !== site.id || !isSnapshotForDate(snapshot, deps.today())) {
        return { type: 'needs-download', site } as const;
      }
      return { type: 'ready', site, snapshot } as const;
    });

// Descarga el paquete del día de la sede: requiere conexión
export const startShift =
  (deps: Pick<ShiftDeps, 'shiftGateway' | 'store' | 'today'>) =>
  async (site: Site): Promise<Result<ShiftSnapshot, SitesError>> => {
    const snapshot = await deps.shiftGateway.downloadSnapshot(site, deps.today());
    if (!snapshot.ok) return snapshot;
    const saved = await wrapStorage(async () => {
      await deps.store.saveSelectedSite(site);
      await deps.store.saveSnapshot(snapshot.value);
    });
    return saved.ok ? snapshot : saved;
  };

export const endShift = (deps: Pick<ShiftDeps, 'store'>) => () =>
  wrapStorage(() => deps.store.clear());

export const changeSite = (deps: Pick<ShiftDeps, 'store'>) => () =>
  wrapStorage(async () => {
    await deps.store.clear();
    await deps.store.clearSelectedSite();
  });
