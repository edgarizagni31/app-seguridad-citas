import type { Credentials } from '../domain';
import { createFixedClock } from '@/test/fakes/fixed-clock';

import { jwtTokenDecoder } from './jwt-token-decoder';
import { createMockAuthGateway, DEMO_PASSWORD } from './mock-auth-gateway';

const credentials = (email: string, password = DEMO_PASSWORD) =>
  ({ email, password }) as Credentials;

function setup() {
  const clock = createFixedClock('2026-10-05T16:00:00.000Z');
  return { gateway: createMockAuthGateway({ clock, latencyMs: 0 }), clock };
}

describe('mockAuthGateway', () => {
  it('emite un JWT con los claims de R360 que el decodificador real entiende', async () => {
    const { gateway } = setup();

    const result = await gateway.login(credentials('seguridad@demo.ransa'));
    if (!result.ok) throw new Error('se esperaba login exitoso');

    expect(jwtTokenDecoder.decode(result.value.idToken)).toEqual({
      ok: true,
      value: {
        user: {
          id: 'demo-seguridad',
          name: 'Carlos Méndez',
          firstName: 'Carlos',
          lastName: 'Méndez',
          email: 'seguridad@demo.ransa',
          roles: ['PACCESO_ASEGURIDAD'],
        },
        expiresAt: new Date('2026-10-05T17:00:00.000Z'),
      },
    });
  });

  it.each([
    ['contraseña incorrecta', credentials('seguridad@demo.ransa', 'otra'), 'invalid-credentials'],
    ['usuario inexistente', credentials('nadie@demo.ransa'), 'invalid-credentials'],
    ['cambio de clave', credentials('cambio@demo.ransa'), 'password-change-required'],
    ['sin red', credentials('sinred@demo.ransa'), 'network'],
  ])('simula %s', async (_case, input, type) => {
    const { gateway } = setup();

    expect(await gateway.login(input)).toEqual({ ok: false, error: { type } });
  });

  it('renueva con un exp nuevo', async () => {
    const { gateway, clock } = setup();
    const login = await gateway.login(credentials('seguridad@demo.ransa'));
    if (!login.ok) throw new Error('se esperaba login exitoso');
    clock.advanceSeconds(3500);

    const refreshed = await gateway.refresh(login.value);
    if (!refreshed.ok) throw new Error('se esperaba renovación exitosa');

    expect(jwtTokenDecoder.decode(refreshed.value.idToken)).toMatchObject({
      ok: true,
      value: { expiresAt: new Date('2026-10-05T17:58:20.000Z') },
    });
  });

  it('rechaza refresh tokens desconocidos', async () => {
    const { gateway } = setup();

    expect(await gateway.refresh({ idToken: 'x', refreshToken: 'otro' })).toEqual({
      ok: false,
      error: { type: 'session-expired' },
    });
  });
});
