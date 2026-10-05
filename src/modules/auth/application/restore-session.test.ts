import { err, ok } from '@/shared/domain';
import {
  createFakeAuthGateway,
  createFakeTokenDecoder,
  createInMemorySessionStorage,
} from '@/test/fakes/auth';
import { createFixedClock } from '@/test/fakes/fixed-clock';
import { buildSessionUser, buildTokens } from '@/test/factories/auth';

import { restoreSession } from './restore-session';

const EXPIRES_AT = new Date('2026-10-05T17:00:00.000Z');

function setup({
  stored = buildTokens() as ReturnType<typeof buildTokens> | null,
  now = '2026-10-05T16:00:00.000Z',
  gateway = createFakeAuthGateway(),
} = {}) {
  const sessionStorage = createInMemorySessionStorage(stored);
  const tokenDecoder = createFakeTokenDecoder({}, EXPIRES_AT);
  const clock = createFixedClock(now);
  return {
    run: restoreSession({ authGateway: gateway, tokenDecoder, sessionStorage, clock }),
    gateway,
    sessionStorage,
  };
}

describe('restoreSession', () => {
  it('sin tokens guardados no hay sesión', async () => {
    const { run } = setup({ stored: null });

    expect(await run()).toEqual(ok(null));
  });

  it('restaura la sesión vigente sin renovar', async () => {
    const { run, gateway } = setup();

    expect(await run()).toEqual(
      ok({ user: buildSessionUser(), tokens: buildTokens(), expiresAt: EXPIRES_AT }),
    );
    expect(gateway.refresh).not.toHaveBeenCalled();
  });

  it('renueva si está dentro del margen de expiración', async () => {
    const { run, gateway, sessionStorage } = setup({ now: '2026-10-05T16:59:00.000Z' });

    const result = await run();

    expect(gateway.refresh).toHaveBeenCalledWith(buildTokens());
    expect(result).toMatchObject({ ok: true, value: { tokens: { idToken: 'id-token-2' } } });
    expect(sessionStorage.current()?.idToken).toBe('id-token-2');
  });

  it('sin red conserva la sesión para operar offline', async () => {
    const { run, sessionStorage } = setup({
      now: '2026-10-05T18:00:00.000Z',
      gateway: createFakeAuthGateway({ refresh: err({ type: 'network' }) }),
    });

    expect(await run()).toMatchObject({ ok: true, value: { tokens: buildTokens() } });
    expect(sessionStorage.clear).not.toHaveBeenCalled();
  });

  it('descarta la sesión si el servidor rechaza la renovación', async () => {
    const { run, sessionStorage } = setup({
      now: '2026-10-05T18:00:00.000Z',
      gateway: createFakeAuthGateway({ refresh: err({ type: 'session-expired' }) }),
    });

    expect(await run()).toEqual(ok(null));
    expect(sessionStorage.current()).toBeNull();
  });

  it('descarta tokens que no se pueden decodificar', async () => {
    const { run, sessionStorage } = setup({ stored: buildTokens({ idToken: 'malformed' }) });

    expect(await run()).toEqual(ok(null));
    expect(sessionStorage.current()).toBeNull();
  });

  it('propaga errores del almacenamiento', async () => {
    const { run, sessionStorage } = setup();
    sessionStorage.load.mockResolvedValueOnce(err({ type: 'storage' }));

    expect(await run()).toEqual(err({ type: 'storage' }));
  });
});
