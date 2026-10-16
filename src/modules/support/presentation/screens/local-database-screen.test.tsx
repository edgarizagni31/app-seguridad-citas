import { screen, userEvent } from '@testing-library/react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import type { LocalDataInspector, LocalTablePage } from '@/shared/domain';
import { createChangeBus } from '@/shared/infrastructure/db';
import { renderWithDeps } from '@/test/render-with-deps';

import { cellText, PAGE_SIZE } from '../view-models/use-local-table';
import { LocalDatabaseScreen } from './local-database-screen';
import { LocalTableScreen } from './local-table-screen';

jest.mock('expo-router', () => ({ useRouter: jest.fn(), useLocalSearchParams: jest.fn() }));

const router = { push: jest.fn(), back: jest.fn() };

const OUTBOX: LocalTablePage = {
  name: 'outbox',
  columns: ['id', 'payload', 'last_error'],
  rows: [{ id: 'out-1', payload: '{"plate":"ABC-123"}', last_error: null }],
  total: 1,
};

function inspector(overrides: Partial<LocalDataInspector> = {}) {
  return {
    listTables: jest.fn(async () => [
      { name: 'outbox', rows: 1 },
      { name: 'vehicle_entries', rows: 0 },
    ]),
    readTable: jest.fn(async () => OUTBOX),
    ...overrides,
  } satisfies LocalDataInspector;
}

beforeEach(() => {
  jest.mocked(useRouter).mockReturnValue(router as never);
  jest.mocked(useLocalSearchParams).mockReturnValue({ name: 'outbox' });
});

describe('LocalDatabaseScreen', () => {
  it('lista las tablas con sus filas y abre la elegida', async () => {
    const user = userEvent.setup();
    await renderWithDeps(<LocalDatabaseScreen />, { localData: inspector() });

    await user.press(await screen.findByRole('button', { name: 'outbox, 1 fila' }));

    expect(screen.getByRole('button', { name: 'vehicle_entries, 0 filas' })).toBeOnTheScreen();
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/support/table/[name]',
      params: { name: 'outbox' },
    });
  });

  it('si no puede leer la base lo informa y permite reintentar', async () => {
    const user = userEvent.setup();
    const localData = inspector({
      listTables: jest.fn().mockRejectedValueOnce(new Error('db')).mockResolvedValue([]),
    });
    await renderWithDeps(<LocalDatabaseScreen />, { localData });

    await user.press(await screen.findByRole('button', { name: 'Reintentar' }));

    expect(localData.listTables).toHaveBeenCalledTimes(2);
  });
});

describe('LocalTableScreen', () => {
  it('muestra cada fila con sus columnas y los JSON legibles', async () => {
    const localData = inspector();
    await renderWithDeps(<LocalTableScreen />, { localData });

    expect(await screen.findByText('Mostrando 1 de 1')).toBeOnTheScreen();
    expect(screen.getByText('out-1')).toBeOnTheScreen();
    expect(screen.getByText('{\n  "plate": "ABC-123"\n}')).toBeOnTheScreen();
    expect(screen.getByText('NULL')).toBeOnTheScreen();
    expect(localData.readTable).toHaveBeenCalledWith('outbox', { limit: PAGE_SIZE, offset: 0 });
  });

  it('se refresca cuando la app escribe en esa tabla', async () => {
    const localData = inspector();
    const changes = createChangeBus();
    await renderWithDeps(<LocalTableScreen />, { localData, changes });
    await screen.findByText('out-1');

    changes.emit(['outbox']);

    await screen.findByText('out-1');
    expect(localData.readTable).toHaveBeenCalledTimes(2);
  });

  it('pagina de a 50 filas', async () => {
    const user = userEvent.setup();
    const localData = inspector({ readTable: jest.fn(async () => ({ ...OUTBOX, total: 120 })) });
    await renderWithDeps(<LocalTableScreen />, { localData });

    await user.press(await screen.findByRole('button', { name: 'Cargar más' }));

    expect(localData.readTable).toHaveBeenLastCalledWith('outbox', {
      limit: PAGE_SIZE * 2,
      offset: 0,
    });
  });

  it('si la tabla no existe lo indica', async () => {
    await renderWithDeps(<LocalTableScreen />, {
      localData: inspector({ readTable: jest.fn(async () => null) }),
    });

    expect(await screen.findByText('La tabla ya no existe en este teléfono.')).toBeOnTheScreen();
  });
});

describe('cellText', () => {
  it('muestra NULL, números, texto y JSON indentado', () => {
    expect(cellText(null)).toBe('NULL');
    expect(cellText(3)).toBe('3');
    expect(cellText('pending')).toBe('pending');
    expect(cellText('[1,2]')).toBe('[\n  1,\n  2\n]');
    expect(cellText('{roto')).toBe('{roto');
  });
});
