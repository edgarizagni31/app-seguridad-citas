import { render, screen } from '@testing-library/react-native';

import { BrandSplash } from './brand-splash';

describe('BrandSplash', () => {
  it('muestra la marca, el subtítulo, la carga y la versión', async () => {
    await render(<BrandSplash version="v1.0.0" />);

    expect(screen.getByText('Portal Citas')).toBeOnTheScreen();
    expect(screen.getByText('Control de Garita')).toBeOnTheScreen();
    expect(screen.getByRole('progressbar', { name: 'Cargando' })).toBeBusy();
    expect(screen.getByText('v1.0.0')).toBeOnTheScreen();
  });
});
