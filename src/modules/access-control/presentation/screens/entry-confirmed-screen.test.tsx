import { screen, userEvent } from '@testing-library/react-native';
import { useRouter } from 'expo-router';

import { resetEntryFlow, useEntryFlowStore } from '../stores/entry-flow-store';
import { useSessionStore } from '@/modules/auth';
import { buildSession } from '@/test/factories/auth';
import { buildEntryRecord } from '@/test/factories/entry';
import { createFakeSync } from '@/test/fakes/sync';
import { renderWithDeps } from '@/test/render-with-deps';

import { EntryConfirmedScreen } from './entry-confirmed-screen';

jest.mock('expo-router', () => ({ useRouter: jest.fn(), Redirect: () => null }));

const router = { dismissTo: jest.fn(), replace: jest.fn() };

async function setup(pending = 0) {
  jest.mocked(useRouter).mockReturnValue(router as never);
  useSessionStore.getState().setSession(buildSession());
  resetEntryFlow();
  useEntryFlowStore.getState().finish(buildEntryRecord());
  const user = userEvent.setup();
  await renderWithDeps(<EntryConfirmedScreen />, {
    sync: createFakeSync({ pending, failed: 0, attention: 0 }),
  });
  return { user };
}

describe('EntryConfirmedScreen', () => {
  it('resume quién ingresó, la hora y el vehículo pendiente de inspección', async () => {
    await setup();

    expect(screen.getByRole('heading', { name: 'Ingreso confirmado' })).toBeOnTheScreen();
    expect(screen.getByText('10:44 a. m.')).toBeOnTheScreen();
    expect(screen.getByText('Ingresó')).toBeOnTheScreen();
    expect(screen.getByText('No llegó')).toBeOnTheScreen();
    expect(screen.getByText('Pendiente de inspección')).toBeOnTheScreen();
    expect(
      await screen.findByText('La inspección vehicular la realiza el equipo HSE.'),
    ).toBeOnTheScreen();
  });

  it('avisa si el ingreso todavía no se envió al servidor', async () => {
    await setup(1);

    expect(
      await screen.findByText('Se enviará al servidor en cuanto haya conexión.'),
    ).toBeOnTheScreen();
  });

  it('ofrece realizar la inspección opcional', async () => {
    const { user } = await setup();

    await user.press(screen.getByRole('button', { name: 'Realizar inspección (opcional)' }));
    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/inspection/[vehicleId]',
      params: { vehicleId: 'veh-abc-123' },
    });
  });

  it('volver al inicio cierra el flujo', async () => {
    const { user } = await setup();

    await user.press(screen.getByRole('button', { name: 'Volver al inicio' }));

    expect(router.dismissTo).toHaveBeenCalledWith('/');
    expect(useEntryFlowStore.getState().record).toBeNull();
  });
});
