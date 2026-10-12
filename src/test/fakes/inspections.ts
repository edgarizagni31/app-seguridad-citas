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
    clearSynced: jest.fn(async () => undefined),
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
  } satisfies PhotoStore;
}
