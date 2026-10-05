import type { Session, SessionTokens, SessionUser } from '@/modules/auth/domain';

export const buildSessionUser = (overrides: Partial<SessionUser> = {}): SessionUser => ({
  id: 'user-1',
  name: 'Carlos Méndez',
  firstName: 'Carlos',
  lastName: 'Méndez',
  email: 'carlos.mendez@empresa.com',
  roles: ['PACCESO_ASEGURIDAD'],
  ...overrides,
});

export const buildTokens = (overrides: Partial<SessionTokens> = {}): SessionTokens => ({
  idToken: 'id-token-1',
  refreshToken: 'refresh-token-1',
  ...overrides,
});

export const buildSession = (overrides: Partial<Session> = {}): Session => ({
  user: buildSessionUser(),
  tokens: buildTokens(),
  expiresAt: new Date('2026-10-05T17:42:00.000Z'),
  ...overrides,
});
