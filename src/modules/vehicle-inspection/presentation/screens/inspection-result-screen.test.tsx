import { screen, userEvent } from '@testing-library/react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import type { StoredInspection } from '../../domain';
import { createFakeConnectivity } from '@/test/fakes/connectivity';
import { createFakeInspections } from '@/test/fakes/test-dependencies';
import { renderWithDeps } from '@/test/render-with-deps';

import { InspectionResultScreen } from './inspection-result-screen';

jest.mock('expo-router', () => ({ useRouter: jest.fn(), useLocalSearchParams: jest.fn() }));

const router = { dismissTo: jest.fn() };
const SEAL = '¿El vehículo cuenta con precinto trasero izquierdo?: No';

const inspection = (overrides: Partial<StoredInspection> = {}) =>
  ({
    id: 'insp-1',
    plate: 'ABC-123',
    state: 'submitted',
    answers: {},
    syncStatus: 'pending',
    syncMessage: null,
    verdict: null,
    ...overrides,
  }) as StoredInspection;

async function setup(stored: StoredInspection, online = true) {
  jest.mocked(useRouter).mockReturnValue(router as never);
  jest.mocked(useLocalSearchParams).mockReturnValue({ inspectionId: 'insp-1' });
  const user = userEvent.setup();
  await renderWithDeps(<InspectionResultScreen />, {
    connectivity: createFakeConnectivity(online),
    inspections: createFakeInspections({ get: jest.fn(async () => stored) }),
  });
  return { user };
}

describe('InspectionResultScreen', () => {
  it('sin red queda guardada y pendiente de envío', async () => {
    await setup(inspection(), false);

    expect(await screen.findByRole('heading', { name: 'Inspección guardada' })).toBeOnTheScreen();
    expect(
      screen.getByText('Se enviará automáticamente en cuanto haya conexión.'),
    ).toBeOnTheScreen();
  });

  it('con red y sin veredicto se está enviando', async () => {
    await setup(inspection());

    expect(await screen.findByRole('heading', { name: 'Enviando inspección…' })).toBeOnTheScreen();
  });

  it('el servidor la da por conforme', async () => {
    await setup(
      inspection({ syncStatus: 'synced', verdict: { compliant: true, nonCompliant: [] } }),
    );

    expect(await screen.findByRole('heading', { name: 'Inspección conforme' })).toBeOnTheScreen();
    expect(screen.queryByText('Controles no conformes')).not.toBeOnTheScreen();
  });

  it('no conforme lista los controles que fallaron', async () => {
    await setup(
      inspection({ syncStatus: 'synced', verdict: { compliant: false, nonCompliant: [SEAL] } }),
    );

    expect(
      await screen.findByRole('heading', { name: 'Inspección no conforme' }),
    ).toBeOnTheScreen();
    expect(screen.getByRole('heading', { name: 'Controles no conformes' })).toBeOnTheScreen();
    expect(screen.getByText(SEAL)).toBeOnTheScreen();
  });

  it('la placa que no coincide muestra la indicación para el supervisor', async () => {
    await setup(inspection({ state: 'observed' }));

    expect(await screen.findByRole('heading', { name: 'Inspección observada' })).toBeOnTheScreen();
  });

  it('un rechazo muestra el motivo del servidor y se vuelve a la lista', async () => {
    const { user } = await setup(
      inspection({ syncStatus: 'rejected', syncMessage: 'La foto supera los 500 KB.' }),
    );

    expect(await screen.findByText('La foto supera los 500 KB.')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Volver a inspecciones' }));
    expect(router.dismissTo).toHaveBeenCalledWith('/inspections');
  });
});
