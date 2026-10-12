import { screen, userEvent } from '@testing-library/react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useSessionStore } from '@/modules/auth';
import { createChangeBus } from '@/shared/infrastructure/db';
import { buildDemoSnapshot } from '@/shared/infrastructure/demo';
import { buildSession, buildSessionUser } from '@/test/factories/auth';
import { createMemoryInspections } from '@/test/fakes/inspections';
import { renderWithDeps } from '@/test/render-with-deps';

import { InspectionStartScreen } from './inspection-start-screen';

jest.mock('expo-router', () => ({ useRouter: jest.fn(), useLocalSearchParams: jest.fn() }));

const NOW = new Date('2026-10-05T17:00:00Z');
const router = { replace: jest.fn(), back: jest.fn() };

async function setup(vehicleId: string) {
  jest.mocked(useRouter).mockReturnValue(router as never);
  jest.mocked(useLocalSearchParams).mockReturnValue({ vehicleId });
  useSessionStore.getState().setSession(
    buildSession({
      user: buildSessionUser({
        id: 'user-ana',
        firstName: 'Ana',
        lastName: 'Morales',
        roles: ['PACCESO_AHSE'],
      }),
    }),
  );
  const changes = createChangeBus();
  const snapshot = buildDemoSnapshot('site-central', 'Almacén Central', '2026-10-05', NOW);
  const memory = createMemoryInspections({ changes, snapshot, now: NOW });
  const user = userEvent.setup();
  await renderWithDeps(<InspectionStartScreen />, { changes, inspections: memory.useCases });
  return { user, memory };
}

describe('InspectionStartScreen', () => {
  it('muestra el vehículo, el voucher, el ingreso y el inspector', async () => {
    await setup('veh-mnp-456');

    expect(await screen.findByText('MNP-456')).toBeOnTheScreen();
    expect(screen.getByText('APPASP0000000000000094')).toBeOnTheScreen();
    expect(screen.getByText('DOLLAR CITY')).toBeOnTheScreen();
    expect(screen.getByText('Ingreso confirmado - 1 visitante')).toBeOnTheScreen();
    expect(screen.getByText('Ana Morales - HSE')).toBeOnTheScreen();
  });

  it('iniciar crea el borrador y abre el cuestionario', async () => {
    const { user, memory } = await setup('veh-mnp-456');

    await user.press(await screen.findByRole('button', { name: 'Iniciar inspección' }));

    expect(memory.useCases.open).toHaveBeenCalledWith({
      vehicleId: 'veh-mnp-456',
      inspector: { id: 'user-ana', name: 'Ana Morales' },
    });
    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/inspection/wizard/[inspectionId]',
      params: { inspectionId: 'insp-1' },
    });
  });

  it('un vehículo sin ingreso no aparece para inspeccionar', async () => {
    await setup('veh-abc-123');

    expect(
      await screen.findByText(
        'El vehículo no está en los datos del día. Actualízalos desde Mi perfil.',
      ),
    ).toBeOnTheScreen();
  });

  it('con una inspección cerrada ofrece ver el resultado', async () => {
    await setup('veh-jkl-101');

    expect(await screen.findByRole('button', { name: 'Ver resultado' })).toBeOnTheScreen();
    expect(screen.getByText('La inspección de este vehículo ya se cerró.')).toBeOnTheScreen();
  });
});
