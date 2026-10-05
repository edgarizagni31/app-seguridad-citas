import { screen, userEvent } from '@testing-library/react-native';
import { Text } from 'react-native';

import { resetSessionStore, useSessionStore } from '../stores/session-store';
import { buildSession, buildSessionUser } from '@/test/factories/auth';
import { renderWithDeps } from '@/test/render-with-deps';

import { RoleGate } from './role-gate';

const signInAs = (roles: string[]) =>
  useSessionStore.getState().setSession(buildSession({ user: buildSessionUser({ roles }) }));

beforeEach(() => resetSessionStore());

describe('RoleGate', () => {
  it('deja pasar a usuarios con rol de seguridad', async () => {
    signInAs(['PACCESO_ASEGURIDAD']);

    await renderWithDeps(
      <RoleGate>
        <Text>Contenido de garita</Text>
      </RoleGate>,
    );

    expect(screen.getByText('Contenido de garita')).toBeOnTheScreen();
  });

  it('bloquea a usuarios sin rol de seguridad', async () => {
    signInAs(['PACCESO_CLIENTE']);

    await renderWithDeps(
      <RoleGate>
        <Text>Contenido de garita</Text>
      </RoleGate>,
    );

    expect(screen.queryByText('Contenido de garita')).not.toBeOnTheScreen();
    expect(
      screen.getByRole('heading', { name: 'Sin acceso al control de garita' }),
    ).toBeOnTheScreen();
  });

  it('desde el bloqueo se puede cerrar sesión', async () => {
    const user = userEvent.setup();
    signInAs([]);
    const { dependencies } = await renderWithDeps(
      <RoleGate>
        <Text>Contenido de garita</Text>
      </RoleGate>,
    );

    await user.press(screen.getByRole('button', { name: 'Cerrar sesión' }));

    expect(dependencies.auth.logout).toHaveBeenCalled();
    expect(useSessionStore.getState().status).toBe('anonymous');
  });
});
