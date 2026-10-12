export type { AuthError } from './auth-error';
export {
  createCredentials,
  isValidEmail,
  type Credentials,
  type CredentialsError,
} from './credentials';
export type { AuthGateway, DecodedIdentity, SessionStorage, TokenDecoder } from './ports';
export {
  canInspect,
  canManageEntry,
  canUseApp,
  HSE_ROLES,
  isInspector,
  primaryRoleOf,
  sectionsFor,
  SECURITY_ROLES,
  type AppSection,
  type PrimaryRole,
} from './roles';
export {
  firstNameOf,
  isExpired,
  REFRESH_MARGIN_SECONDS,
  secondsUntilExpiry,
  shouldRefresh,
  type Session,
  type SessionTokens,
  type SessionUser,
} from './session';
