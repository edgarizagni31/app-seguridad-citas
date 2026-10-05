import { useSessionStore } from '../stores/session-store';
import { useDependencies } from '@/core/di';

export function useSignOut() {
  const { auth, logger } = useDependencies();
  const clearSession = useSessionStore((state) => state.clearSession);

  return async () => {
    const result = await auth.logout();
    if (!result.ok) logger.error('No se pudieron borrar los tokens', { error: result.error.type });
    clearSession();
  };
}
