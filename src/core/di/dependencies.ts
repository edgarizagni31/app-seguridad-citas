import type { AuthError, CredentialsError, Session } from '@/modules/auth/domain';
import type { Clock, Logger, Result } from '@/shared/domain';

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

export type Dependencies = {
  readonly config: AppConfig;
  readonly logger: Logger;
  readonly clock: Clock;
  readonly auth: AuthUseCases;
};
