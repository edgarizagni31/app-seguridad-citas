import { screen, userEvent } from '@testing-library/react-native';
import { useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { Linking } from 'react-native';

import { renderWithDeps } from '@/test/render-with-deps';

import { ScannerScreen } from './scanner-screen';

jest.mock('expo-camera', () => {
  const { View } = jest.requireActual('react-native');
  return { CameraView: View, useCameraPermissions: jest.fn() };
});
jest.mock('expo-router', () => ({ useRouter: jest.fn() }));

const back = jest.fn();
const requestPermission = jest.fn();

async function setup(permission: { granted: boolean; canAskAgain: boolean }) {
  jest.mocked(useRouter).mockReturnValue({ back } as never);
  jest
    .mocked(useCameraPermissions)
    .mockReturnValue([
      { ...permission, status: 'denied', expires: 'never' },
      requestPermission,
      jest.fn(),
    ] as never);
  const user = userEvent.setup();
  await renderWithDeps(<ScannerScreen />);
  return { user };
}

describe('ScannerScreen', () => {
  it('con permiso muestra la guía y los controles', async () => {
    const { user } = await setup({ granted: true, canAskAgain: true });

    expect(screen.getByText('Centra el código QR dentro del recuadro')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Encender linterna' }));
    expect(screen.getByRole('button', { name: 'Apagar linterna' })).toBeOnTheScreen();
  });

  it('cerrar vuelve a la pantalla anterior', async () => {
    const { user } = await setup({ granted: true, canAskAgain: true });

    await user.press(screen.getByRole('button', { name: 'Cerrar escáner' }));

    expect(back).toHaveBeenCalled();
  });

  it('sin permiso todavía, ofrece solicitarlo', async () => {
    const { user } = await setup({ granted: false, canAskAgain: true });

    expect(
      screen.getByRole('heading', { name: 'Necesitamos acceso a la cámara' }),
    ).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Permitir cámara' }));

    expect(requestPermission).toHaveBeenCalled();
  });

  it('con permiso bloqueado, lleva a los ajustes', async () => {
    const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
    const { user } = await setup({ granted: false, canAskAgain: false });

    await user.press(screen.getByRole('button', { name: 'Abrir ajustes' }));

    expect(openSettings).toHaveBeenCalled();
  });
});
