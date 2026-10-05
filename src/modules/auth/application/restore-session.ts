import { shouldRefresh, type AuthError, type Session } from '../domain';
import { ok, type Clock, type Result } from '@/shared/domain';

import { refreshSession, type RefreshSessionDeps } from './refresh-session';

export type RestoreSessionDeps = RefreshSessionDeps & { readonly clock: Clock };

export const restoreSession =
  (deps: RestoreSessionDeps) => async (): Promise<Result<Session | null, AuthError>> => {
    const stored = await deps.sessionStorage.load();
    if (!stored.ok) return stored;
    if (!stored.value) return ok(null);

    const identity = deps.tokenDecoder.decode(stored.value.idToken);
    if (!identity.ok) return discardSession(deps);

    const session: Session = { ...identity.value, tokens: stored.value };
    if (!shouldRefresh(session, deps.clock.now())) return ok(session);

    const refreshed = await refreshSession(deps)(session);
    if (refreshed.ok) return refreshed;
    // Sin red se conserva la sesión para operar offline; se renovará al reconectar
    if (refreshed.error.type === 'network') return ok(session);
    return discardSession(deps);
  };

async function discardSession(deps: RestoreSessionDeps): Promise<Result<null, AuthError>> {
  const cleared = await deps.sessionStorage.clear();
  return cleared.ok ? ok(null) : cleared;
}
