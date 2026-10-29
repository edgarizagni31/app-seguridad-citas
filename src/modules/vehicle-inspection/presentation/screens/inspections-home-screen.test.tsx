import { screen, userEvent } from '@testing-library/react-native';
import { useRouter } from 'expo-router';

import { useSessionStore } from '@/modules/auth';
import { createChangeBus } from '@/shared/infrastructure/db';
import { buildSession, buildSessionUser } from '@/test/factories/auth';
import { createFixedClock } from '@/test/fakes/fixed-clock';
import { createMemoryInspections, TEST_TARGET } from '@/test/fakes/inspections';
import { renderWithDeps } from '@/test/render-with-deps';

import { InspectionsHomeScreen } from './inspections-home-screen';

jest.mock('expo-router', () => ({ useRouter: jest.fn() }));

const NOW = new Date('2026-10-12T16:42:00Z');
const router = { push: jest.fn() };
const INSPECTOR = { id: 'user-ana', name: 'Ana Morales' };
const SECOND = { ...TEST_TARGET, unitId: 'vtu-2', plate: 'XYZ-789' };

async function setup({ withInspections = false } = {}) {
  jest.mocked(useRouter).mockReturnValue(router as never);
  useSessionStore.getState().setSession(
    buildSession({
      user: buildSessionUser({ firstName: 'Ana', lastName: 'Morales', roles: ['PACCESO_AHSE'] }),
    }),
  );
  const changes = createChangeBus();
  const memory = createMemoryInspections({ changes, now: NOW });
  if (withInspections) {
    await memory.useCases.open({ target: TEST_TARGET, inspector: INSPECTOR });
    const closed = await memory.useCases.open({ target: SECOND, inspector: INSPECTOR });
    if (!closed.ok) throw new Error(closed.error.type);
    await memory.useCases.reportMismatch(closed.value.id);
    await memory.repo.markSynced(closed.value.id, {
      compliant: false,
      nonCompliant: ['Placa: No coincide'],
    });
  }
  const user = userEvent.setup();
  await renderWithDeps(<InspectionsHomeScreen />, {
    changes,
    clock: createFixedClock(NOW.toISOString()),
    inspections: memory.useCases,
  });
  return { user };
}

describe('InspectionsHomeScreen', () => {
  it('muestra el saludo HSE, la fecha y que aún no hay inspecciones', async () => {
    await setup();

    expect(
      await screen.findByRole('heading', { name: 'Aún no hay inspecciones' }),
    ).toBeOnTheScreen();
    expect(screen.getByRole('heading', { name: 'Hola, Ana' })).toBeOnTheScreen();
    expect(screen.getByText('HSE')).toBeOnTheScreen();
    expect(screen.getByText('Hoy, 12 de octubre')).toBeOnTheScreen();
  });

  it('el botón principal abre el escáner del QR de la cita', async () => {
    const { user } = await setup();

    await user.press(await screen.findByRole('button', { name: 'Escanear QR de la cita' }));

    expect(router.push).toHaveBeenCalledWith('/inspections/scan');
  });

  it('un borrador del teléfono vuelve al inicio de su inspección', async () => {
    const { user } = await setup({ withInspections: true });

    await user.press(await screen.findByRole('button', { name: 'ABC-123, En curso' }));

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/inspection/[unitId]',
      params: TEST_TARGET,
    });
  });

  it('una inspección enviada abre su resultado', async () => {
    const { user } = await setup({ withInspections: true });

    await user.press(await screen.findByRole('button', { name: 'XYZ-789, No conforme' }));

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/inspection/result/[inspectionId]',
      params: { inspectionId: 'insp-2' },
    });
  });
});
