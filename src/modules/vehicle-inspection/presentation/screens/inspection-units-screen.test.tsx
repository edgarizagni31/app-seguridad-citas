import { screen, userEvent } from '@testing-library/react-native';
import { useRouter } from 'expo-router';

import { useInspectionScanStore } from '../stores/inspection-scan-store';
import { createChangeBus } from '@/shared/infrastructure/db';
import { buildAppointment } from '@/test/factories/gate';
import { createMemoryInspections, TEST_TARGET } from '@/test/fakes/inspections';
import { renderWithDeps } from '@/test/render-with-deps';

import { InspectionUnitsScreen } from './inspection-units-screen';

jest.mock('expo-router', () => ({ useRouter: jest.fn(), Redirect: () => null }));

const router = { push: jest.fn(), back: jest.fn() };

async function setup({ withDraft = false } = {}) {
  jest.mocked(useRouter).mockReturnValue(router as never);
  useInspectionScanStore.getState().setAppointment(buildAppointment());
  const changes = createChangeBus();
  const memory = createMemoryInspections({ changes });
  if (withDraft) {
    await memory.useCases.open({
      target: TEST_TARGET,
      inspector: { id: 'user-ana', name: 'Ana Morales' },
    });
  }
  const user = userEvent.setup();
  await renderWithDeps(<InspectionUnitsScreen />, { changes, inspections: memory.useCases });
  return { user };
}

afterEach(() => useInspectionScanStore.getState().clear());

describe('InspectionUnitsScreen', () => {
  it('lista las placas de la cita escaneada', async () => {
    await setup();

    expect(
      await screen.findByRole('heading', { name: 'Elige la placa a inspeccionar' }),
    ).toBeOnTheScreen();
    expect(screen.getByText('DELOSI')).toBeOnTheScreen();
    expect(screen.getByText('APPASP0000000000000093')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: /^XYZ-789/ })).toBeOnTheScreen();
  });

  it('marca la placa que ya tiene una inspección en curso', async () => {
    await setup({ withDraft: true });

    expect(
      await screen.findByRole('button', { name: /^ABC-123, .*, En curso$/ }),
    ).toBeOnTheScreen();
  });

  it('elegir una placa abre el inicio de su inspección', async () => {
    const { user } = await setup();

    await user.press(await screen.findByRole('button', { name: /^XYZ-789/ }));

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/inspection/[unitId]',
      params: { ...TEST_TARGET, unitId: 'vtu-2', plate: 'XYZ-789' },
    });
  });
});
