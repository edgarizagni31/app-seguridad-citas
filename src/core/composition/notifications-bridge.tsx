import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { useDependencies } from '@/core/di';

// Con el turno listo pide permiso de notificaciones y abre la bandeja al tocar una
export function NotificationsBridge() {
  const router = useRouter();
  const { notifications } = useDependencies();

  useEffect(() => {
    void notifications.prepare();
    return notifications.onOpen(() => router.push('/attention'));
  }, [notifications, router]);

  return null;
}
