import type { InspectionUseCases } from '@/core/di';
import {
  answerInspection,
  capturePhoto,
  discardCapture,
  finishInspection,
  loadBoard,
  openInspection,
  reportMismatch,
  updateObservation,
} from '@/modules/vehicle-inspection/application';
import { STANDARD_DEFINITION_V1 } from '@/modules/vehicle-inspection/domain';
import type { LocalEntry, ShiftSnapshot } from '@/shared/domain';
import type { ChangeBus } from '@/shared/infrastructure/db';

import { createFixedClock } from './fixed-clock';
import { silentLogger } from './test-dependencies';

import type {
  Inspection,
  InspectionRepository,
  PhotoRef,
  PhotoStore,
  StoredInspection,
  SubmitInspectionRequest,
} from '@/modules/vehicle-inspection/domain';

export function createMemoryInspectionRepository(initial: StoredInspection[] = []) {
  const rows = new Map(initial.map((inspection) => [inspection.id, inspection]));
  const stored = (inspection: Inspection): StoredInspection => ({
    syncStatus: null,
    syncMessage: null,
    uploadedPhotos: 0,
    ...rows.get(inspection.id),
    ...inspection,
  });
  const update = (id: string, change: Partial<StoredInspection>) => {
    const current = rows.get(id);
    if (current) rows.set(id, { ...current, ...change });
  };

  return {
    tables: ['inspections'],
    save: jest.fn(async (inspection: Inspection) => {
      rows.set(inspection.id, stored(inspection));
    }),
    findById: jest.fn(async (id: string) => rows.get(id) ?? null),
    findByVehicle: jest.fn(
      async (vehicleId: string) =>
        [...rows.values()].find((inspection) => inspection.vehicleId === vehicleId) ?? null,
    ),
    list: jest.fn(async () => [...rows.values()]),
    saveFinished: jest.fn(async (inspection: Inspection, _request: SubmitInspectionRequest) => {
      rows.set(inspection.id, { ...stored(inspection), syncStatus: 'pending', uploadedPhotos: 0 });
    }),
    setUploadedPhotos: jest.fn(async (id: string, uploadedPhotos: number) =>
      update(id, { uploadedPhotos }),
    ),
    markSynced: jest.fn(async (id: string) => update(id, { syncStatus: 'synced' })),
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
    delete: jest.fn(async () => undefined),
    deleteAll: jest.fn(async () => undefined),
    discardCapture: jest.fn(async () => undefined),
  } satisfies PhotoStore;
}

// Casos de uso reales sobre memoria, para probar pantallas de punta a punta
export function createMemoryInspections({
  changes,
  snapshot,
  entries = [],
  now = new Date('2026-10-05T17:00:00Z'),
}: {
  changes: ChangeBus;
  snapshot: ShiftSnapshot | null;
  entries?: LocalEntry[];
  now?: Date;
}) {
  const repo = createMemoryInspectionRepository();
  const notify = () => changes.emit(['inspections']);
  for (const method of ['save', 'saveFinished', 'markSynced', 'setUploadedPhotos'] as const) {
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
    shift: { current: async () => snapshot },
    entries: { tables: [], list: async () => entries },
    definition: STANDARD_DEFINITION_V1,
    clock: createFixedClock(now.toISOString()),
    createId: () => `insp-${(ids += 1)}`,
    requestSync: jest.fn(async () => undefined),
    logger: silentLogger,
  };
  const useCases: InspectionUseCases = {
    board: jest.fn(loadBoard(deps)),
    boardTables: ['inspections'],
    get: repo.findById,
    tables: ['inspections'],
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
