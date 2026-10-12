import {
  answerStep,
  buildBoard,
  reportPlateMismatch,
  setObservation,
  startInspection,
  submitInspection,
  toSubmitRequest,
  type Answer,
  type CapturedPhoto,
  type Inspection,
  type InspectionBoard,
  type InspectionCommandError,
  type InspectionDefinition,
  type InspectionError,
  type InspectionRepository,
  type Inspector,
  type OpenInspectionError,
  type PhotoStore,
  type StoredInspection,
} from '../domain';
import {
  applyEntries,
  err,
  findVehicle,
  ok,
  type Clock,
  type EntryLog,
  type Logger,
  type Result,
  type ShiftReader,
  SHIFT_TABLES,
} from '@/shared/domain';

export type InspectionDeps = {
  readonly repo: InspectionRepository;
  readonly photos: PhotoStore;
  readonly shift: ShiftReader;
  readonly entries: EntryLog;
  readonly definition: InspectionDefinition;
  readonly clock: Clock;
  readonly createId: () => string;
  readonly requestSync: () => Promise<void>;
  readonly logger: Logger;
};

type CommandResult = Promise<Result<Inspection, InspectionCommandError>>;

const guard = async <T>(deps: InspectionDeps, task: () => Promise<T>, what: string) => {
  try {
    return ok(await task());
  } catch (cause) {
    deps.logger.error(what, { error: String(cause) });
    return err({ type: 'storage' as const });
  }
};

// Retoma el borrador del vehículo o empieza uno nuevo (RF-G9)
export const openInspection =
  (deps: InspectionDeps) =>
  async (input: {
    readonly vehicleId: string;
    readonly inspector: Inspector;
  }): Promise<Result<StoredInspection, OpenInspectionError>> => {
    const baseline = await deps.shift.current();
    if (!baseline) return err({ type: 'no-shift' });
    const snapshot = applyEntries(baseline, await deps.entries.list());
    const found = findVehicle(snapshot, input.vehicleId);
    if (!found) return err({ type: 'vehicle-not-found' });
    if (!found.vehicle.enteredAt) return err({ type: 'not-entered' });

    const existing = await deps.repo.findByVehicle(input.vehicleId);
    if (existing) return ok(existing);

    const inspection = startInspection(
      {
        id: deps.createId(),
        vehicleId: found.vehicle.id,
        appointmentId: found.appointment.id,
        voucherCode: found.appointment.voucherCode,
        clientName: found.appointment.clientName,
        plate: found.vehicle.plate,
        inspectorId: input.inspector.id,
        inspectorName: input.inspector.name,
      },
      deps.definition,
      deps.clock.now(),
    );
    const saved = await guard(
      deps,
      () => deps.repo.save(inspection),
      'No se pudo crear la inspección',
    );
    if (!saved.ok) return saved;
    return ok({ ...inspection, syncStatus: null, syncMessage: null, uploadedPhotos: 0 });
  };

async function load(deps: InspectionDeps, id: string) {
  const inspection = await deps.repo.findById(id);
  return inspection ? ok(inspection) : err({ type: 'not-found' as const });
}

async function persistAnswer(
  deps: InspectionDeps,
  inspection: Inspection,
  stepId: string,
  answer: Answer,
): CommandResult {
  const result = answerStep(inspection, deps.definition, stepId, answer, deps.clock.now());
  if (!result.ok) return result;
  const saved = await guard(
    deps,
    () => deps.repo.save(result.value.inspection),
    'No se pudo guardar la respuesta',
  );
  if (!saved.ok) return saved;
  // Las fotos que dejaron de aplicar se borran del dispositivo (RF-G4)
  await Promise.all(
    result.value.discardedPhotos.map((photo) =>
      deps.photos
        .delete(photo)
        .catch((error: unknown) =>
          deps.logger.warn('No se pudo borrar una foto descartada', { error: String(error) }),
        ),
    ),
  );
  return ok(result.value.inspection);
}

export const answerInspection =
  (deps: InspectionDeps) =>
  async (id: string, stepId: string, answer: Exclude<Answer, { kind: 'photo' }>): CommandResult => {
    const inspection = await load(deps, id);
    if (!inspection.ok) return inspection;
    return persistAnswer(deps, inspection.value, stepId, answer);
  };

export const capturePhoto =
  (deps: InspectionDeps) =>
  async (id: string, stepId: string, capture: CapturedPhoto): CommandResult => {
    const inspection = await load(deps, id);
    if (!inspection.ok) return inspection;
    if (inspection.value.state !== 'draft') return err({ type: 'not-editable' });

    let photo;
    try {
      photo = await deps.photos.save({
        inspectionId: id,
        stepId,
        capture,
        takenAt: deps.clock.now(),
      });
    } catch (cause) {
      deps.logger.error('No se pudo guardar la foto', { error: String(cause) });
      return err({ type: 'photo-failed' });
    }
    const result = await persistAnswer(deps, inspection.value, stepId, { kind: 'photo', photo });
    if (!result.ok) await deps.photos.delete(photo).catch(() => undefined);
    return result;
  };

export const updateObservation =
  (deps: InspectionDeps) =>
  async (id: string, observation: string): CommandResult => {
    const inspection = await load(deps, id);
    if (!inspection.ok) return inspection;
    const result = setObservation(inspection.value, observation);
    if (!result.ok) return result;
    const saved = await guard(deps, () => deps.repo.save(result.value), 'No se pudo guardar');
    return saved.ok ? ok(result.value) : saved;
  };

async function close(
  deps: InspectionDeps,
  id: string,
  apply: (inspection: Inspection) => Result<Inspection, InspectionError>,
): CommandResult {
  const inspection = await load(deps, id);
  if (!inspection.ok) return inspection;
  const finished = apply(inspection.value);
  if (!finished.ok) return finished;
  const saved = await guard(
    deps,
    () => deps.repo.saveFinished(finished.value, toSubmitRequest(finished.value)),
    'No se pudo cerrar la inspección',
  );
  if (!saved.ok) return saved;
  // El envío no bloquea: queda en la outbox hasta que haya red (RF-G8)
  void deps.requestSync();
  return ok(finished.value);
}

export const finishInspection = (deps: InspectionDeps) => (id: string) =>
  close(deps, id, (inspection) => submitInspection(inspection, deps.definition, deps.clock.now()));

// La placa no coincide (RF-G1b): se registra la incidencia como inspección observada
export const reportMismatch = (deps: InspectionDeps) => (id: string) =>
  close(deps, id, (inspection) => reportPlateMismatch(inspection, deps.clock.now()));

export const loadBoard =
  (deps: Pick<InspectionDeps, 'shift' | 'entries' | 'repo' | 'definition'>) =>
  async (): Promise<Result<InspectionBoard, { readonly type: 'no-shift' }>> => {
    const baseline = await deps.shift.current();
    if (!baseline) return err({ type: 'no-shift' });
    const snapshot = applyEntries(baseline, await deps.entries.list());
    return ok(buildBoard(snapshot, await deps.repo.list(), deps.definition));
  };

// Tablas que cambian el tablero: paquete del día, ingresos locales e inspecciones
export const boardTables = (deps: Pick<InspectionDeps, 'entries' | 'repo'>) => [
  ...SHIFT_TABLES,
  ...deps.entries.tables,
  ...deps.repo.tables,
];
