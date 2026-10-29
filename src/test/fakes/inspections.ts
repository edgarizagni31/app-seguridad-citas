import type { InspectionUseCases } from '@/core/di';
import {
  answerInspection,
  capturePhoto,
  discardCapture,
  finishInspection,
  openInspection,
  reportMismatch,
  updateObservation,
} from '@/modules/vehicle-inspection/application';
import { createMockInspectionGateway } from '@/modules/vehicle-inspection/infrastructure';
import type { ChangeBus } from '@/shared/infrastructure/db';

import { createFixedClock } from './fixed-clock';
import { silentLogger } from './test-dependencies';

import type {
  ExecuteInspectionRequest,
  Inspection,
  InspectionGateway,
  InspectionRepository,
  InspectionTarget,
  InspectionVerdict,
  PhotoRef,
  PhotoStore,
  StoredInspection,
} from '@/modules/vehicle-inspection/domain';

export const TEST_TARGET: InspectionTarget = {
  voucherId: 'voucher-1',
  unitId: 'vtu-1',
  voucherCode: 'APPASP0000000000000093',
  clientName: 'DELOSI',
  plate: 'ABC-123',
};

export function createMemoryInspectionRepository(initial: StoredInspection[] = []) {
  const rows = new Map(initial.map((inspection) => [inspection.id, inspection]));
  const stored = (inspection: Inspection): StoredInspection => ({
    syncStatus: null,
    syncMessage: null,
    verdict: null,
    ...rows.get(inspection.id),
    ...inspection,
  });
  const update = (id: string, change: Partial<StoredInspection>) => {
    const current = rows.get(id);
    if (current) rows.set(id, { ...current, ...change });
  };

  return {
    tables: ['unit_inspections'],
    save: jest.fn(async (inspection: Inspection) => {
      rows.set(inspection.id, stored(inspection));
    }),
    findById: jest.fn(async (id: string) => rows.get(id) ?? null),
    findByUnit: jest.fn(
      async (voucherId: string, unitId: string) =>
        [...rows.values()].find(
          (inspection) => inspection.voucherId === voucherId && inspection.unitId === unitId,
        ) ?? null,
    ),
    list: jest.fn(async () => [...rows.values()]),
    saveFinished: jest.fn(async (inspection: Inspection, _request: ExecuteInspectionRequest) => {
      rows.set(inspection.id, { ...stored(inspection), syncStatus: 'pending', verdict: null });
    }),
    markSynced: jest.fn(async (id: string, verdict: InspectionVerdict) =>
      update(id, { syncStatus: 'synced', verdict }),
    ),
    markRejected: jest.fn(async (id: string, syncMessage: string) =>
      update(id, { syncStatus: 'rejected', syncMessage }),
    ),
    markPending: jest.fn(async (id: string) =>
      update(id, { syncStatus: 'pending', syncMessage: null }),
    ),
    clearSynced: jest.fn(async () => undefined),
    delete: jest.fn(async (id: string) => {
      rows.delete(id);
    }),
  } satisfies InspectionRepository;
}

export function createFakePhotoStore() {
  let next = 0;
  return {
    save: jest.fn(async ({ stepId, takenAt }: { stepId: string; takenAt: Date }) => {
      next += 1;
      const photo: PhotoRef = {
        id: `photo-${next}`,
        uri: `file:///inspections/${stepId}-${next}.jpg`,
        takenAt: takenAt.toISOString(),
        width: 1600,
        height: 1200,
        bytes: 250_000,
        hash: `hash-${next}`,
      };
      return photo;
    }),
    readBase64: jest.fn(async (photo: PhotoRef) => `base64-${photo.id}`),
    delete: jest.fn(async () => undefined),
    deleteAll: jest.fn(async () => undefined),
    discardCapture: jest.fn(async () => undefined),
  } satisfies PhotoStore;
}

// Casos de uso reales sobre memoria y el protocolo de la demo, para probar pantallas de punta a punta
export function createMemoryInspections({
  changes,
  online = true,
  gateway,
  now = new Date('2026-10-05T17:00:00Z'),
}: {
  changes: ChangeBus;
  online?: boolean;
  gateway?: InspectionGateway;
  now?: Date;
}) {
  const repo = createMemoryInspectionRepository();
  const notify = () => changes.emit(['unit_inspections']);
  for (const method of ['save', 'saveFinished', 'markSynced'] as const) {
    const original = repo[method].getMockImplementation();
    repo[method].mockImplementation((async (...args: never[]) => {
      await (original as (...a: never[]) => Promise<void>)(...args);
      notify();
    }) as never);
  }
  let ids = 0;
  const deps = {
    repo,
    photos: createFakePhotoStore(),
    gateway: gateway ?? createMockInspectionGateway({ isOnline: async () => online, latencyMs: 0 }),
    isOnline: async () => online,
    clock: createFixedClock(now.toISOString()),
    createId: () => `insp-${(ids += 1)}`,
    requestSync: jest.fn(async () => undefined),
    logger: silentLogger,
  };
  const useCases: InspectionUseCases = {
    list: repo.list,
    get: repo.findById,
    tables: ['unit_inspections'],
    open: jest.fn(openInspection(deps)),
    answer: jest.fn(answerInspection(deps)),
    capturePhoto: jest.fn(capturePhoto(deps)),
    discardCapture: jest.fn(discardCapture(deps)),
    updateObservation: jest.fn(updateObservation(deps)),
    finish: jest.fn(finishInspection(deps)),
    reportMismatch: jest.fn(reportMismatch(deps)),
  };
  return { useCases, repo, deps };
}
