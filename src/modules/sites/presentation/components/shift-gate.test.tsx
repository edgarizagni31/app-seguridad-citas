import { screen, userEvent } from '@testing-library/react-native';
import { Text } from 'react-native';

import { useSessionStore } from '@/modules/auth';
import { err, ok } from '@/shared/domain';
import { buildSession, buildSessionUser } from '@/test/factories/auth';
import { createFakeSitesUseCases, TEST_SITE } from '@/test/fakes/test-dependencies';
import { renderWithDeps } from '@/test/render-with-deps';

import { ShiftGate } from './shift-gate';

const NORTE = { id: 'site-norte', name: 'Almacén Norte' };

const signIn = (roles: string[]) =>
  useSessionStore.getState().setSession(buildSession({ user: buildSessionUser({ roles }) }));

beforeEach(() => signIn(['PACCESO_ASEGURIDAD']));

const renderGate = (sites: ReturnType<typeof createFakeSitesUseCases>) =>
  renderWithDeps(
    <ShiftGate>
      <Text>Contenido del turno</Text>
    </ShiftGate>,
    { sites },
  );

describe('ShiftGate', () => {
  it('solo soporte entra sin elegir sede ni descargar el paquete', async () => {
    signIn(['PACCESO_SOPORTE']);
    const sites = createFakeSitesUseCases({
      shiftStatus: jest.fn(async () => ok({ type: 'no-site' as const })),
    });

    await renderGate(sites);

    expect(screen.getByText('Contenido del turno')).toBeOnTheScreen();
    expect(sites.shiftStatus).not.toHaveBeenCalled();
  });

  it('con el turno listo muestra el contenido', async () => {
    await renderGate(createFakeSitesUseCases());

    expect(await screen.findByText('Contenido del turno')).toBeOnTheScreen();
  });

  it('sin sede elegida lista las sedes y descarga la elegida', async () => {
    const user = userEvent.setup();
    const sites = createFakeSitesUseCases({
      shiftStatus: jest.fn(async () => ok({ type: 'no-site' as const })),
      listSites: jest.fn(async () => ok([TEST_SITE, NORTE])),
    });
    await renderGate(sites);

    await user.press(await screen.findByRole('button', { name: 'Almacén Norte' }));

    expect(sites.startShift).toHaveBeenCalledWith(NORTE);
    expect(await screen.findByText('Contenido del turno')).toBeOnTheScreen();
  });

  it('con una sola sede la descarga sin preguntar', async () => {
    const sites = createFakeSitesUseCases({
      shiftStatus: jest.fn(async () => ok({ type: 'no-site' as const })),
    });
    await renderGate(sites);

    expect(await screen.findByText('Contenido del turno')).toBeOnTheScreen();
    expect(sites.startShift).toHaveBeenCalledWith(TEST_SITE);
  });

  it('sin red avisa y permite reintentar o cambiar de sede', async () => {
    const user = userEvent.setup();
    const sites = createFakeSitesUseCases({
      shiftStatus: jest.fn(async () => ok({ type: 'needs-download' as const, site: TEST_SITE })),
      startShift: jest.fn(async () => err({ type: 'network' as const })),
      listSites: jest.fn(async () => ok([TEST_SITE, NORTE])),
    });
    await renderGate(sites);

    expect(await screen.findByText('Necesitas conexión para iniciar el turno')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Cambiar sede' }));

    expect(await screen.findByRole('heading', { name: 'Elige tu sede' })).toBeOnTheScreen();
  });

  it('sin sedes asignadas lo explica', async () => {
    const sites = createFakeSitesUseCases({
      shiftStatus: jest.fn(async () => ok({ type: 'no-site' as const })),
      listSites: jest.fn(async () => err({ type: 'no-sites' as const })),
    });
    await renderGate(sites);

    expect(
      await screen.findByText(
        'Tu usuario no tiene sedes asignadas. Solicítalas a tu administrador.',
      ),
    ).toBeOnTheScreen();
    expect(screen.queryByText('Contenido del turno')).not.toBeOnTheScreen();
  });
});
