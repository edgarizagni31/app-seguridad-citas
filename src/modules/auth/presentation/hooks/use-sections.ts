import {
  isSupport,
  needsShift,
  primaryRoleOf,
  sectionsFor,
  type AppSection,
  type PrimaryRole,
} from '../../domain';
import { useCurrentUser } from './use-current-user';

export type { AppSection, PrimaryRole };

export function useAppSections(): AppSection[] {
  const user = useCurrentUser();
  return user ? sectionsFor(user) : [];
}

export function usePrimaryRole(): PrimaryRole | null {
  const user = useCurrentUser();
  return user ? primaryRoleOf(user) : null;
}

export function useIsSupport(): boolean {
  const user = useCurrentUser();
  return user ? isSupport(user) : false;
}

export function useNeedsShift(): boolean {
  const user = useCurrentUser();
  return user ? needsShift(user) : false;
}
