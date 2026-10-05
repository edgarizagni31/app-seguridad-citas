import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

describe('entorno de pruebas', () => {
  it('renderiza componentes de React Native', async () => {
    await render(<Text>Portal Citas</Text>);

    expect(screen.getByText('Portal Citas')).toBeOnTheScreen();
  });
});
