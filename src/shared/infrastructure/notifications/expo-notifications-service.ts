import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { Logger, NotificationsService } from '@/shared/domain';

const CHANNEL = 'attention';

export function createExpoNotificationsService(deps: {
  readonly logger: Logger;
  readonly channelName: string;
}): NotificationsService {
  let prepared: Promise<boolean> | null = null;

  const prepare = () => {
    prepared ??= (async () => {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync(CHANNEL, {
          name: deps.channelName,
          importance: Notifications.AndroidImportance.HIGH,
        });
      }
      const current = await Notifications.getPermissionsAsync();
      if (current.granted) return true;
      if (!current.canAskAgain) return false;
      return (await Notifications.requestPermissionsAsync()).granted;
    })().catch((error: unknown) => {
      deps.logger.warn('No se pudieron preparar las notificaciones', { error: String(error) });
      return false;
    });
    return prepared;
  };

  return {
    async prepare() {
      await prepare();
    },
    async notify({ title, body, target }) {
      if (!(await prepare())) return;
      await Notifications.scheduleNotificationAsync({
        content: { title, body, data: { target } },
        trigger: Platform.OS === 'android' ? { channelId: CHANNEL } : null,
      }).catch((error: unknown) =>
        deps.logger.warn('No se pudo mostrar la notificación', { error: String(error) }),
      );
    },
    onOpen(listener) {
      const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
        if (response.notification.request.content.data?.target === 'attention')
          listener('attention');
      });
      return () => subscription.remove();
    },
  };
}
