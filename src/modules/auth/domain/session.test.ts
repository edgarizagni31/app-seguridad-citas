import { firstNameOf, isExpired, secondsUntilExpiry, shouldRefresh, type Session } from './session';

const session = (expiresAt: string): Session => ({
  user: { id: '1', name: 'Carlos Méndez', firstName: 'Carlos', email: 'c@e.com', roles: [] },
  tokens: { idToken: 'id', refreshToken: 'refresh' },
  expiresAt: new Date(expiresAt),
});

const NOW = new Date('2026-10-05T16:00:00Z');

describe('Session', () => {
  it('calcula los segundos hasta la expiración', () => {
    expect(secondsUntilExpiry(session('2026-10-05T16:10:00Z'), NOW)).toBe(600);
  });

  it('está expirada al llegar a exp', () => {
    expect(isExpired(session('2026-10-05T16:00:00Z'), NOW)).toBe(true);
    expect(isExpired(session('2026-10-05T16:00:01Z'), NOW)).toBe(false);
  });

  it('pide renovar dentro del margen de 120 s', () => {
    expect(shouldRefresh(session('2026-10-05T16:02:00Z'), NOW)).toBe(true);
    expect(shouldRefresh(session('2026-10-05T16:02:01Z'), NOW)).toBe(false);
  });

  it.each([
    ['Patricia Berenice', 'Patricia'],
    ['  Carlos  ', 'Carlos'],
    ['', ''],
  ])('primer nombre de "%s" es "%s"', (name, expected) => {
    expect(firstNameOf(name)).toBe(expected);
  });
});
