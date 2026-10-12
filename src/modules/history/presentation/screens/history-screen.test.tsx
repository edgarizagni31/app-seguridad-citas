import { screen, userEvent } from '@testing-library/react-native';
import { useRouter } from 'expo-router';

import type { HistoryEntry } from '@/shared/domain';
import { createFakeSync } from '@/test/fakes/sync';
import { renderWithDeps } from '@/test/render-with-deps';

import { HistoryScreen } from './history-screen';

jest.mock('expo-router', () => ({ useRouter: jest.fn() }));

const router = { push: jest.fn() };
beforeEach(() => jest.mocked(useRouter).mockReturnValue(router as never));

const ENTRY: HistoryEntry = {
  id: 'entry-1',
  kind: 'entry',
  title: 'ABC-123',
  subtitle: '3 visitantes ingresaron',
  occurredAt: '2026-10-05T16:42:00.000Z',
  syncStatus: 'pending',
};

const historyWith = (entries: HistoryEntry[]) => ({
  tables: [],
  list: jest.fn(async () => entries),
});

describe('HistoryScreen', () => {
  it('sin registros muestra el estado vacío', async () => {
    await renderWithDeps(<HistoryScreen />);

    expect(
      await screen.findByRole('heading', { name: 'Aún no hay registros en este turno' }),
    ).toBeOnTheScreen();
  });

  it('lista los registros del turno con su estado de sincronización', async () => {
    await renderWithDeps(<HistoryScreen />, { history: historyWith([ENTRY]) });

    expect(await screen.findByText('ABC-123')).toBeOnTheScreen();
    expect(screen.getByText('Ingreso · 10:42 a. m.')).toBeOnTheScreen();
    expect(screen.getByText('Pendiente')).toBeOnTheScreen();
  });

  it('resume lo que requiere atención y abre la bandeja', async () => {
    const user = userEvent.setup();
    const sync = createFakeSync();
    sync.setAttention([
      {
        id: 'att-1',
        kind: 'vehicle-entry',
        aggregateId: 'entry-1',
        title: 'Ingreso ABC-123',
        reason: 'VisitorBlacklisted',
        message: 'Un visitante está en la lista negra.',
        createdAt: '2026-10-05T16:50:00.000Z',
      },
    ]);
    await renderWithDeps(<HistoryScreen />, { sync });

    expect(await screen.findByText('1 registro rechazado por el servidor')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Ver lo que requiere atención' }));

    expect(router.push).toHaveBeenCalledWith('/attention');
  });
});
