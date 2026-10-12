import { act, screen, userEvent } from '@testing-library/react-native';
import { useCameraPermissions } from 'expo-camera';

import type { UnitValidation } from '../../domain';
import { useSessionStore } from '@/modules/auth';
import { err, ok } from '@/shared/domain';
import { buildSession } from '@/test/factories/auth';
import { createFakeAccessControl } from '@/test/fakes/test-dependencies';
import { createFixedClock } from '@/test/fakes/fixed-clock';
import { renderWithDeps } from '@/test/render-with-deps';

import { VehicleScanScreen } from './vehicle-scan-screen';

const mockCamera: { onScan?: (result: { data: string }) => void } = {};

jest.mock('expo-camera', () => ({
  CameraView: (props: { onBarcodeScanned: (result: { data: string }) => void }) => {
    mockCamera.onScan = props.onBarcodeScanned;
    return null;
  },
  useCameraPermissions: jest.fn(),
}));
jest.mock('expo-router', () => ({ useIsFocused: () => true }));

const clock = createFixedClock('2026-10-05T16:42:00Z');
const TOKEN = 'eyJhbGciOiJFUzI1NiJ9.eyJqdGkiOiIxIn0.c2ln';

async function setup(
  validateUnit: ReturnType<typeof createFakeAccessControl>['validateUnit'],
  { granted = true, onCancel }: { granted?: boolean; onCancel?: () => void } = {},
) {
  jest
    .mocked(useCameraPermissions)
    .mockReturnValue([
      { granted, canAskAgain: true, status: granted ? 'granted' : 'denied', expires: 'never' },
      jest.fn(),
      jest.fn(),
    ] as never);
  useSessionStore.getState().setSession(buildSession());
  const onAdmitted = jest.fn();
  const user = userEvent.setup();
  await renderWithDeps(
    <VehicleScanScreen roleLabel="Seguridad" onAdmitted={onAdmitted} onCancel={onCancel} />,
    { clock, accessControl: createFakeAccessControl(clock, { validateUnit }) },
  );
  const scan = (data: string) => act(async () => mockCamera.onScan?.({ data }));
  return { user, onAdmitted, scan };
}

describe('VehicleScanScreen', () => {
  it('muestra el título y la guía del mockup', async () => {
    await setup(jest.fn());

    expect(screen.getByRole('heading', { name: 'Escanear QR del vehículo' })).toBeOnTheScreen();
    expect(screen.getByText('Apunta al código QR del vehículo')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Cancelar' })).not.toBeOnTheScreen();
  });

  it('un QR válido abre el flujo de visitantes', async () => {
    const validation = { mode: 'entry' } as UnitValidation;
    const validateUnit = jest.fn(async () => ok(validation));
    const { scan, onAdmitted } = await setup(validateUnit);

    await scan(TOKEN);

    expect(validateUnit).toHaveBeenCalledWith(TOKEN);
    expect(onAdmitted).toHaveBeenCalledWith(validation);
  });

  it('un rechazo explica el motivo y permite escanear otro', async () => {
    const user = userEvent.setup();
    const validateUnit = jest.fn(async () =>
      err({ type: 'qr' as const, error: { type: 'Expired' as const } }),
    );
    const { scan } = await setup(validateUnit);

    await scan(TOKEN);

    expect(screen.getByRole('heading', { name: 'Ingreso no permitido' })).toBeOnTheScreen();
    expect(
      screen.getByText('El QR del vehículo venció. Solicita uno nuevo al transportista.'),
    ).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Escanear otro' }));
    expect(screen.getByText('Apunta al código QR del vehículo')).toBeOnTheScreen();
  });

  it('un QR que no es del vehículo se explica sin validar', async () => {
    const validateUnit = jest.fn();
    const { scan } = await setup(validateUnit);

    await scan('VI000007');

    expect(
      screen.getByText(
        'Este QR no es el del vehículo. Escanea el QR del vehículo para ver sus visitantes.',
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText('Voucher')).toBeOnTheScreen();
    expect(validateUnit).not.toHaveBeenCalled();
  });

  it('sin permiso de cámara lo solicita', async () => {
    await setup(jest.fn(), { granted: false });

    expect(screen.getByRole('button', { name: 'Permitir cámara' })).toBeOnTheScreen();
  });

  it('abierto desde otro flujo ofrece cancelar', async () => {
    const onCancel = jest.fn();
    const { user } = await setup(jest.fn(), { onCancel });

    await user.press(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onCancel).toHaveBeenCalled();
  });
});
