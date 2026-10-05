import type { Dependencies } from '@/core/di';
import { createLogger, systemClock, type Env } from '@/shared/infrastructure';

export function createContainer(env: Env): Dependencies {
  const logger = createLogger({ minLevel: env.appVariant === 'production' ? 'warn' : 'debug' });

  return {
    config: {
      appVersion: env.appVersion,
      timeZone: env.timeZone,
      isDemoAuth: env.authProvider === 'mock',
    },
    logger,
    clock: systemClock,
  };
}
