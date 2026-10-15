import { screen, userEvent } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';

import { useSessionStore } from '@/modules/auth';
import { err } from '@/shared/domain';
import { buildSession, buildSessionUser } from '@/test/factories/auth';
import { createFixedClock } from '@/test/fakes/fixed-clock';
import { createFakeSync } from '@/test/fakes/sync';
import { createFakeSitesUseCases } from '@/test/fakes/test-dependencies';
import { renderWithDeps } from '@/test/render-with-deps';

import { ProfileScreen } from './profile-screen';

jest.mock('expo-router', () => ({ useRouter: jest.fn() }));

const router = { push: jest.fn() };

// El paquete de prueba se generó a las 16:42 UTC
const clock = createFixedClock('2026-10-05T16:57:00Z');

async function setup(
  overrides: Parameters<typeof renderWithDeps>[1] = {},
  roles: string[] = ['PACCESO_AHSE'],
) {
  jest.mocked(useRouter).mockReturnValue(router as never);
  useSessionStore.getState().setSession(buildSession({ user: buildSessionUser({ roles }) }));
  const user = userEvent.setup();
  const result = await renderWithDeps(<ProfileScreen />, { clock, ...overrides });
  return { user, ...result };
}

describe('ProfileScreen · soporte', () => {
  it('sin el rol de soporte no muestra el acceso', async () => {
    await setup();

    await screen.findByText('Almacén Central');
    expect(
      screen.queryByRole('button', { name: 'Soporte: datos sin sincronizar' }),
    ).not.toBeOnTheScreen();
  });

  it('solo soporte: sin sede y con acceso a la pantalla de soporte', async () => {
    const { user } = await setup({}, ['PACCESO_SOPORTE']);

    expect(screen.getByText('Soporte')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Actualizar datos' })).not.toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Soporte: datos sin sincronizar' }));

    expect(router.push).toHaveBeenCalledWith('/support');
  });

  it('soporte que también es de seguridad conserva su sede', async () => {
    await setup({}, ['PACCESO_ASEGURIDAD', 'PACCESO_SOPORTE']);

    expect(await screen.findByText('Almacén Central')).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Soporte: datos sin sincronizar' }),
    ).toBeOnTheScreen();
  });
});

describe('ProfileScreen', () => {
  it('muestra el usuario, su rol, la sede y la antigüedad de los datos', async () => {
    await setup();

    expect(screen.getByRole('heading', { name: 'Mi perfil' })).toBeOnTheScreen();
    expect(screen.getByText('HSE')).toBeOnTheScreen();
    expect(await screen.findByText('Almacén Central')).toBeOnTheScreen();
    expect(screen.getByText('Actualizado hace 15 min')).toBeOnTheScreen();
    expect(screen.getByText('Todo sincronizado')).toBeOnTheScreen();
  });

  it('actualiza los datos del día de la sede actual', async () => {
    const { user, dependencies } = await setup();
    await screen.findByText('Almacén Central');

    await user.press(screen.getByRole('button', { name: 'Actualizar datos' }));

    expect(dependencies.sites.startShift).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'site-central' }),
    );
  });

  it('avisa si no se pudo actualizar por falta de red', async () => {
    const sites = createFakeSitesUseCases({
      startShift: jest.fn(async () => err({ type: 'network' as const })),
    });
    const { user } = await setup({ sites });
    await screen.findByText('Almacén Central');

    await user.press(screen.getByRole('button', { name: 'Actualizar datos' }));

    expect(
      await screen.findByText('No se pudieron actualizar los datos. Verifica tu conexión.'),
    ).toBeOnTheScreen();
  });

  it('permite cambiar de sede', async () => {
    const { user, dependencies } = await setup();

    await user.press(screen.getByRole('button', { name: 'Cambiar sede' }));

    expect(dependencies.sites.changeSite).toHaveBeenCalled();
  });

  it('cierra sesión directo si no hay pendientes', async () => {
    const { user, dependencies } = await setup();

    await user.press(screen.getByRole('button', { name: 'Cerrar sesión' }));

    expect(dependencies.auth.logout).toHaveBeenCalled();
  });

  it('con pendientes avisa antes de cerrar sesión', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const sync = createFakeSync({ pending: 2, failed: 0, attention: 0 });
    const { user, dependencies } = await setup({ sync });

    expect(await screen.findByText('2 registros pendientes')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Cerrar sesión' }));

    expect(alert).toHaveBeenCalledWith(
      'Tienes registros sin sincronizar',
      expect.stringContaining('2 registros pendientes'),
      expect.any(Array),
    );
    expect(dependencies.auth.logout).not.toHaveBeenCalled();
    alert.mockRestore();
  });
});
