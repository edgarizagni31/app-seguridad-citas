import { useEffect } from 'react';
import { AppState } from 'react-native';

import { REFRESH_MARGIN_SECONDS, secondsUntilExpiry, shouldRefresh } from '../../domain';
import { useSessionStore } from '../stores/session-store';
import { useDependencies } from '@/core/di';

export const NETWORK_RETRY_MS = 30_000;

export function useSessionLifecycle() {
  const { auth, clock, logger } = useDependencies();
  const session = useSessionStore((state) => state.session);
  const setSession = useSessionStore((state) => state.setSession);
  const clearSession = useSessionStore((state) => state.clearSession);

  useEffect(() => {
    let cancelled = false;
    void auth.restoreSession().then((result) => {
      if (cancelled) return;
      if (!result.ok) logger.error('No se pudo restaurar la sesión', { error: result.error.type });
      if (result.ok && result.value) setSession(result.value);
      else clearSession();
    });
    return () => {
      cancelled = true;
    };
  }, [auth, logger, setSession, clearSession]);

  useEffect(() => {
    if (!session) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const refresh = async () => {
      const result = await auth.refreshSession(session);
      if (cancelled) return;
      if (result.ok) return setSession(result.value);
      if (result.error.type === 'network') {
        timer = setTimeout(() => void refresh(), NETWORK_RETRY_MS);
        return;
      }
      logger.warn('Sesión rechazada al renovar', { error: result.error.type });
      await auth.logout();
      clearSession('session-expired');
    };

    const secondsToRefresh = secondsUntilExpiry(session, clock.now()) - REFRESH_MARGIN_SECONDS;
    timer = setTimeout(() => void refresh(), Math.max(0, secondsToRefresh * 1000));

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && shouldRefresh(session, clock.now())) void refresh();
    });

    return () => {
      cancelled = true;
      clearTimeout(timer);
      subscription.remove();
    };
  }, [session, auth, clock, logger, setSession, clearSession]);
}
