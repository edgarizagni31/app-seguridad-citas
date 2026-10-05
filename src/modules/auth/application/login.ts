import {
  createCredentials,
  type AuthError,
  type AuthGateway,
  type CredentialsError,
  type Session,
} from '../domain';
import type { Result } from '@/shared/domain';

import { establishSession, type EstablishSessionDeps } from './establish-session';

export type LoginError = CredentialsError | AuthError;

export type LoginDeps = EstablishSessionDeps & { readonly authGateway: AuthGateway };

export const login =
  (deps: LoginDeps) =>
  async (email: string, password: string): Promise<Result<Session, LoginError>> => {
    const credentials = createCredentials(email, password);
    if (!credentials.ok) return credentials;

    const tokens = await deps.authGateway.login(credentials.value);
    if (!tokens.ok) return tokens;

    return establishSession(deps, tokens.value);
  };
