import { act, screen, userEvent } from '@testing-library/react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { createChangeBus } from '@/shared/infrastructure/db';
import { buildDemoSnapshot } from '@/shared/infrastructure/demo';
import { createMemoryInspections } from '@/test/fakes/inspections';
import { renderWithDeps } from '@/test/render-with-deps';

import { AppointmentDetailScreen } from './appointment-detail-screen';

jest.mock('expo-router', () => ({ useRouter: jest.fn(), useLocalSearchParams: jest.fn() }));

const NOW = new Date('2026-10-05T17:00:00Z');
const router = { push: jest.fn(), back: jest.fn() };

// Las llamadas directas a los casos de uso disparan el bus de cambios: van dentro de act
const inAct =
  <A extends unknown[], R>(fn: (...args: A) => Promise<R>) =>
  (...args: A) =>
    act(() => fn(...args));

async function setup(appointmentId: string) {
  jest.mocked(useRouter).mockReturnValue(router as never);
  jest.mocked(useLocalSearchParams).mockReturnValue({ appointmentId });
  const changes = createChangeBus();
  const snapshot = buildDemoSnapshot('site-central', 'Almacén Central', '2026-10-05', NOW);
  const memory = createMemoryInspections({ changes, snapshot, now: NOW });
  const user = userEvent.setup();
  await renderWithDeps(<AppointmentDetailScreen />, { changes, inspections: memory.useCases });
  return { user, memory };
}

describe('AppointmentDetailScreen', () => {
  it('muestra la cita con sus vehículos ingresados', async () => {
    await setup('apt-dollarcity');

    expect(await screen.findByRole('heading', { name: /^Cita / })).toBeOnTheScreen();
    expect(screen.getByText('1 visitante ingresó')).toBeOnTheScreen();
    expect(screen.getByText('Almacén Central')).toBeOnTheScreen();
    expect(screen.getByText('Vehículos (1)')).toBeOnTheScreen();
    expect(screen.getByText('MNP-456')).toBeOnTheScreen();
  });

  it('un vehículo pendiente ofrece iniciar la inspección', async () => {
    const { user } = await setup('apt-dollarcity');

    await user.press(await screen.findByRole('button', { name: 'Iniciar inspección' }));

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/inspection/[vehicleId]',
      params: { vehicleId: 'veh-mnp-456' },
    });
  });

  it('un borrador muestra el paso y el porcentaje para continuar', async () => {
    const { memory } = await setup('apt-dollarcity');
    const opened = await inAct(memory.useCases.open)({
      vehicleId: 'veh-mnp-456',
      inspector: { id: 'u', name: 'Ana' },
    });
    if (opened.ok) {
      await inAct(memory.useCases.answer)(opened.value.id, 'front-plate', {
        kind: 'plate',
        confirmed: true,
      });
    }

    expect(await screen.findByRole('button', { name: 'Continuar inspección' })).toBeOnTheScreen();
    expect(screen.getAllByText('Paso 2 de 15').length).toBeGreaterThan(0);
    expect(screen.getByText('7%')).toBeOnTheScreen();
  });
});
