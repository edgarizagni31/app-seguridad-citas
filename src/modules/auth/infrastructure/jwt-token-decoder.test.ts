import { buildJwt, R360_CLAIMS } from '@/test/factories/jwt';

import { jwtTokenDecoder } from './jwt-token-decoder';

describe('jwtTokenDecoder', () => {
  it('convierte los claims de R360 en la identidad de la sesión', () => {
    expect(jwtTokenDecoder.decode(buildJwt())).toEqual({
      ok: true,
      value: {
        user: {
          id: R360_CLAIMS.sub,
          name: 'Carlos Andrés Méndez Rivas',
          firstName: 'Carlos',
          lastName: 'Méndez',
          email: 'carlos.mendez@empresa.com',
          roles: ['R360_CONFIGURACION', 'PACCESO_ASEGURIDAD'],
        },
        expiresAt: new Date(R360_CLAIMS.exp * 1000),
      },
    });
  });

  it('tolera claims opcionales ausentes', () => {
    const result = jwtTokenDecoder.decode(buildJwt({ sub: 'u1', exp: 1791219020 }));

    expect(result).toMatchObject({
      ok: true,
      value: { user: { id: 'u1', name: '', firstName: '', lastName: '', email: '', roles: [] } },
    });
  });

  it.each([
    ['token mal formado', 'no-es-un-jwt'],
    ['sin sub', buildJwt({ exp: 1791219020 })],
    ['sin exp', buildJwt({ sub: 'u1' })],
    ['grupos con formato inválido', buildJwt({ sub: 'u1', exp: 1, 'cognito:groups': 'ADMIN' })],
  ])('rechaza %s', (_case, token) => {
    expect(jwtTokenDecoder.decode(token)).toMatchObject({
      ok: false,
      error: { type: 'invalid-token' },
    });
  });
});
