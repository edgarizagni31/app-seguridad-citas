// Importar la raíz de expo-notifications registra un listener de push que en Expo Go (Android)
// lanza un error al cargar; solo usamos notificaciones locales, así que se importan los submódulos
import { AndroidImportance } from 'expo-notifications/build/NotificationChannelManager.types';
import {
  getPermissionsAsync,
  requestPermissionsAsync,
} from 'expo-notifications/build/NotificationPermissions';
import { addNotificationResponseReceivedListener } from 'expo-notifications/build/NotificationsEmitter';
import { setNotificationHandler } from 'expo-notifications/build/NotificationsHandler';
import { scheduleNotificationAsync } from 'expo-notifications/build/scheduleNotificationAsync';
import { setNotificationChannelAsync } from 'expo-notifications/build/setNotificationChannelAsync';
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
      setNotificationHandler({
        handleNotification: async () => ({
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
      if (Platform.OS === 'android') {
        await setNotificationChannelAsync(CHANNEL, {
          name: deps.channelName,
          importance: AndroidImportance.HIGH,
        });
      }
      const current = await getPermissionsAsync();
      if (current.granted) return true;
      if (!current.canAskAgain) return false;
      return (await requestPermissionsAsync()).granted;
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
      await scheduleNotificationAsync({
        content: { title, body, data: { target } },
        trigger: Platform.OS === 'android' ? { channelId: CHANNEL } : null,
      }).catch((error: unknown) =>
        deps.logger.warn('No se pudo mostrar la notificación', { error: String(error) }),
      );
    },
    onOpen(listener) {
      const subscription = addNotificationResponseReceivedListener((response) => {
        if (response.notification.request.content.data?.target === 'attention')
          listener('attention');
      });
      return () => subscription.remove();
    },
  };
}
