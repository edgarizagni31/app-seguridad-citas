import { screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import type { ReactNode } from 'react';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import TabsLayout from '@/app/(app)/(tabs)/_layout';
import { DependenciesProvider } from '@/core/di';
import { useSessionStore } from '@/modules/auth';
import { buildSession, buildSessionUser } from '@/test/factories/auth';
import { createTestDependencies } from '@/test/fakes/test-dependencies';

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <SafeAreaProvider initialMetrics={METRICS}>
      <DependenciesProvider value={createTestDependencies()}>{children}</DependenciesProvider>
    </SafeAreaProvider>
  );
}

async function renderTabsAs(roles: string[]) {
  useSessionStore.getState().setSession(buildSession({ user: buildSessionUser({ roles }) }));
  await renderRouter(
    {
      _layout: TabsLayout,
      index: () => <Text>Pantalla garita</Text>,
      inspections: () => <Text>Pantalla inspecciones</Text>,
      history: () => <Text>Pantalla historial</Text>,
      profile: () => <Text>Pantalla perfil</Text>,
    },
    { wrapper: Wrapper },
  );
}

const tabLabels = () =>
  ['Garita', 'Inspecciones', 'Historial', 'Mi perfil'].filter(
    (label) => screen.queryByRole('button', { name: new RegExp(label) }) !== null,
  );

describe('Pestañas por rol', () => {
  it('seguridad ve Garita, Historial y Mi perfil', async () => {
    await renderTabsAs(['PACCESO_ASEGURIDAD']);

    expect(await screen.findByText('Pantalla garita')).toBeOnTheScreen();
    expect(tabLabels()).toEqual(['Garita', 'Historial', 'Mi perfil']);
  });

  it('HSE ve Inspecciones, Historial y Mi perfil', async () => {
    await renderTabsAs(['PACCESO_AHSE']);

    expect(await screen.findByText('Pantalla inspecciones')).toBeOnTheScreen();
    expect(tabLabels()).toEqual(['Inspecciones', 'Historial', 'Mi perfil']);
  });

  it('con ambos roles ve todas las pestañas', async () => {
    await renderTabsAs(['PACCESO_JSEGURIDAD', 'PACCESO_JHSE']);

    expect(await screen.findByText('Pantalla garita')).toBeOnTheScreen();
    expect(tabLabels()).toEqual(['Garita', 'Inspecciones', 'Historial', 'Mi perfil']);
  });
});
