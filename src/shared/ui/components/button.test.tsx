import { render, screen, userEvent } from '@testing-library/react-native';

import { Button } from './button';

describe('Button', () => {
  it('expone rol y nombre accesible y responde al toque', async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    await render(<Button label="Ingresar" onPress={onPress} />);

    await user.press(screen.getByRole('button', { name: 'Ingresar' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('en carga queda ocupado, deshabilitado y no responde', async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    await render(<Button label="Ingresar" onPress={onPress} loading />);

    const button = screen.getByRole('button', { name: 'Ingresar' });
    await user.press(button);

    expect(button).toBeBusy();
    expect(button).toBeDisabled();
    expect(onPress).not.toHaveBeenCalled();
  });

  it('deshabilitado no responde', async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    await render(<Button label="Ingresar" onPress={onPress} disabled />);

    await user.press(screen.getByRole('button', { name: 'Ingresar' }));

    expect(onPress).not.toHaveBeenCalled();
  });
});
