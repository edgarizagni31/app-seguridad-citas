import { screen, userEvent } from '@testing-library/react-native';
import { useRouter } from 'expo-router';

import { useSessionStore } from '@/modules/auth';
import { createChangeBus } from '@/shared/infrastructure/db';
import { buildDemoSnapshot } from '@/shared/infrastructure/demo';
import { buildSession, buildSessionUser } from '@/test/factories/auth';
import { createFixedClock } from '@/test/fakes/fixed-clock';
import { createMemoryInspections } from '@/test/fakes/inspections';
import { renderWithDeps } from '@/test/render-with-deps';

import { InspectionsHomeScreen } from './inspections-home-screen';

jest.mock('expo-router', () => ({ useRouter: jest.fn() }));

const NOW = new Date('2026-10-12T16:42:00Z');
const router = { push: jest.fn() };

async function setup() {
  jest.mocked(useRouter).mockReturnValue(router as never);
  useSessionStore.getState().setSession(
    buildSession({
      user: buildSessionUser({ firstName: 'Ana', lastName: 'Morales', roles: ['PACCESO_AHSE'] }),
    }),
  );
  const changes = createChangeBus();
  const snapshot = buildDemoSnapshot('site-central', 'Almacén Central', '2026-10-12', NOW);
  const memory = createMemoryInspections({ changes, snapshot, now: NOW });
  const user = userEvent.setup();
  await renderWithDeps(<InspectionsHomeScreen />, {
    changes,
    clock: createFixedClock(NOW.toISOString()),
    inspections: memory.useCases,
  });
  return { user };
}

describe('InspectionsHomeScreen', () => {
  it('muestra el saludo HSE, la fecha y los indicadores del día', async () => {
    await setup();

    expect(await screen.findByText('DOLLAR CITY')).toBeOnTheScreen();
    expect(screen.getByRole('heading', { name: 'Hola, Ana' })).toBeOnTheScreen();
    expect(screen.getByText('HSE')).toBeOnTheScreen();
    expect(screen.getByText('Hoy, 12 de octubre')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Pendientes: 1' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'En curso: 1' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Inspeccionados: 3' })).toBeOnTheScreen();
  });

  it('agrupa los vehículos ingresados por cita y abre su inspección', async () => {
    const { user } = await setup();

    await user.press(
      await screen.findByRole('button', { name: 'MNP-456, Pendiente de inspección' }),
    );

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/inspection/[vehicleId]',
      params: { vehicleId: 'veh-mnp-456' },
    });
  });

  it('filtra por estado y busca por placa', async () => {
    const { user } = await setup();
    await screen.findByText('DOLLAR CITY');

    await user.press(screen.getByRole('tab', { name: 'Pendientes' }));
    expect(screen.queryByText('PRICESMART')).not.toBeOnTheScreen();
    expect(screen.getByText('MNP-456')).toBeOnTheScreen();

    await user.press(screen.getByRole('tab', { name: 'Todos' }));
    await user.type(screen.getByLabelText('Buscar por placa o voucher'), 'xyz789');
    expect(screen.getByText('XYZ-789')).toBeOnTheScreen();
    expect(screen.queryByText('MNP-456')).not.toBeOnTheScreen();
  });

  it('el botón de QR abre el escáner y la cita su detalle', async () => {
    const { user } = await setup();

    await user.press(screen.getByRole('button', { name: 'Escanear QR del vehículo' }));
    expect(router.push).toHaveBeenCalledWith('/inspections/scan');

    await user.press(
      await screen.findByRole('button', { name: 'DELOSI, Voucher APPASP0000000000000093' }),
    );
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/inspections/appointment/[appointmentId]',
      params: { appointmentId: 'apt-delosi' },
    });
  });
});
