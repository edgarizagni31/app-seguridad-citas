import { render, screen, userEvent } from '@testing-library/react-native';

import { Banner } from './banner';

describe('Banner', () => {
  it('los errores se anuncian como alerta', async () => {
    await render(<Banner tone="error" message="No pudimos iniciar sesión." />);

    expect(screen.getByRole('alert')).toHaveTextContent(/No pudimos iniciar sesión./);
  });

  it('los éxitos se anuncian como estado', async () => {
    await render(<Banner tone="success" message="Lectura correcta." />);

    expect(screen.getByRole('status')).toHaveTextContent(/Lectura correcta./);
  });

  it('se puede descartar', async () => {
    const user = userEvent.setup();
    const onDismiss = jest.fn();
    await render(<Banner tone="error" message="Error" onDismiss={onDismiss} />);

    await user.press(screen.getByRole('button', { name: 'Cerrar' }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('sin onDismiss no ofrece cerrar', async () => {
    await render(<Banner tone="info" message="Info" />);

    expect(screen.queryByRole('button', { name: 'Cerrar' })).not.toBeOnTheScreen();
  });
});
