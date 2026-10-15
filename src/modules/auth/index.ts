export { RoleGate } from './presentation/components/role-gate';
export { UserHeader } from './presentation/components/user-header';
export {
  useAppSections,
  useIsSupport,
  useNeedsShift,
  usePrimaryRole,
  type AppSection,
  type PrimaryRole,
} from './presentation/hooks/use-sections';
export { useSignOutPrompt } from './presentation/hooks/use-sign-out-prompt';
export { useCurrentUser } from './presentation/hooks/use-current-user';
export { useSessionLifecycle } from './presentation/hooks/use-session-lifecycle';
export { useSignOut } from './presentation/hooks/use-sign-out';
export { LoginScreen } from './presentation/screens/login-screen';
export { useSessionStore, type SessionStatus } from './presentation/stores/session-store';
