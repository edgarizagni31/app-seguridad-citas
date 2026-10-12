import { render, screen } from '@testing-library/react-native';

import { SyncBanner } from './sync-banner';

describe('SyncBanner', () => {
  it('sin conexión avisa y cuenta los pendientes', async () => {
    await render(<SyncBanner online={false} pending={3} />);

    expect(screen.getByRole('alert')).toHaveTextContent(/Sin conexión/);
    expect(screen.getByText('3 registros pendientes de sincronizar.')).toBeOnTheScreen();
  });

  it('con conexión y pendientes informa que sincroniza', async () => {
    await render(<SyncBanner online pending={1} />);

    expect(screen.getByText('Sincronizando 1 registro pendiente…')).toBeOnTheScreen();
  });

  it('con conexión y sin pendientes no muestra nada', async () => {
    await render(<SyncBanner online pending={0} />);

    expect(screen.queryByRole('alert')).not.toBeOnTheScreen();
    expect(screen.queryByRole('status')).not.toBeOnTheScreen();
  });
});
