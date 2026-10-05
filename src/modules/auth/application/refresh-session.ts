import type { AuthError, AuthGateway, Session } from '../domain';
import type { Result } from '@/shared/domain';

import { establishSession, type EstablishSessionDeps } from './establish-session';

export type RefreshSessionDeps = EstablishSessionDeps & { readonly authGateway: AuthGateway };

export const refreshSession =
  (deps: RefreshSessionDeps) =>
  async (session: Session): Promise<Result<Session, AuthError>> => {
    const tokens = await deps.authGateway.refresh(session.tokens);
    if (!tokens.ok) return tokens;

    return establishSession(deps, tokens.value);
  };
