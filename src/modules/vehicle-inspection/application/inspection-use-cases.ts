import {
  answerStep,
  definitionFromProtocol,
  reportPlateMismatch,
  setObservation,
  startInspection,
  submitInspection,
  toExecuteRequest,
  type Answer,
  type CapturedPhoto,
  type Inspection,
  type InspectionCommandError,
  type InspectionError,
  type InspectionGateway,
  type InspectionRepository,
  type InspectionTarget,
  type Inspector,
  type OpenInspectionError,
  type PhotoStore,
  type StoredInspection,
} from '../domain';
import { err, ok, type Clock, type Logger, type Result } from '@/shared/domain';

export type InspectionDeps = {
  readonly repo: InspectionRepository;
  readonly photos: PhotoStore;
  readonly gateway: InspectionGateway;
  readonly isOnline: () => Promise<boolean>;
  readonly clock: Clock;
  readonly createId: () => string;
  readonly requestSync: () => Promise<void>;
  readonly logger: Logger;
};

type CommandResult = Promise<Result<Inspection, InspectionCommandError>>;

const guard = async <T>(
  deps: Pick<InspectionDeps, 'logger'>,
  task: () => Promise<T>,
  what: string,
) => {
  try {
    return ok(await task());
  } catch (cause) {
    deps.logger.error(what, { error: String(cause) });
    return err({ type: 'storage' as const });
  }
};

// Retoma el borrador local de la unidad (sin red) o descarga el protocolo y empieza uno nuevo
export const openInspection =
  (deps: InspectionDeps) =>
  async (input: {
    readonly target: InspectionTarget;
    readonly inspector: Inspector;
  }): Promise<Result<StoredInspection, OpenInspectionError>> => {
    const { target, inspector } = input;
    const existing = await deps.repo.findByUnit(target.voucherId, target.unitId);
    if (existing) return ok(existing);

    if (!(await deps.isOnline())) return err({ type: 'offline' });
    const protocol = await deps.gateway.getProtocol(target.voucherId, target.unitId);
    if (!protocol.ok) return protocol;
    const definition = definitionFromProtocol(protocol.value);
    if (!definition.ok) return definition;

    const inspection = startInspection(
      {
        id: deps.createId(),
        voucherId: target.voucherId,
        unitId: target.unitId,
        voucherCode: target.voucherCode,
        clientName: target.clientName,
        plate: target.plate,
        inspectorId: inspector.id,
        inspectorName: inspector.name,
      },
      protocol.value,
      deps.clock.now(),
    );
    const saved = await guard(
      deps,
      () => deps.repo.save(inspection),
      'No se pudo crear la inspección',
    );
    if (!saved.ok) return saved;
    return ok({ ...inspection, syncStatus: null, syncMessage: null, verdict: null });
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
  const result = answerStep(inspection, stepId, answer, deps.clock.now());
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

export const discardCapture =
  (deps: Pick<InspectionDeps, 'photos' | 'logger'>) => async (capture: CapturedPhoto) => {
    await deps.photos
      .discardCapture(capture)
      .catch((error: unknown) =>
        deps.logger.warn('No se pudo borrar la captura descartada', { error: String(error) }),
      );
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
    () => deps.repo.saveFinished(finished.value, toExecuteRequest(finished.value)),
    'No se pudo cerrar la inspección',
  );
  if (!saved.ok) return saved;
  // El envío no bloquea: queda en la outbox hasta que haya red (RF-G8)
  void deps.requestSync();
  return ok(finished.value);
}

export const finishInspection = (deps: InspectionDeps) => (id: string) =>
  close(deps, id, (inspection) => submitInspection(inspection, deps.clock.now()));

// La placa no coincide (RF-G1b): se envía como el control no conforme de la placa
export const reportMismatch = (deps: InspectionDeps) => (id: string) =>
  close(deps, id, (inspection) => reportPlateMismatch(inspection, deps.clock.now()));
