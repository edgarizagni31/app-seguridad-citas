import { screen, userEvent } from '@testing-library/react-native';
import { useRouter } from 'expo-router';

import { resetEntryFlow, useEntryFlowStore } from '../stores/entry-flow-store';
import { useSessionStore } from '@/modules/auth';
import { err } from '@/shared/domain';
import { buildSession } from '@/test/factories/auth';
import { buildUnitValidation } from '@/test/factories/entry';
import { createFakeAccessControl } from '@/test/fakes/test-dependencies';
import { createFixedClock } from '@/test/fakes/fixed-clock';
import { renderWithDeps } from '@/test/render-with-deps';

import { AddVisitorScreen } from './add-visitor-screen';

jest.mock('expo-router', () => ({ useRouter: jest.fn(), Redirect: () => null }));
jest.mock('expo-crypto', () => ({ randomUUID: () => 'vis-nuevo' }));

const clock = createFixedClock('2026-10-05T16:42:00Z');
const router = { back: jest.fn() };

async function setup(overrides: Parameters<typeof createFakeAccessControl>[1] = {}) {
  jest.mocked(useRouter).mockReturnValue(router as never);
  useSessionStore.getState().setSession(buildSession());
  resetEntryFlow();
  useEntryFlowStore.getState().start(buildUnitValidation());
  const accessControl = createFakeAccessControl(clock, overrides);
  const user = userEvent.setup();
  await renderWithDeps(<AddVisitorScreen />, { clock, accessControl });
  return { user, accessControl };
}

async function fill(
  user: ReturnType<typeof userEvent.setup>,
  { name = 'José Martínez', type = 'Pasaporte', number = 'A12345678' } = {},
) {
  await user.type(screen.getByLabelText('Nombre completo *'), name);
  await user.press(screen.getByRole('combobox', { name: 'Tipo de documento *' }));
  await user.press(screen.getByRole('radio', { name: type }));
  await user.type(screen.getByLabelText('Número de documento *'), number);
}

describe('AddVisitorScreen', () => {
  it('muestra el formulario del mockup con Ayudante por defecto', async () => {
    await setup();

    expect(screen.getByRole('heading', { name: 'Agregar visitante' })).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'Ayudante' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Conductor' })).not.toBeChecked();
  });

  it('exige los campos obligatorios', async () => {
    const { user } = await setup();

    await user.press(screen.getByRole('button', { name: 'Agregar visitante' }));

    expect(await screen.findByText('Ingresa el nombre completo')).toBeOnTheScreen();
    expect(screen.getByText('Selecciona el tipo de documento')).toBeOnTheScreen();
    expect(screen.getByText('Ingresa el número de documento')).toBeOnTheScreen();
  });

  it('valida el formato del DUI', async () => {
    const { user } = await setup();

    await fill(user, { type: 'DUI', number: '123' });
    await user.press(screen.getByRole('button', { name: 'Agregar visitante' }));

    expect(
      await screen.findByText('El DUI tiene 8 dígitos, guion y 1 dígito (00000000-0)'),
    ).toBeOnTheScreen();
  });

  it('agrega al visitante como llegó y vuelve a la lista', async () => {
    const { user, accessControl } = await setup();

    await fill(user);
    await user.press(screen.getByRole('radio', { name: 'Conductor' }));
    await user.press(screen.getByRole('button', { name: 'Agregar visitante' }));

    expect(accessControl.validateVisitor).toHaveBeenCalledWith(
      expect.objectContaining({ documentType: 'PASSPORT', documentNumber: 'A12345678' }),
    );
    expect(useEntryFlowStore.getState().draft?.visitors.at(-1)).toMatchObject({
      id: 'vis-nuevo',
      name: 'José Martínez',
      role: 'DRIVER',
      status: 'arrived',
      added: true,
    });
    expect(router.back).toHaveBeenCalled();
  });

  it('no agrega un documento que ya está en la lista', async () => {
    const { user } = await setup();

    await fill(user, { type: 'DUI', number: '04512378-9' });
    await user.press(screen.getByRole('button', { name: 'Agregar visitante' }));

    expect(
      await screen.findByText('Ese documento ya está en la lista del vehículo'),
    ).toBeOnTheScreen();
    expect(router.back).not.toHaveBeenCalled();
  });

  it('un visitante en lista negra no se agrega', async () => {
    const { user } = await setup({
      validateVisitor: jest.fn(async () => err({ type: 'blacklisted' as const, message: null })),
    });

    await fill(user);
    await user.press(screen.getByRole('button', { name: 'Agregar visitante' }));

    expect(
      await screen.findByText(
        'José Martínez se encuentra en la lista negra de la sede y no puede ingresar.',
      ),
    ).toBeOnTheScreen();
    expect(useEntryFlowStore.getState().draft?.visitors).toHaveLength(3);
  });
});
