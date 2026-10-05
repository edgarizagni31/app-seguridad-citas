import { err } from '@/shared/domain';
import {
  createFakeAuthGateway,
  createFakeTokenDecoder,
  createInMemorySessionStorage,
} from '@/test/fakes/auth';
import { buildSession, buildTokens } from '@/test/factories/auth';

import { logout } from './logout';
import { refreshSession } from './refresh-session';

describe('refreshSession', () => {
  it('reemplaza los tokens por los renovados', async () => {
    const sessionStorage = createInMemorySessionStorage(buildTokens());
    const run = refreshSession({
      authGateway: createFakeAuthGateway(),
      tokenDecoder: createFakeTokenDecoder(),
      sessionStorage,
    });

    const result = await run(buildSession());

    expect(result).toMatchObject({ ok: true, value: { tokens: { idToken: 'id-token-2' } } });
    expect(sessionStorage.current()).toEqual({
      idToken: 'id-token-2',
      refreshToken: 'refresh-token-2',
    });
  });

  it('propaga el rechazo del servidor sin tocar el almacenamiento', async () => {
    const sessionStorage = createInMemorySessionStorage(buildTokens());
    const run = refreshSession({
      authGateway: createFakeAuthGateway({ refresh: err({ type: 'session-expired' }) }),
      tokenDecoder: createFakeTokenDecoder(),
      sessionStorage,
    });

    expect(await run(buildSession())).toEqual(err({ type: 'session-expired' }));
    expect(sessionStorage.save).not.toHaveBeenCalled();
  });
});

describe('logout', () => {
  it('borra los tokens guardados', async () => {
    const sessionStorage = createInMemorySessionStorage(buildTokens());

    await logout({ sessionStorage })();

    expect(sessionStorage.current()).toBeNull();
  });
});

describe('fallos de almacenamiento', () => {
  it('no devuelve sesión si no se pudo guardar', async () => {
    const sessionStorage = createInMemorySessionStorage();
    sessionStorage.save.mockResolvedValueOnce(err({ type: 'storage' }));
    const run = refreshSession({
      authGateway: createFakeAuthGateway(),
      tokenDecoder: createFakeTokenDecoder(),
      sessionStorage,
    });

    expect(await run(buildSession())).toEqual(err({ type: 'storage' }));
  });
});
