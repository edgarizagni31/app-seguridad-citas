import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

import type { Dependencies } from '@/core/di';
import { login, logout, refreshSession, restoreSession } from '@/modules/auth/application';
import {
  createMockAuthGateway,
  createR360AuthGateway,
  jwtTokenDecoder,
  secureStoreSessionStorage,
} from '@/modules/auth/infrastructure';
import { createHttpClient, createLogger, systemClock, type Env } from '@/shared/infrastructure';

export function createContainer(env: Env): Dependencies {
  const logger = createLogger({ minLevel: env.appVariant === 'production' ? 'warn' : 'debug' });
  const clock = systemClock;

  const r360Http = createHttpClient({
    baseUrl: env.r360ApiUrl,
    appVersion: env.appVersion,
    platform: Platform.OS,
    createCorrelationId: Crypto.randomUUID,
  });

  const authDeps = {
    authGateway:
      env.authProvider === 'mock'
        ? createMockAuthGateway({ clock })
        : createR360AuthGateway(r360Http),
    tokenDecoder: jwtTokenDecoder,
    sessionStorage: secureStoreSessionStorage,
    clock,
  };

  return {
    config: {
      appVersion: env.appVersion,
      timeZone: env.timeZone,
      isDemoAuth: env.authProvider === 'mock',
    },
    logger,
    clock,
    auth: {
      login: login(authDeps),
      restoreSession: restoreSession(authDeps),
      refreshSession: refreshSession(authDeps),
      logout: logout(authDeps),
    },
  };
}
