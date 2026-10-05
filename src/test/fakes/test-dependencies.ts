import type { Dependencies } from '@/core/di';
import type { Logger } from '@/shared/domain';

import { createFixedClock } from './fixed-clock';

export const silentLogger: Logger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

export function createTestDependencies(overrides: Partial<Dependencies> = {}): Dependencies {
  return {
    config: { appVersion: '1.0.0', timeZone: 'America/El_Salvador', isDemoAuth: false },
    logger: silentLogger,
    clock: createFixedClock(),
    ...overrides,
  };
}
