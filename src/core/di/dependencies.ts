import type {
  ConfirmEntryError,
  EntryDraft,
  IdentifiedVehicle,
  ScanRecord,
  UnitValidation,
  UnitValidationError,
  VehicleEntryRecord,
  VisitorDocument,
  VisitorValidation,
  VisitorValidationError,
} from '@/modules/access-control/domain';
import type { AuthError, CredentialsError, Session } from '@/modules/auth/domain';
import type { ShiftStatus, Site, SitesError } from '@/modules/sites/domain';
import type {
  Answer,
  CapturedPhoto,
  Inspection,
  InspectionCommandError,
  Inspector,
  OpenInspectionError,
  StoredInspection,
} from '@/modules/vehicle-inspection/domain';
import type {
  ChangeFeed,
  Clock,
  Connectivity,
  HistorySource,
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
  readonly validateUnit: (token: string) => Promise<Result<UnitValidation, UnitValidationError>>;
  readonly identifyVehicle: (
    token: string,
  ) => Promise<Result<IdentifiedVehicle, UnitValidationError>>;
  readonly validateVisitor: (
    visitor: VisitorDocument & { readonly voucherId: string },
  ) => Promise<Result<VisitorValidation, VisitorValidationError>>;
  readonly confirmEntry: (
    draft: EntryDraft,
  ) => Promise<Result<VehicleEntryRecord, ConfirmEntryError>>;
};

export type SitesUseCases = {
  readonly listSites: () => Promise<Result<readonly Site[], SitesError>>;
  readonly shiftStatus: () => Promise<Result<ShiftStatus, SitesError>>;
  readonly startShift: (site: Site) => Promise<Result<ShiftSnapshot, SitesError>>;
  readonly endShift: () => Promise<Result<void, SitesError>>;
  readonly changeSite: () => Promise<Result<void, SitesError>>;
};

type InspectionCommand<A extends unknown[]> = (
  ...args: A
) => Promise<Result<Inspection, InspectionCommandError>>;

export type InspectionUseCases = {
  readonly open: (input: {
    readonly vehicleId: string;
    readonly inspector: Inspector;
  }) => Promise<Result<StoredInspection, OpenInspectionError>>;
  readonly answer: InspectionCommand<
    [id: string, stepId: string, answer: Exclude<Answer, { kind: 'photo' }>]
  >;
  readonly capturePhoto: InspectionCommand<[id: string, stepId: string, capture: CapturedPhoto]>;
  readonly updateObservation: InspectionCommand<[id: string, observation: string]>;
  readonly finish: InspectionCommand<[id: string]>;
  readonly reportMismatch: InspectionCommand<[id: string]>;
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
  readonly history: HistorySource;
  readonly inspections: InspectionUseCases;
};
