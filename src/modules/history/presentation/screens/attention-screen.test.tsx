import { screen, userEvent } from '@testing-library/react-native';
import { useRouter } from 'expo-router';

import type { AttentionItem } from '@/shared/domain';
import { createFakeSync } from '@/test/fakes/sync';
import { renderWithDeps } from '@/test/render-with-deps';

import { AttentionScreen } from './attention-screen';

jest.mock('expo-router', () => ({ useRouter: jest.fn() }));

const router = { back: jest.fn() };

const item = (overrides: Partial<AttentionItem> = {}): AttentionItem => ({
  id: 'att-1',
  kind: 'vehicle-entry',
  aggregateId: 'entry-1',
  title: 'Ingreso ABC-123',
  reason: 'VisitorBlacklisted',
  message: 'Raúl Pineda se encuentra en la lista negra de la sede.',
  createdAt: '2026-10-05T16:50:00.000Z',
  canResend: true,
  ...overrides,
});

async function setup(items: AttentionItem[]) {
  jest.mocked(useRouter).mockReturnValue(router as never);
  const sync = createFakeSync();
  sync.setAttention(items);
  const user = userEvent.setup();
  await renderWithDeps(<AttentionScreen />, { sync });
  return { user, sync };
}

describe('AttentionScreen', () => {
  it('muestra el motivo del rechazo y la acción sugerida', async () => {
    await setup([item()]);

    expect(await screen.findByText('Ingreso ABC-123')).toBeOnTheScreen();
    expect(
      screen.getByText('Raúl Pineda se encuentra en la lista negra de la sede.'),
    ).toBeOnTheScreen();
    expect(
      screen.getByText('Retén al visitante en garita y avisa al supervisor.'),
    ).toBeOnTheScreen();
  });

  it('sin mensaje usa el código del motivo y una acción genérica', async () => {
    await setup([item({ reason: 'Desconocido', message: null })]);

    expect(await screen.findByText('Desconocido')).toBeOnTheScreen();
    expect(screen.getByText('Revisa el registro con el supervisor.')).toBeOnTheScreen();
  });

  it('marcar como revisado lo quita de la bandeja', async () => {
    const { user, sync } = await setup([item()]);

    await user.press(await screen.findByRole('button', { name: 'Marcar como revisado' }));

    expect(sync.dismissAttention).toHaveBeenCalledWith('att-1');
  });

  it('vacía, lo indica', async () => {
    await setup([]);

    expect(await screen.findByRole('heading', { name: 'Nada pendiente' })).toBeOnTheScreen();
  });
});
