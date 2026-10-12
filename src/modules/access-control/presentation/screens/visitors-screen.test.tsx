import { screen, userEvent } from '@testing-library/react-native';
import { useRouter } from 'expo-router';

import { resetEntryFlow, useEntryFlowStore } from '../stores/entry-flow-store';
import { useSessionStore } from '@/modules/auth';
import { err, ok } from '@/shared/domain';
import { buildSession } from '@/test/factories/auth';
import { buildEntryRecord, buildUnitValidation } from '@/test/factories/entry';
import { createFakeAccessControl } from '@/test/fakes/test-dependencies';
import { createFixedClock } from '@/test/fakes/fixed-clock';
import { renderWithDeps } from '@/test/render-with-deps';

import { VisitorsScreen } from './visitors-screen';

jest.mock('expo-router', () => ({ useRouter: jest.fn(), Redirect: () => null }));

const clock = createFixedClock('2026-10-05T16:42:00Z');
const router = { push: jest.fn(), replace: jest.fn() };

async function setup(overrides: Parameters<typeof createFakeAccessControl>[1] = {}) {
  jest.mocked(useRouter).mockReturnValue(router as never);
  useSessionStore.getState().setSession(buildSession());
  resetEntryFlow();
  useEntryFlowStore.getState().start(buildUnitValidation());
  const accessControl = createFakeAccessControl(clock, overrides);
  const user = userEvent.setup();
  await renderWithDeps(<VisitorsScreen />, { clock, accessControl });
  return { user, accessControl };
}

const ORDER = ['Luis Hernández', 'Mario Rivas', 'Pedro Aguilar'];

// Los radios de cada fila siguen el orden de la lista de visitantes
const rowOf = (name: string) => {
  const index = ORDER.indexOf(name);
  return {
    arrived: screen.getAllByRole('radio', { name: 'Llegó' })[index],
    notArrived: screen.getAllByRole('radio', { name: 'No llegó' })[index],
  };
};

describe('VisitorsScreen', () => {
  it('lista el vehículo y los visitantes del QR como pendientes', async () => {
    await setup();

    expect(screen.getByRole('heading', { name: 'Visitantes del vehículo' })).toBeOnTheScreen();
    expect(screen.getByText('ABC-123')).toBeOnTheScreen();
    expect(screen.getByText('APPASP0000000000000093')).toBeOnTheScreen();
    expect(screen.getByRole('heading', { name: 'Visitantes esperados (3)' })).toBeOnTheScreen();
    expect(screen.getAllByText('Pendiente')).toHaveLength(3);
    expect(screen.getByText('Marca si llegó o no cada visitante.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Confirmar ingreso' })).toBeDisabled();
  });

  it('marcar "Llegó" valida la lista negra y habilita confirmar al completar', async () => {
    const { user, accessControl } = await setup();

    await user.press(rowOf('Luis Hernández').arrived!);
    await user.press(rowOf('Mario Rivas').arrived!);
    await user.press(rowOf('Pedro Aguilar').notArrived!);

    expect(accessControl.validateVisitor).toHaveBeenCalledWith({
      voucherId: 'voucher-093',
      documentType: 'DUI',
      documentNumber: '04512378-9',
    });
    expect(rowOf('Luis Hernández').arrived!).toBeChecked();
    expect(screen.getAllByText('Llegó').length).toBeGreaterThan(2);
    expect(screen.getByRole('button', { name: 'Confirmar ingreso (2)' })).toBeEnabled();
  });

  it('un visitante en lista negra queda bloqueado', async () => {
    const { user } = await setup({
      validateVisitor: jest.fn(async () =>
        err({ type: 'blacklisted' as const, message: 'Luis está en la lista negra.' }),
      ),
    });

    await user.press(rowOf('Luis Hernández').arrived!);

    expect(screen.getByText('Lista negra')).toBeOnTheScreen();
    expect(screen.getByText('Luis está en la lista negra.')).toBeOnTheScreen();
    expect(rowOf('Luis Hernández').arrived!).toBeDisabled();
    expect(rowOf('Luis Hernández').notArrived!).toBeChecked();
  });

  it('confirmar muestra el resumen y guarda el ingreso', async () => {
    const record = buildEntryRecord();
    const { user, accessControl } = await setup({
      confirmEntry: jest.fn(async () => ok(record)),
    });
    await user.press(rowOf('Luis Hernández').arrived!);
    await user.press(rowOf('Mario Rivas').arrived!);
    await user.press(rowOf('Pedro Aguilar').notArrived!);

    await user.press(screen.getByRole('button', { name: 'Confirmar ingreso (2)' }));
    expect(screen.getByRole('heading', { name: '¿Confirmar el ingreso?' })).toBeOnTheScreen();
    expect(
      screen.getByText('Ingresarán 2 visitantes.\n1 visitante no llegó y no ingresará.'),
    ).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Confirmar ingreso' }));

    expect(accessControl.confirmEntry).toHaveBeenCalled();
    expect(useEntryFlowStore.getState().record).toBe(record);
    expect(router.replace).toHaveBeenCalledWith('/entry/confirmed');
  });

  it('si no se puede guardar lo informa en la hoja', async () => {
    const { user } = await setup();
    await user.press(rowOf('Luis Hernández').arrived!);
    await user.press(rowOf('Mario Rivas').notArrived!);
    await user.press(rowOf('Pedro Aguilar').notArrived!);

    await user.press(screen.getByRole('button', { name: 'Confirmar ingreso (1)' }));
    await user.press(screen.getByRole('button', { name: 'Confirmar ingreso' }));

    expect(
      screen.getByText('No se pudo guardar el ingreso. Inténtalo de nuevo.'),
    ).toBeOnTheScreen();
  });

  it('agregar visitante abre el formulario', async () => {
    const { user } = await setup();

    await user.press(screen.getByRole('button', { name: 'Agregar visitante' }));

    expect(router.push).toHaveBeenCalledWith('/entry/add-visitor');
  });
});
