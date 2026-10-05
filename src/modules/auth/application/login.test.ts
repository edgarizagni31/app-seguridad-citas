import { err } from '@/shared/domain';
import {
  createFakeAuthGateway,
  createFakeTokenDecoder,
  createInMemorySessionStorage,
} from '@/test/fakes/auth';
import { buildSessionUser, buildTokens } from '@/test/factories/auth';

import { login } from './login';

function setup(gateway = createFakeAuthGateway()) {
  const sessionStorage = createInMemorySessionStorage();
  const tokenDecoder = createFakeTokenDecoder();
  return {
    run: login({ authGateway: gateway, tokenDecoder, sessionStorage }),
    gateway,
    sessionStorage,
  };
}

describe('login', () => {
  it('autentica, persiste los tokens y devuelve la sesión', async () => {
    const { run, gateway, sessionStorage } = setup();

    const result = await run(' Carlos.Mendez@empresa.com ', 'clave');

    expect(gateway.login).toHaveBeenCalledWith({
      email: 'carlos.mendez@empresa.com',
      password: 'clave',
    });
    expect(sessionStorage.current()).toEqual(buildTokens());
    expect(result).toEqual({
      ok: true,
      value: {
        user: buildSessionUser(),
        tokens: buildTokens(),
        expiresAt: new Date('2026-10-05T17:42:00.000Z'),
      },
    });
  });

  it('valida las credenciales antes de llamar al gateway', async () => {
    const { run, gateway } = setup();

    const result = await run('no-es-correo', 'clave');

    expect(result).toEqual({ ok: false, error: { type: 'invalid-email' } });
    expect(gateway.login).not.toHaveBeenCalled();
  });

  it.each(['invalid-credentials', 'password-change-required', 'network'] as const)(
    'propaga el error %s sin persistir nada',
    async (type) => {
      const { run, sessionStorage } = setup(createFakeAuthGateway({ login: err({ type }) }));

      const result = await run('a@b.com', 'clave');

      expect(result).toEqual({ ok: false, error: { type } });
      expect(sessionStorage.save).not.toHaveBeenCalled();
    },
  );

  it('no persiste un token que no se puede decodificar', async () => {
    const { run, sessionStorage } = setup(
      createFakeAuthGateway({ login: { ok: true, value: buildTokens({ idToken: 'malformed' }) } }),
    );

    const result = await run('a@b.com', 'clave');

    expect(result).toEqual({ ok: false, error: { type: 'invalid-token' } });
    expect(sessionStorage.save).not.toHaveBeenCalled();
  });
});
