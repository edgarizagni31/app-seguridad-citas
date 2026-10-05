import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { resetSessionStore, useSessionStore } from '../stores/session-store';
import { DependenciesProvider, type AuthUseCases } from '@/core/di';
import { err, ok } from '@/shared/domain';
import { createFixedClock } from '@/test/fakes/fixed-clock';
import { createFakeAuthUseCases, createTestDependencies } from '@/test/fakes/test-dependencies';
import { buildSession, buildTokens } from '@/test/factories/auth';

import { NETWORK_RETRY_MS, useSessionLifecycle } from './use-session-lifecycle';
import { useSignOut } from './use-sign-out';

const NOW = '2026-10-05T16:00:00.000Z';
const session = buildSession({ expiresAt: new Date('2026-10-05T17:00:00.000Z') });
const renewed = buildSession({
  tokens: buildTokens({ idToken: 'renovado' }),
  expiresAt: new Date('2026-10-05T18:00:00.000Z'),
});

let appStateListener: ((state: AppStateStatus) => void) | undefined;

async function setup(overrides: Partial<AuthUseCases> = {}) {
  const auth = createFakeAuthUseCases({
    restoreSession: jest.fn(async () => ok(session)),
    refreshSession: jest.fn(async () => ok(renewed)),
    ...overrides,
  });
  const clock = createFixedClock(NOW);
  const dependencies = createTestDependencies({ auth, clock });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <DependenciesProvider value={dependencies}>{children}</DependenciesProvider>
  );
  const { result, unmount } = await renderHook(
    () => {
      useSessionLifecycle();
      return useSignOut();
    },
    { wrapper },
  );
  return { auth, clock, signOut: result, unmount };
}

const state = () => useSessionStore.getState();
const flush = () => act(async () => undefined);

beforeEach(() => {
  jest.useFakeTimers();
  resetSessionStore();
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
    appStateListener = listener as (state: AppStateStatus) => void;
    return { remove: jest.fn() };
  });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('useSessionLifecycle', () => {
  it('restaura la sesión guardada', async () => {
    await setup();
    await flush();

    expect(state()).toMatchObject({ status: 'authenticated', session });
  });

  it('sin sesión guardada queda anónimo', async () => {
    await setup({ restoreSession: jest.fn(async () => ok(null)) });
    await flush();

    expect(state()).toMatchObject({ status: 'anonymous', session: null });
  });

  it('si falla la restauración queda anónimo', async () => {
    await setup({ restoreSession: jest.fn(async () => err({ type: 'storage' as const })) });
    await flush();

    expect(state().status).toBe('anonymous');
  });

  it('renueva 120 s antes de expirar', async () => {
    const { auth } = await setup();
    await flush();

    await act(async () => jest.advanceTimersByTime(58 * 60 * 1000 - 1));
    expect(auth.refreshSession).not.toHaveBeenCalled();

    await act(async () => jest.advanceTimersByTime(1));
    expect(auth.refreshSession).toHaveBeenCalledWith(session);
    expect(state().session).toEqual(renewed);
  });

  it('al volver a primer plano renueva si está dentro del margen', async () => {
    const { auth, clock } = await setup();
    await flush();

    clock.set('2026-10-05T16:59:00.000Z');
    await act(async () => appStateListener?.('active'));

    expect(auth.refreshSession).toHaveBeenCalledTimes(1);
  });

  it('sin red reintenta más tarde y conserva la sesión', async () => {
    const refreshSession = jest
      .fn()
      .mockResolvedValueOnce(err({ type: 'network' as const }))
      .mockResolvedValueOnce(ok(renewed));
    await setup({ refreshSession });
    await flush();

    await act(async () => jest.advanceTimersByTime(58 * 60 * 1000));
    expect(state().session).toEqual(session);

    await act(async () => jest.advanceTimersByTime(NETWORK_RETRY_MS));
    expect(refreshSession).toHaveBeenCalledTimes(2);
    expect(state().session).toEqual(renewed);
  });

  it('si el servidor rechaza la renovación cierra la sesión con aviso', async () => {
    const { auth } = await setup({
      refreshSession: jest.fn(async () => err({ type: 'session-expired' as const })),
    });
    await flush();

    await act(async () => jest.advanceTimersByTime(58 * 60 * 1000));

    expect(auth.logout).toHaveBeenCalled();
    expect(state()).toMatchObject({ status: 'anonymous', notice: 'session-expired' });
  });
});

describe('useSignOut', () => {
  it('borra los tokens y deja la sesión anónima', async () => {
    const { auth, signOut } = await setup();
    await flush();

    await act(() => signOut.current());

    expect(auth.logout).toHaveBeenCalled();
    expect(state()).toMatchObject({ status: 'anonymous', session: null, notice: null });
  });
});
