import { err, ok, type Result } from '@/shared/domain';

declare const credentialsBrand: unique symbol;

export type Credentials = {
  readonly email: string;
  readonly password: string;
  readonly [credentialsBrand]: true;
};

export type CredentialsError =
  { readonly type: 'invalid-email' } | { readonly type: 'empty-password' };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isValidEmail = (email: string) => EMAIL_PATTERN.test(email.trim());

export function createCredentials(
  email: string,
  password: string,
): Result<Credentials, CredentialsError> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!isValidEmail(normalizedEmail)) return err({ type: 'invalid-email' });
  if (password.length === 0) return err({ type: 'empty-password' });
  return ok({ email: normalizedEmail, password } as Credentials);
}
