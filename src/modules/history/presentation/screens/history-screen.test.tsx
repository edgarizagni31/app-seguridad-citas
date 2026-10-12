import { screen, userEvent } from '@testing-library/react-native';

import type { HistoryEntry } from '@/shared/domain';
import { createFakeSync } from '@/test/fakes/sync';
import { renderWithDeps } from '@/test/render-with-deps';

import { HistoryScreen } from './history-screen';

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

  it('muestra lo que requiere atención y permite descartarlo', async () => {
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

    expect(await screen.findByRole('heading', { name: 'Requiere atención' })).toBeOnTheScreen();
    expect(screen.getByText('Un visitante está en la lista negra.')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Descartar' }));

    expect(sync.dismissAttention).toHaveBeenCalledWith('att-1');
  });
});
