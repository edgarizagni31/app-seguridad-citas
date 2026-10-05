export type SessionUser = {
  readonly id: string;
  readonly name: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly roles: readonly string[];
};

export type SessionTokens = {
  readonly idToken: string;
  readonly refreshToken: string;
};

export type Session = {
  readonly user: SessionUser;
  readonly tokens: SessionTokens;
  readonly expiresAt: Date;
};

export const REFRESH_MARGIN_SECONDS = 120;

export const secondsUntilExpiry = (session: Session, now: Date) =>
  Math.floor((session.expiresAt.getTime() - now.getTime()) / 1000);

export const isExpired = (session: Session, now: Date) => secondsUntilExpiry(session, now) <= 0;

export const shouldRefresh = (session: Session, now: Date) =>
  secondsUntilExpiry(session, now) <= REFRESH_MARGIN_SECONDS;

export const firstNameOf = (fullName: string) => fullName.trim().split(/\s+/, 1).join('');
