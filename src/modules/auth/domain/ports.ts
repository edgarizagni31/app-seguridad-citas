import type { Result } from '@/shared/domain';

import type { AuthError } from './auth-error';
import type { Credentials } from './credentials';
import type { SessionTokens, SessionUser } from './session';

export interface AuthGateway {
  login(credentials: Credentials): Promise<Result<SessionTokens, AuthError>>;
  refresh(tokens: SessionTokens): Promise<Result<SessionTokens, AuthError>>;
}

export type DecodedIdentity = {
  readonly user: SessionUser;
  readonly expiresAt: Date;
};

export interface TokenDecoder {
  decode(idToken: string): Result<DecodedIdentity, AuthError>;
}

export interface SessionStorage {
  load(): Promise<Result<SessionTokens | null, AuthError>>;
  save(tokens: SessionTokens): Promise<Result<void, AuthError>>;
  clear(): Promise<Result<void, AuthError>>;
}
