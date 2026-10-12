import type { Result, ShiftSnapshot } from '@/shared/domain';

import type { Site } from './site';
import type { SitesError } from './sites-error';

export interface SitesGateway {
  listMySites(): Promise<Result<readonly Site[], SitesError>>;
}

export interface ShiftGateway {
  downloadSnapshot(siteId: string, date: string): Promise<Result<ShiftSnapshot, SitesError>>;
}

export interface ShiftStore {
  selectedSite(): Promise<Site | null>;
  saveSelectedSite(site: Site): Promise<void>;
  snapshot(): Promise<ShiftSnapshot | null>;
  saveSnapshot(snapshot: ShiftSnapshot): Promise<void>;
  clear(): Promise<void>;
  clearSelectedSite(): Promise<void>;
}
