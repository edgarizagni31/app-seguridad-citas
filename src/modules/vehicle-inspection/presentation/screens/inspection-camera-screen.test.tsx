import { screen, userEvent } from '@testing-library/react-native';
import { useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';

import type { InspectionUseCases } from '@/core/di';
import { err, ok } from '@/shared/domain';
import { createFakeInspections } from '@/test/fakes/test-dependencies';
import { renderWithDeps } from '@/test/render-with-deps';

import { InspectionCameraScreen } from './inspection-camera-screen';

const mockPicture = { uri: 'file:///cache/shot.jpg', width: 4000, height: 3000 };

jest.mock('expo-camera', () => {
  const { forwardRef: forward, useImperativeHandle: useHandle } = jest.requireActual('react');
  return {
    CameraView: forward((_props: unknown, ref: unknown) => {
      useHandle(ref, () => ({ takePictureAsync: async () => mockPicture }));
      return null;
    }),
    useCameraPermissions: jest.fn(),
  };
});
jest.mock('expo-router', () => ({ useRouter: jest.fn(), useLocalSearchParams: jest.fn() }));

const router = { back: jest.fn() };

type CapturePhoto = InspectionUseCases['capturePhoto'];

async function setup(capturePhoto: CapturePhoto = jest.fn(async () => ok({}) as never)) {
  jest.mocked(useRouter).mockReturnValue(router as never);
  jest
    .mocked(useLocalSearchParams)
    .mockReturnValue({ inspectionId: 'insp-1', stepId: 'cabin-photo' });
  jest
    .mocked(useCameraPermissions)
    .mockReturnValue([
      { granted: true, canAskAgain: true, status: 'granted', expires: 'never' },
      jest.fn(),
      jest.fn(),
    ] as never);
  const inspections = createFakeInspections({ capturePhoto });
  const user = userEvent.setup();
  await renderWithDeps(<InspectionCameraScreen />, { inspections });
  return { user, inspections };
}

describe('InspectionCameraScreen', () => {
  it('muestra la referencia del paso y la guía de encuadre', async () => {
    await setup();

    expect(screen.getByText('Referencia')).toBeOnTheScreen();
    expect(screen.getByText('Encuadra lo que muestra la imagen de referencia')).toBeOnTheScreen();
  });

  it('tomar, revisar y usar la foto la guarda en el paso', async () => {
    const { user, inspections } = await setup();

    await user.press(screen.getByRole('button', { name: 'Tomar foto' }));
    expect(screen.getByLabelText('Vista previa de la foto')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Usar foto' }));

    expect(inspections.capturePhoto).toHaveBeenCalledWith('insp-1', 'cabin-photo', mockPicture);
    expect(router.back).toHaveBeenCalled();
  });

  it('repetir descarta la captura y vuelve a la cámara', async () => {
    const { user, inspections } = await setup();

    await user.press(screen.getByRole('button', { name: 'Tomar foto' }));
    await user.press(screen.getByRole('button', { name: 'Repetir' }));

    expect(inspections.discardCapture).toHaveBeenCalledWith(mockPicture);
    expect(screen.getByRole('button', { name: 'Tomar foto' })).toBeOnTheScreen();
  });

  it('si no se puede guardar lo informa', async () => {
    const { user } = await setup(async () => err({ type: 'photo-failed' as const }));

    await user.press(screen.getByRole('button', { name: 'Tomar foto' }));
    await user.press(screen.getByRole('button', { name: 'Usar foto' }));

    expect(screen.getByText('No se pudo guardar la foto. Inténtalo de nuevo.')).toBeOnTheScreen();
    expect(router.back).not.toHaveBeenCalled();
  });
});
