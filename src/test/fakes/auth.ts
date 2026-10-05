import type {
  AuthError,
  AuthGateway,
  DecodedIdentity,
  SessionStorage,
  SessionTokens,
  TokenDecoder,
} from '@/modules/auth/domain';
import { err, ok, type Result } from '@/shared/domain';

import { buildSessionUser, buildTokens } from '../factories/auth';

type GatewayResult = Result<SessionTokens, AuthError>;

export function createFakeAuthGateway(
  responses: { login?: GatewayResult; refresh?: GatewayResult } = {},
) {
  return {
    login: jest.fn(async () => responses.login ?? ok(buildTokens())),
    refresh: jest.fn(
      async () =>
        responses.refresh ??
        ok(buildTokens({ idToken: 'id-token-2', refreshToken: 'refresh-token-2' })),
    ),
  } satisfies AuthGateway;
}

export function createInMemorySessionStorage(initial: SessionTokens | null = null) {
  let stored = initial;
  return {
    load: jest.fn(async (): Promise<Result<SessionTokens | null, AuthError>> => ok(stored)),
    save: jest.fn(async (tokens: SessionTokens): Promise<Result<void, AuthError>> => {
      stored = tokens;
      return ok(undefined);
    }),
    clear: jest.fn(async (): Promise<Result<void, AuthError>> => {
      stored = null;
      return ok(undefined);
    }),
    current: () => stored,
  } satisfies SessionStorage & Record<string, unknown>;
}

export function createFakeTokenDecoder(
  identities: Record<string, DecodedIdentity> = {},
  defaultExpiresAt = new Date('2026-10-05T17:42:00.000Z'),
) {
  return {
    decode: jest.fn((idToken: string): Result<DecodedIdentity, AuthError> => {
      if (idToken === 'malformed') return err({ type: 'invalid-token' });
      return ok(identities[idToken] ?? { user: buildSessionUser(), expiresAt: defaultExpiresAt });
    }),
  } satisfies TokenDecoder;
}
