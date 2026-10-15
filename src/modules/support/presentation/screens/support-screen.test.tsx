import { screen, userEvent } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';

import type { AttentionItem, QueuedItem } from '@/shared/domain';
import { createFakeConnectivity } from '@/test/fakes/connectivity';
import { createFakeSync } from '@/test/fakes/sync';
import { renderWithDeps } from '@/test/render-with-deps';

import { SupportScreen } from './support-screen';

jest.mock('expo-router', () => ({ useRouter: jest.fn() }));

const router = { back: jest.fn() };

const queued = (overrides: Partial<QueuedItem> = {}): QueuedItem => ({
  id: 'out-1',
  kind: 'vehicle-entry',
  aggregateId: 'entry-1',
  title: 'Ingreso ABC-123',
  status: 'pending',
  attempts: 2,
  lastError: 'network',
  createdAt: '2026-10-05T16:50:00.000Z',
  ...overrides,
});

const rejected = (overrides: Partial<AttentionItem> = {}): AttentionItem => ({
  id: 'att-1',
  kind: 'vehicle-inspection',
  aggregateId: 'insp-1',
  title: 'Inspección XYZ-789',
  reason: 'InspectionClosed',
  message: 'Ya fue inspeccionado.',
  createdAt: '2026-10-05T17:10:00.000Z',
  canResend: true,
  ...overrides,
});

// Acepta el diálogo de confirmación tocando su acción principal
const acceptAlerts = () =>
  jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
    buttons?.find((button) => button.style !== 'cancel')?.onPress?.();
  });

async function setup(queue: QueuedItem[], attention: AttentionItem[] = [], { online = true } = {}) {
  jest.mocked(useRouter).mockReturnValue(router as never);
  const sync = createFakeSync();
  sync.setQueue(queue);
  sync.setAttention(attention);
  const user = userEvent.setup();
  await renderWithDeps(<SupportScreen />, {
    sync,
    connectivity: createFakeConnectivity(online),
  });
  return { user, sync };
}

afterEach(() => jest.restoreAllMocks());

describe('SupportScreen', () => {
  it('muestra los totales y cada registro en cola con su estado y último error', async () => {
    await setup(
      [queued(), queued({ id: 'out-2', title: 'Ingreso MNP-456', status: 'failed' })],
      [rejected()],
    );

    expect(await screen.findByText('Ingreso ABC-123')).toBeOnTheScreen();
    expect(screen.getByLabelText('En cola: 1')).toBeOnTheScreen();
    expect(screen.getByLabelText('Con error: 1')).toBeOnTheScreen();
    expect(screen.getByLabelText('Rechazados: 1')).toBeOnTheScreen();
    expect(screen.getByText('Pendiente')).toBeOnTheScreen();
    expect(screen.getAllByText('Con error').length).toBeGreaterThan(1);
    expect(
      screen.getAllByText('Guardado el 05/10/2026 a las 10:50 a. m. · 2 intentos'),
    ).toHaveLength(2);
    expect(screen.getAllByText('network')).toHaveLength(2);
  });

  it('sincroniza todo o un solo registro', async () => {
    const { user, sync } = await setup([queued()]);

    await user.press(await screen.findByRole('button', { name: 'Sincronizar todo ahora' }));
    expect(sync.syncNow).toHaveBeenCalled();

    await user.press(screen.getByRole('button', { name: 'Sincronizar' }));
    expect(sync.syncItem).toHaveBeenCalledWith('out-1');
  });

  it('no deja sincronizar lo que ya se está enviando', async () => {
    await setup([queued({ status: 'in_flight' })]);

    expect(await screen.findByText('Enviando')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Sincronizar' })).toBeDisabled();
  });

  it('reenvía un rechazo después de confirmar', async () => {
    const { user, sync } = await setup([], [rejected()]);
    acceptAlerts();

    expect(await screen.findByText('Ya fue inspeccionado.')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Reenviar' }));

    expect(Alert.alert).toHaveBeenCalledWith(
      '¿Reenviar al servidor?',
      expect.any(String),
      expect.any(Array),
    );
    expect(sync.resendAttention).toHaveBeenCalledWith('att-1');
  });

  it('descarta un rechazo después de confirmar', async () => {
    const { user, sync } = await setup([], [rejected()]);
    acceptAlerts();

    await user.press(await screen.findByRole('button', { name: 'Descartar' }));

    expect(sync.dismissAttention).toHaveBeenCalledWith('att-1');
  });

  it('un rechazo antiguo sin envío guardado solo se puede descartar', async () => {
    await setup([], [rejected({ canResend: false, message: null })]);

    expect(await screen.findByText('InspectionClosed')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Reenviar' })).not.toBeOnTheScreen();
    expect(
      screen.getByText('Rechazado antes de habilitar el reenvío: solo se puede descartar.'),
    ).toBeOnTheScreen();
  });

  it('sin conexión lo avisa', async () => {
    await setup([queued()], [], { online: false });

    expect(
      await screen.findByText('Sin conexión: se enviarán cuando vuelva la red.'),
    ).toBeOnTheScreen();
  });

  it('si una acción falla lo informa', async () => {
    const { user, sync } = await setup([queued()]);
    sync.syncItem.mockRejectedValueOnce(new Error('db'));

    await user.press(await screen.findByRole('button', { name: 'Sincronizar' }));

    expect(
      await screen.findByText('No se pudo completar la acción. Intenta de nuevo.'),
    ).toBeOnTheScreen();
  });

  it('sin nada pendiente muestra que todo está sincronizado', async () => {
    await setup([]);

    expect(await screen.findByRole('heading', { name: 'Todo sincronizado' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Sincronizar todo ahora' })).toBeDisabled();
  });
});
