import { render, screen, userEvent } from '@testing-library/react-native';

import { Tabs } from './tabs';

const OPTIONS = [
  { value: 'vehicle', label: 'Vehículo' },
  { value: 'driver', label: 'Conductor' },
] as const;

describe('Tabs', () => {
  it('marca la pestaña activa y avisa al elegir otra', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    await render(<Tabs options={OPTIONS} value="vehicle" onChange={onChange} />);

    expect(screen.getByRole('tab', { name: 'Vehículo' })).toBeSelected();
    expect(screen.getByRole('tab', { name: 'Conductor' })).not.toBeSelected();
    await user.press(screen.getByRole('tab', { name: 'Conductor' }));

    expect(onChange).toHaveBeenCalledWith('driver');
  });
});
