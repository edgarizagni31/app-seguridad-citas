import type { AuthError, SessionStorage } from '../domain';
import type { Result } from '@/shared/domain';

export const logout =
  (deps: { readonly sessionStorage: SessionStorage }) => (): Promise<Result<void, AuthError>> =>
    deps.sessionStorage.clear();
