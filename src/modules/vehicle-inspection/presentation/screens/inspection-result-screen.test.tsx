import { screen, userEvent } from '@testing-library/react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import type { StoredInspection } from '../../domain';
import { createFakeConnectivity } from '@/test/fakes/connectivity';
import { createFakeInspections } from '@/test/fakes/test-dependencies';
import { renderWithDeps } from '@/test/render-with-deps';

import { InspectionResultScreen } from './inspection-result-screen';

jest.mock('expo-router', () => ({ useRouter: jest.fn(), useLocalSearchParams: jest.fn() }));

const router = { dismissTo: jest.fn() };
const photo = (stepId: string) => ({
  kind: 'photo',
  photo: { id: stepId, uri: `file:///${stepId}` },
});

const inspection = (overrides: Partial<StoredInspection> = {}) =>
  ({
    id: 'insp-1',
    plate: 'MNP-456',
    state: 'submitted',
    answers: { 'front-photo': photo('front-photo'), 'cabin-photo': photo('cabin-photo') },
    syncStatus: 'pending',
    syncMessage: null,
    uploadedPhotos: 0,
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

  it('con red muestra el avance de la subida de fotos', async () => {
    await setup(inspection({ uploadedPhotos: 1 }));

    expect(await screen.findByText('Subiendo fotos 1 de 2')).toBeOnTheScreen();
  });

  it('enviada, observada o rechazada', async () => {
    await setup(inspection({ syncStatus: 'synced' }));
    expect(await screen.findByRole('heading', { name: 'Inspección enviada' })).toBeOnTheScreen();
  });

  it('la placa que no coincide muestra la indicación para el supervisor', async () => {
    await setup(inspection({ state: 'observed' }));

    expect(await screen.findByRole('heading', { name: 'Inspección observada' })).toBeOnTheScreen();
  });

  it('un rechazo muestra el motivo del servidor y se vuelve a la lista', async () => {
    const { user } = await setup(
      inspection({ syncStatus: 'rejected', syncMessage: 'Ya fue inspeccionado.' }),
    );

    expect(await screen.findByText('Ya fue inspeccionado.')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Volver a inspecciones' }));
    expect(router.dismissTo).toHaveBeenCalledWith('/inspections');
  });
});
