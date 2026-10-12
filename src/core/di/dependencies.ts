import type { ScanRecord } from '@/modules/access-control/domain';
import type { AuthError, CredentialsError, Session } from '@/modules/auth/domain';
import type { ShiftStatus, Site, SitesError } from '@/modules/sites/domain';
import type {
  ChangeFeed,
  Clock,
  Connectivity,
  Logger,
  Result,
  ShiftSnapshot,
  SyncService,
} from '@/shared/domain';

export type AppConfig = {
  readonly appVersion: string;
  readonly timeZone: string;
  readonly isDemoAuth: boolean;
};

export type AuthUseCases = {
  readonly login: (
    email: string,
    password: string,
  ) => Promise<Result<Session, CredentialsError | AuthError>>;
  readonly restoreSession: () => Promise<Result<Session | null, AuthError>>;
  readonly refreshSession: (session: Session) => Promise<Result<Session, AuthError>>;
  readonly logout: () => Promise<Result<void, AuthError>>;
};

export type AccessControlUseCases = {
  readonly readQr: (rawContent: string) => ScanRecord;
};

export type SitesUseCases = {
  readonly listSites: () => Promise<Result<readonly Site[], SitesError>>;
  readonly shiftStatus: () => Promise<Result<ShiftStatus, SitesError>>;
  readonly startShift: (site: Site) => Promise<Result<ShiftSnapshot, SitesError>>;
  readonly endShift: () => Promise<Result<void, SitesError>>;
  readonly changeSite: () => Promise<Result<void, SitesError>>;
};

export type Dependencies = {
  readonly config: AppConfig;
  readonly logger: Logger;
  readonly clock: Clock;
  readonly connectivity: Connectivity;
  readonly changes: ChangeFeed;
  readonly sync: SyncService;
  readonly auth: AuthUseCases;
  readonly accessControl: AccessControlUseCases;
  readonly sites: SitesUseCases;
};
