import type {
  AccessControlUseCases,
  AuthUseCases,
  Dependencies,
  InspectionUseCases,
  SitesUseCases,
} from '@/core/di';
import { readQr } from '@/modules/access-control/application';
import { err, ok, type Clock, type Logger } from '@/shared/domain';
import { createChangeBus } from '@/shared/infrastructure/db';
import { buildDemoSnapshot } from '@/shared/infrastructure/demo';

import { buildSession } from '../factories/auth';
import { createFakeConnectivity } from './connectivity';
import { createFixedClock } from './fixed-clock';
import { createFakeSync } from './sync';

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

export const TEST_SITE = { id: 'site-central', name: 'Almacén Central' } as const;

export const createFakeSitesUseCases = (overrides: Partial<SitesUseCases> = {}) => {
  const snapshot = buildDemoSnapshot(
    TEST_SITE.id,
    TEST_SITE.name,
    '2026-10-05',
    new Date('2026-10-05T16:42:00.000Z'),
  );
  return {
    listSites: jest.fn(async () => ok([TEST_SITE])),
    shiftStatus: jest.fn(async () => ok({ type: 'ready' as const, site: TEST_SITE, snapshot })),
    startShift: jest.fn(async () => ok(snapshot)),
    endShift: jest.fn(async () => ok(undefined)),
    changeSite: jest.fn(async () => ok(undefined)),
    ...overrides,
  };
};

export const createFakeAccessControl = (
  clock: Clock,
  overrides: Partial<AccessControlUseCases> = {},
): AccessControlUseCases => ({
  readQr: readQr({ clock }),
  validateUnit: jest.fn(async () => err({ type: 'no-shift' as const })),
  identifyVehicle: jest.fn(async () => err({ type: 'no-shift' as const })),
  validateVisitor: jest.fn(async () => ok({ checkedBy: 'server' as const })),
  confirmEntry: jest.fn(async () => err({ type: 'storage' as const })),
  ...overrides,
});

const notFound = async () => err({ type: 'not-found' as const });

export const createFakeInspections = (
  overrides: Partial<InspectionUseCases> = {},
): InspectionUseCases => ({
  list: jest.fn(async () => []),
  get: jest.fn(async () => null),
  tables: [],
  open: jest.fn(async () => err({ type: 'offline' as const })),
  answer: jest.fn(notFound),
  capturePhoto: jest.fn(notFound),
  discardCapture: jest.fn(async () => undefined),
  updateObservation: jest.fn(notFound),
  finish: jest.fn(notFound),
  reportMismatch: jest.fn(notFound),
  ...overrides,
});

export function createTestDependencies(overrides: Partial<Dependencies> = {}): Dependencies {
  const clock = overrides.clock ?? createFixedClock();
  return {
    config: { appVersion: '1.0.0', timeZone: 'America/El_Salvador', isDemoAuth: false },
    logger: silentLogger,
    clock,
    connectivity: createFakeConnectivity(),
    changes: createChangeBus(),
    sync: createFakeSync(),
    localData: {
      listTables: jest.fn(async () => []),
      readTable: jest.fn(async () => null),
    },
    notifications: {
      prepare: jest.fn(async () => undefined),
      notify: jest.fn(async () => undefined),
      onOpen: jest.fn(() => () => undefined),
    },
    auth: createFakeAuthUseCases(),
    accessControl: createFakeAccessControl(clock),
    gate: {
      lookup: jest.fn(async () => err({ type: 'offline' as const })),
      presentUnit: jest.fn(async () => err({ type: 'offline' as const })),
      presentPerson: jest.fn(async () => err({ type: 'offline' as const })),
      confirmVehicle: jest.fn(async () => err({ type: 'offline' as const })),
      confirmPedestrian: jest.fn(async () => err({ type: 'offline' as const })),
    },
    sites: createFakeSitesUseCases(),
    history: { tables: [], list: jest.fn(async () => []) },
    inspections: createFakeInspections(),
    ...overrides,
  };
}
