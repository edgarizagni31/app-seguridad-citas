import { screen, userEvent } from '@testing-library/react-native';

import { resetSessionStore, useSessionStore } from '../stores/session-store';
import type { AuthUseCases } from '@/core/di';
import { err, ok } from '@/shared/domain';
import { createFakeAuthUseCases, createTestDependencies } from '@/test/fakes/test-dependencies';
import { buildSession } from '@/test/factories/auth';
import { renderWithDeps } from '@/test/render-with-deps';

import { LoginScreen } from './login-screen';

async function setup(login?: AuthUseCases['login'], isDemoAuth = false) {
  const user = userEvent.setup();
  const auth = createFakeAuthUseCases(login ? { login } : {});
  const config = { ...createTestDependencies().config, isDemoAuth };
  await renderWithDeps(<LoginScreen />, { auth, config });

  const signIn = async (email = 'carlos.mendez@empresa.com', password = 'clave') => {
    if (email) await user.type(screen.getByLabelText('Correo'), email);
    if (password) await user.type(screen.getByLabelText('Contraseña'), password);
    await user.press(screen.getByRole('button', { name: 'Ingresar' }));
  };
  return { auth, user, signIn };
}

beforeEach(() => resetSessionStore());

describe('LoginScreen', () => {
  it('muestra el formulario de los mockups', async () => {
    await setup();

    expect(screen.getByRole('heading', { name: 'Iniciar sesión' })).toBeOnTheScreen();
    expect(screen.getByText('Usa tu cuenta de Ransa 360')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Ingresar' })).toBeOnTheScreen();
  });

  it('inicia sesión y guarda la sesión en el store', async () => {
    const session = buildSession();
    const { auth, signIn } = await setup(jest.fn(async () => ok(session)));

    await signIn();

    expect(auth.login).toHaveBeenCalledWith('carlos.mendez@empresa.com', 'clave');
    expect(useSessionStore.getState()).toMatchObject({ status: 'authenticated', session });
  });

  it('valida los campos antes de llamar al servidor', async () => {
    const { auth, signIn } = await setup();

    await signIn('', '');

    expect(await screen.findByText('Ingresa tu correo')).toBeOnTheScreen();
    expect(screen.getByText('Ingresa tu contraseña')).toBeOnTheScreen();
    expect(auth.login).not.toHaveBeenCalled();
  });

  it('rechaza correos con formato inválido', async () => {
    const { signIn } = await setup();

    await signIn('no-es-correo');

    expect(await screen.findByText('Ingresa un correo válido')).toBeOnTheScreen();
  });

  it('con credenciales inválidas muestra el banner y el error en la contraseña', async () => {
    const { signIn } = await setup(
      jest.fn(async () => err({ type: 'invalid-credentials' as const })),
    );

    await signIn();

    expect(
      await screen.findByRole('alert', { name: /No pudimos iniciar sesión/ }),
    ).toBeOnTheScreen();
    expect(screen.getByText('Correo o contraseña incorrectos')).toBeOnTheScreen();
    expect(useSessionStore.getState().status).not.toBe('authenticated');
  });

  it('sin red informa el problema de conexión', async () => {
    const { signIn } = await setup(jest.fn(async () => err({ type: 'network' as const })));

    await signIn();

    expect(await screen.findByText(/Sin conexión con el servidor/)).toBeOnTheScreen();
  });

  it('pide cambiar la contraseña en el portal web', async () => {
    const { signIn } = await setup(
      jest.fn(async () => err({ type: 'password-change-required' as const })),
    );

    await signIn();

    expect(await screen.findByText('Debes cambiar tu contraseña')).toBeOnTheScreen();
  });

  it('permite mostrar y ocultar la contraseña', async () => {
    const { user } = await setup();

    await user.press(screen.getByRole('button', { name: 'Mostrar contraseña' }));

    expect(screen.getByLabelText('Contraseña')).toHaveProp('secureTextEntry', false);
    expect(screen.getByRole('button', { name: 'Ocultar contraseña' })).toBeOnTheScreen();
  });

  it('avisa cuando la autenticación es simulada', async () => {
    await setup(undefined, true);

    expect(screen.getByText('Modo demo: autenticación simulada')).toBeOnTheScreen();
  });

  it('informa que la sesión expiró', async () => {
    useSessionStore.getState().clearSession('session-expired');
    await setup();

    expect(screen.getByText('Tu sesión expiró. Vuelve a iniciar sesión.')).toBeOnTheScreen();
  });
});
