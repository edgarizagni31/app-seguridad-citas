import { z } from 'zod';

import type { AuthError, AuthGateway } from '../domain';
import { err, ok } from '@/shared/domain';
import type { HttpClient, HttpError } from '@/shared/infrastructure';
import { encodeBase64Utf8 } from '@/shared/lib';

const loginResponseSchema = z.object({
  idToken: z.string().min(1),
  refreshToken: z.string().min(1),
  newPasswordRequired: z.boolean().default(false),
});

const refreshResponseSchema = z.object({
  idToken: z.string().min(1),
  refreshToken: z.string().min(1).optional(),
});

type Operation = 'login' | 'refresh';

function toAuthError(error: HttpError, operation: Operation): AuthError {
  const rejected: AuthError =
    operation === 'login' ? { type: 'invalid-credentials' } : { type: 'session-expired' };

  switch (error.type) {
    case 'network':
    case 'timeout':
      return { type: 'network', cause: error };
    case 'unauthorized':
      return rejected;
    case 'http':
      return error.status >= 400 && error.status < 500 && error.status !== 429
        ? rejected
        : { type: 'unknown', cause: error };
    case 'invalid-response':
      return { type: 'unknown', cause: error };
  }
}

// R360 recibe las credenciales como Base64 de un JSON en el header Authorization
const credentialsHeader = (email: string, password: string) =>
  `Bearer ${encodeBase64Utf8(JSON.stringify({ email, password }))}`;

export function createR360AuthGateway(http: HttpClient): AuthGateway {
  return {
    async login({ email, password }) {
      const result = await http.request({
        method: 'POST',
        url: '/auth/login',
        schema: loginResponseSchema,
        authenticated: false,
        headers: { Authorization: credentialsHeader(email, password) },
      });
      if (!result.ok) return err(toAuthError(result.error, 'login'));
      if (result.value.newPasswordRequired) return err({ type: 'password-change-required' });

      const { idToken, refreshToken } = result.value;
      return ok({ idToken, refreshToken });
    },

    async refresh(tokens) {
      const result = await http.request({
        method: 'POST',
        url: '/auth/refresh-token',
        schema: refreshResponseSchema,
        authenticated: false,
        headers: {
          Authorization: `Bearer ${tokens.idToken}`,
          authorizationrefresh: `Bearer ${tokens.refreshToken}`,
        },
      });
      if (!result.ok) return err(toAuthError(result.error, 'refresh'));

      return ok({
        idToken: result.value.idToken,
        refreshToken: result.value.refreshToken ?? tokens.refreshToken,
      });
    },
  };
}
