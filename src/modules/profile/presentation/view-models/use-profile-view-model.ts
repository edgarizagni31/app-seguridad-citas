import { useRouter } from 'expo-router';

import {
  useCurrentUser,
  useIsSupport,
  useNeedsShift,
  usePrimaryRole,
  useSignOutPrompt,
} from '@/modules/auth';
import { useShiftInfo } from '@/modules/sites';
import { useDependencies } from '@/core/di';
import { SYNC_TABLES } from '@/shared/domain';
import { STRINGS } from '@/shared/lib';
import { useLiveData } from '@/shared/ui';

const ROLE_LABELS = {
  security: STRINGS.session.securityRole,
  hse: STRINGS.session.hseRole,
  support: STRINGS.session.supportRole,
} as const;

export function useProfileViewModel() {
  const { sync, changes } = useDependencies();
  const user = useCurrentUser();
  const role = usePrimaryRole();
  const shift = useShiftInfo();
  const signOut = useSignOutPrompt();
  const router = useRouter();
  const isSupport = useIsSupport();
  const showShift = useNeedsShift();
  const { data: syncState } = useLiveData(() => sync.snapshot(), changes, SYNC_TABLES);

  return {
    user: user && { fullName: `${user.firstName} ${user.lastName}`, email: user.email },
    roleLabel: role && ROLE_LABELS[role],
    pending: syncState?.pending ?? 0,
    ...shift,
    showShift,
    isSupport,
    openSupport: () => router.push('/support'),
    signOut: () => void signOut(),
  };
}
