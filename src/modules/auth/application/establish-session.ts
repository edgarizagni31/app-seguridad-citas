import type { AuthError, Session, SessionStorage, SessionTokens, TokenDecoder } from '../domain';
import { ok, type Result } from '@/shared/domain';

export type EstablishSessionDeps = {
  readonly tokenDecoder: TokenDecoder;
  readonly sessionStorage: SessionStorage;
};

export async function establishSession(
  deps: EstablishSessionDeps,
  tokens: SessionTokens,
): Promise<Result<Session, AuthError>> {
  const identity = deps.tokenDecoder.decode(tokens.idToken);
  if (!identity.ok) return identity;

  const saved = await deps.sessionStorage.save(tokens);
  if (!saved.ok) return saved;

  return ok({ user: identity.value.user, tokens, expiresAt: identity.value.expiresAt });
}
