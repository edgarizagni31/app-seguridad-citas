import type { AuthError, AuthGateway, SessionTokens } from '../domain';
import { err, ok, type Clock, type Result } from '@/shared/domain';
import { decodeBase64Utf8, encodeBase64Utf8 } from '@/shared/lib';

type DemoUser = {
  readonly sub: string;
  readonly name: string;
  readonly familyName: string;
  readonly groups: readonly string[];
  readonly outcome?: 'password-change-required' | 'network';
};

export const DEMO_PASSWORD = 'demo123';

export const DEMO_USERS: Readonly<Record<string, DemoUser>> = {
  'seguridad@demo.ransa': {
    sub: 'demo-seguridad',
    name: 'Carlos',
    familyName: 'Méndez',
    groups: ['PACCESO_ASEGURIDAD'],
  },
  'cliente@demo.ransa': {
    sub: 'demo-cliente',
    name: 'Lucía',
    familyName: 'Torres',
    groups: ['PACCESO_CLIENTE'],
  },
  'cambio@demo.ransa': {
    sub: 'demo-cambio',
    name: 'Andrea',
    familyName: 'Ruiz',
    groups: ['PACCESO_ASEGURIDAD'],
    outcome: 'password-change-required',
  },
  'sinred@demo.ransa': {
    sub: 'demo-sinred',
    name: 'Mario',
    familyName: 'Díaz',
    groups: ['PACCESO_ASEGURIDAD'],
    outcome: 'network',
  },
};

const TOKEN_TTL_SECONDS = 3600;
const REFRESH_PREFIX = 'mock-refresh.';

const base64Url = (value: string) =>
  encodeBase64Utf8(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

function issueTokens(email: string, user: DemoUser, clock: Clock): SessionTokens {
  const issuedAt = Math.floor(clock.now().getTime() / 1000);
  const claims = {
    sub: user.sub,
    name: user.name,
    family_name: user.familyName,
    email,
    'cognito:groups': user.groups,
    iat: issuedAt,
    exp: issuedAt + TOKEN_TTL_SECONDS,
  };
  const header = base64Url(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  return {
    idToken: `${header}.${base64Url(JSON.stringify(claims))}.mock`,
    refreshToken: `${REFRESH_PREFIX}${encodeBase64Utf8(email)}`,
  };
}

function emailFromRefreshToken(refreshToken: string): string | null {
  if (!refreshToken.startsWith(REFRESH_PREFIX)) return null;
  try {
    return decodeBase64Utf8(refreshToken.slice(REFRESH_PREFIX.length));
  } catch {
    return null;
  }
}

type MockAuthGatewayOptions = {
  readonly clock: Clock;
  readonly latencyMs?: number;
};

export function createMockAuthGateway({
  clock,
  latencyMs = 600,
}: MockAuthGatewayOptions): AuthGateway {
  const delay = () => new Promise((resolve) => setTimeout(resolve, latencyMs));

  return {
    async login({ email, password }): Promise<Result<SessionTokens, AuthError>> {
      await delay();
      const user = DEMO_USERS[email];
      if (user?.outcome === 'network') return err({ type: 'network' });
      if (!user || password !== DEMO_PASSWORD) return err({ type: 'invalid-credentials' });
      if (user.outcome === 'password-change-required') {
        return err({ type: 'password-change-required' });
      }
      return ok(issueTokens(email, user, clock));
    },

    async refresh({ refreshToken }): Promise<Result<SessionTokens, AuthError>> {
      await delay();
      const email = emailFromRefreshToken(refreshToken);
      const user = email ? DEMO_USERS[email] : undefined;
      if (!email || !user) return err({ type: 'session-expired' });
      return ok(issueTokens(email, user, clock));
    },
  };
}
