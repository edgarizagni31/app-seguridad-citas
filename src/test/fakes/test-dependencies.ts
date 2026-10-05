import type { AuthUseCases, Dependencies } from '@/core/di';
import { readQr } from '@/modules/access-control/application';
import { ok, type Logger } from '@/shared/domain';

import { buildSession } from '../factories/auth';
import { createFixedClock } from './fixed-clock';

export const silentLogger: Logger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

export const createFakeAuthUseCases = (overrides: Partial<AuthUseCases> = {}) => ({
  login: jest.fn(async () => ok(buildSession())),
  restoreSession: jest.fn(async () => ok(null)),
  refreshSession: jest.fn(async () => ok(buildSession())),
  logout: jest.fn(async () => ok(undefined)),
  ...overrides,
});

export function createTestDependencies(overrides: Partial<Dependencies> = {}): Dependencies {
  const clock = overrides.clock ?? createFixedClock();
  return {
    config: { appVersion: '1.0.0', timeZone: 'America/El_Salvador', isDemoAuth: false },
    logger: silentLogger,
    clock,
    auth: createFakeAuthUseCases(),
    accessControl: { readQr: readQr({ clock }) },
    ...overrides,
  };
}
