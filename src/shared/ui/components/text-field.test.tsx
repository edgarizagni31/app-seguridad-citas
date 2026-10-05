import { render, screen, userEvent } from '@testing-library/react-native';

import { TextField } from './text-field';

describe('TextField', () => {
  it('asocia la etiqueta como nombre accesible del input', async () => {
    const user = userEvent.setup();
    const onChangeText = jest.fn();
    await render(<TextField label="Correo" onChangeText={onChangeText} />);

    await user.type(screen.getByLabelText('Correo'), 'a@b.com');

    expect(onChangeText).toHaveBeenLastCalledWith('a@b.com');
  });

  it('muestra el error y marca el input como inválido', async () => {
    await render(<TextField label="Contraseña" error="Correo o contraseña incorrectos" />);

    expect(screen.getByText('Correo o contraseña incorrectos')).toBeOnTheScreen();
    expect(screen.getByLabelText('Contraseña')).toHaveProp('aria-invalid', true);
  });

  it('ejecuta la acción secundaria', async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    await render(
      <TextField
        label="Contraseña"
        trailingAction={{ icon: 'eye-outline', label: 'Mostrar contraseña', onPress }}
      />,
    );

    await user.press(screen.getByRole('button', { name: 'Mostrar contraseña' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
