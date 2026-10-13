import {
  getPermissionsAsync,
  requestPermissionsAsync,
} from 'expo-notifications/build/NotificationPermissions';
import { addNotificationResponseReceivedListener } from 'expo-notifications/build/NotificationsEmitter';
import { scheduleNotificationAsync } from 'expo-notifications/build/scheduleNotificationAsync';

import { silentLogger } from '@/test/fakes/test-dependencies';

import { createExpoNotificationsService } from './expo-notifications-service';

const permission = (granted: boolean, canAskAgain = true) =>
  ({ granted, canAskAgain, status: granted ? 'granted' : 'denied', expires: 'never' }) as never;

const NOTIFICATION = {
  title: 'Requiere atención',
  body: 'Ingreso ABC-123 fue rechazado por el servidor.',
  target: 'attention' as const,
};

const service = () =>
  createExpoNotificationsService({ logger: silentLogger, channelName: 'Avisos' });

beforeEach(() => jest.clearAllMocks());

describe('createExpoNotificationsService', () => {
  it('pide permiso una sola vez y muestra la notificación al instante', async () => {
    jest.mocked(getPermissionsAsync).mockResolvedValue(permission(false));
    jest.mocked(requestPermissionsAsync).mockResolvedValue(permission(true));
    const notifications = service();

    await notifications.prepare();
    await notifications.notify(NOTIFICATION);

    expect(requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: {
          title: NOTIFICATION.title,
          body: NOTIFICATION.body,
          data: { target: 'attention' },
        },
      }),
    );
  });

  it('sin permiso no intenta mostrar nada', async () => {
    jest.mocked(getPermissionsAsync).mockResolvedValue(permission(false, false));

    await service().notify(NOTIFICATION);

    expect(scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('al tocar una notificación de atención avisa a quien escucha', () => {
    const remove = jest.fn();
    let handler: ((response: unknown) => void) | undefined;
    jest.mocked(addNotificationResponseReceivedListener).mockImplementation((listener) => {
      handler = listener as never;
      return { remove } as never;
    });
    const onOpen = jest.fn();

    const stop = service().onOpen(onOpen);
    handler?.({ notification: { request: { content: { data: { target: 'attention' } } } } });
    stop();

    expect(onOpen).toHaveBeenCalledWith('attention');
    expect(remove).toHaveBeenCalled();
  });
});
