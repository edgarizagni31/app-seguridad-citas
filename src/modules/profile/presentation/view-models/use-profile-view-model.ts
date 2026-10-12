import { useCurrentUser, usePrimaryRole, useSignOutPrompt } from '@/modules/auth';
import { useShiftInfo } from '@/modules/sites';
import { useDependencies } from '@/core/di';
import { SYNC_TABLES } from '@/shared/domain';
import { STRINGS } from '@/shared/lib';
import { useLiveData } from '@/shared/ui';

export function useProfileViewModel() {
  const { sync, changes } = useDependencies();
  const user = useCurrentUser();
  const role = usePrimaryRole();
  const shift = useShiftInfo();
  const signOut = useSignOutPrompt();
  const { data: syncState } = useLiveData(() => sync.snapshot(), changes, SYNC_TABLES);

  return {
    user: user && { fullName: `${user.firstName} ${user.lastName}`, email: user.email },
    roleLabel:
      role && (role === 'security' ? STRINGS.session.securityRole : STRINGS.session.hseRole),
    pending: syncState?.pending ?? 0,
    ...shift,
    signOut: () => void signOut(),
  };
}
