import { screen, userEvent } from '@testing-library/react-native';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';

import { readQr } from '../../application';
import { resetScanStore, useScanStore } from '../stores/scan-store';
import { useSessionStore } from '@/modules/auth';
import { createFixedClock } from '@/test/fakes/fixed-clock';
import { buildSession } from '@/test/factories/auth';
import { renderWithDeps } from '@/test/render-with-deps';

import { HomeScreen } from './home-screen';

jest.mock('expo-router', () => ({ useRouter: jest.fn() }));
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(async () => true) }));

const push = jest.fn();
const clock = createFixedClock('2026-10-05T18:00:00Z');

async function setup(scannedContent?: string) {
  jest.mocked(useRouter).mockReturnValue({ push } as never);
  useSessionStore.getState().setSession(buildSession());
  resetScanStore();
  if (scannedContent) {
    const scanClock = createFixedClock('2026-10-05T16:42:00Z');
    useScanStore.getState().setLastScan(readQr({ clock: scanClock })(scannedContent));
  }
  const user = userEvent.setup();
  await renderWithDeps(<HomeScreen />, { clock });
  return { user };
}

describe('HomeScreen', () => {
  it('saluda al usuario con su rol', async () => {
    await setup();

    expect(screen.getByRole('heading', { name: 'Hola, Carlos' })).toBeOnTheScreen();
    expect(screen.getByText('Seguridad')).toBeOnTheScreen();
  });

  it('sin lecturas muestra el estado vacío y abre el escáner', async () => {
    const { user } = await setup();

    expect(screen.getByText('Aún no has escaneado ningún código')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Escanear QR' }));

    expect(push).toHaveBeenCalledWith('/scanner');
  });

  it('muestra la unidad de transporte leída como en el mockup', async () => {
    await setup('APPSCH00000000000123-ABC-123');

    expect(screen.getByRole('heading', { name: 'Unidad de transporte' })).toBeOnTheScreen();
    expect(screen.getByText('Leído hoy 10:42 a. m.')).toBeOnTheScreen();
    expect(screen.getByText('APPSCH00000000000123')).toBeOnTheScreen();
    expect(screen.getByLabelText('Placa ABC-123')).toBeOnTheScreen();
    expect(screen.getByText('APPSCH00000000000123-ABC-123')).toBeOnTheScreen();
    expect(screen.getByRole('status')).toHaveTextContent(/Lectura correcta/);
    expect(screen.getByRole('button', { name: 'Escanear otro' })).toBeOnTheScreen();
  });

  it('un QR no reconocido se anuncia como alerta', async () => {
    await setup('hola mundo');

    expect(screen.getByRole('heading', { name: 'No reconocido' })).toBeOnTheScreen();
    expect(screen.getByRole('alert')).toHaveTextContent(/no corresponde a ningún formato/);
  });

  it('copia el contenido leído', async () => {
    const { user } = await setup('VI000007');

    await user.press(screen.getByRole('button', { name: 'Copiar' }));

    expect(Clipboard.setStringAsync).toHaveBeenCalledWith('VI000007');
    expect(await screen.findByRole('button', { name: 'Copiado' })).toBeOnTheScreen();
  });
});
