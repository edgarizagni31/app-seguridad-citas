import { screen, userEvent } from '@testing-library/react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useSessionStore } from '@/modules/auth';
import { createChangeBus } from '@/shared/infrastructure/db';
import { buildSession, buildSessionUser } from '@/test/factories/auth';
import { createMemoryInspections, TEST_TARGET } from '@/test/fakes/inspections';
import { renderWithDeps } from '@/test/render-with-deps';

import { InspectionStartScreen } from './inspection-start-screen';

jest.mock('expo-router', () => ({ useRouter: jest.fn(), useLocalSearchParams: jest.fn() }));

const NOW = new Date('2026-10-05T17:00:00Z');
const router = { replace: jest.fn(), back: jest.fn() };
const INSPECTOR = { id: 'user-ana', name: 'Ana Morales' };

async function setup({
  online = true,
  prepare,
}: {
  online?: boolean;
  prepare?: (memory: ReturnType<typeof createMemoryInspections>) => Promise<unknown>;
} = {}) {
  jest.mocked(useRouter).mockReturnValue(router as never);
  jest.mocked(useLocalSearchParams).mockReturnValue({ ...TEST_TARGET });
  useSessionStore.getState().setSession(
    buildSession({
      user: buildSessionUser({
        id: INSPECTOR.id,
        firstName: 'Ana',
        lastName: 'Morales',
        roles: ['PACCESO_AHSE'],
      }),
    }),
  );
  const changes = createChangeBus();
  const memory = createMemoryInspections({ changes, online, now: NOW });
  await prepare?.(memory);
  const user = userEvent.setup();
  await renderWithDeps(<InspectionStartScreen />, { changes, inspections: memory.useCases });
  return { user, memory };
}

const openDraft = async (memory: ReturnType<typeof createMemoryInspections>) => {
  const opened = await memory.useCases.open({ target: TEST_TARGET, inspector: INSPECTOR });
  if (!opened.ok) throw new Error(opened.error.type);
  return opened.value.id;
};

describe('InspectionStartScreen', () => {
  it('muestra la placa, el cliente, el voucher y el inspector', async () => {
    await setup();

    expect(await screen.findByText('ABC-123')).toBeOnTheScreen();
    expect(screen.getByText('DELOSI')).toBeOnTheScreen();
    expect(screen.getByText('APPASP0000000000000093')).toBeOnTheScreen();
    expect(screen.getByText('Ana Morales - HSE')).toBeOnTheScreen();
  });

  it('iniciar descarga el protocolo, crea el borrador y abre el cuestionario', async () => {
    const { user, memory } = await setup();

    await user.press(await screen.findByRole('button', { name: 'Iniciar inspección' }));

    expect(memory.useCases.open).toHaveBeenCalledWith({
      target: TEST_TARGET,
      inspector: INSPECTOR,
    });
    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/inspection/wizard/[inspectionId]',
      params: { inspectionId: 'insp-1' },
    });
  });

  it('sin red no puede empezar una inspección nueva', async () => {
    const { user } = await setup({ online: false });

    await user.press(await screen.findByRole('button', { name: 'Iniciar inspección' }));

    expect(
      await screen.findByText(
        'Sin conexión. Para empezar una inspección nueva hay que descargar el cuestionario: conéctate e inténtalo de nuevo.',
      ),
    ).toBeOnTheScreen();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('un borrador del teléfono se continúa con su avance', async () => {
    await setup({ prepare: openDraft });

    expect(await screen.findByRole('button', { name: 'Continuar inspección' })).toBeOnTheScreen();
    expect(screen.getByText('Paso 1 de 15')).toBeOnTheScreen();
  });

  it('con una inspección cerrada ofrece ver el resultado', async () => {
    const { user } = await setup({
      prepare: async (memory) => memory.useCases.reportMismatch(await openDraft(memory)),
    });

    await user.press(await screen.findByRole('button', { name: 'Ver resultado' }));

    expect(screen.getByText('La inspección de este vehículo ya se cerró.')).toBeOnTheScreen();
    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/inspection/result/[inspectionId]',
      params: { inspectionId: 'insp-1' },
    });
  });
});
