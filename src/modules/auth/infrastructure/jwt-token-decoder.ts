import { jwtDecode } from 'jwt-decode';
import { z } from 'zod';

import { firstNameOf, type TokenDecoder } from '../domain';
import { err, ok } from '@/shared/domain';

// Claims del idToken de Cognito que emite R360
const claimsSchema = z.object({
  sub: z.string().min(1),
  exp: z.number().int().positive(),
  name: z.string().default(''),
  family_name: z.string().default(''),
  email: z.string().default(''),
  'cognito:groups': z.array(z.string()).default([]),
});

export const jwtTokenDecoder: TokenDecoder = {
  decode(idToken) {
    let payload: unknown;
    try {
      payload = jwtDecode(idToken);
    } catch (cause) {
      return err({ type: 'invalid-token', cause });
    }

    const claims = claimsSchema.safeParse(payload);
    if (!claims.success) return err({ type: 'invalid-token', cause: claims.error });

    const { sub, exp, name, family_name, email } = claims.data;
    return ok({
      user: {
        id: sub,
        name: `${name} ${family_name}`.trim(),
        firstName: firstNameOf(name),
        lastName: firstNameOf(family_name),
        email,
        roles: claims.data['cognito:groups'],
      },
      expiresAt: new Date(exp * 1000),
    });
  },
};
