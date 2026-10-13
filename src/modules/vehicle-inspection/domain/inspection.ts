import type { Answer, Answers, PhotoRef } from './answers';
import type { InspectionDefinition } from './definition';
import { currentStep, isComplete, pruneAnswers, visibleSteps } from './flow';
import type { SubmitInspectionRequest, TramaAnswer } from './ports';
import { err, ok, type Result } from '@/shared/domain';

export const OBSERVATION_MAX_LENGTH = 500;

// draft: en curso · submitted: enviada (o en cola) · observed: placa no coincide
export type InspectionState = 'draft' | 'submitted' | 'observed';

export type Inspection = {
  readonly id: string;
  readonly definitionVersion: string;
  readonly vehicleId: string;
  readonly appointmentId: string;
  readonly voucherCode: string;
  readonly clientName: string;
  readonly plate: string;
  readonly inspectorId: string;
  readonly inspectorName: string;
  readonly state: InspectionState;
  readonly answers: Answers;
  readonly observation: string;
  readonly startedAt: string;
  readonly updatedAt: string;
  readonly finishedAt: string | null;
};

export type InspectionError =
  | { readonly type: 'not-editable' }
  | { readonly type: 'unknown-step'; readonly stepId: string }
  | { readonly type: 'hidden-step'; readonly stepId: string }
  | { readonly type: 'wrong-answer-kind'; readonly stepId: string }
  | { readonly type: 'observation-too-long' }
  | { readonly type: 'incomplete'; readonly missingStepId: string };

export type StartInspection = Pick<
  Inspection,
  | 'id'
  | 'vehicleId'
  | 'appointmentId'
  | 'voucherCode'
  | 'clientName'
  | 'plate'
  | 'inspectorId'
  | 'inspectorName'
>;

export const startInspection = (
  data: StartInspection,
  definition: InspectionDefinition,
  now: Date,
): Inspection => ({
  ...data,
  definitionVersion: definition.version,
  state: 'draft',
  answers: {},
  observation: '',
  startedAt: now.toISOString(),
  updatedAt: now.toISOString(),
  finishedAt: null,
});

export type AnswerResult = {
  readonly inspection: Inspection;
  // Fotos que dejaron de aplicar: hay que borrarlas del dispositivo
  readonly discardedPhotos: readonly PhotoRef[];
};

export function answerStep(
  inspection: Inspection,
  definition: InspectionDefinition,
  stepId: string,
  answer: Answer,
  now: Date,
): Result<AnswerResult, InspectionError> {
  if (inspection.state !== 'draft') return err({ type: 'not-editable' });
  const step = definition.steps.find((candidate) => candidate.id === stepId);
  if (!step) return err({ type: 'unknown-step', stepId });
  if (step.kind !== answer.kind) return err({ type: 'wrong-answer-kind', stepId });
  if (!visibleSteps(definition, inspection.answers).some((visible) => visible.id === stepId)) {
    return err({ type: 'hidden-step', stepId });
  }

  const previous = inspection.answers[stepId];
  const stamped: Answer = { ...answer, answeredAt: now.toISOString() };
  const { answers, removed } = pruneAnswers(definition, {
    ...inspection.answers,
    [stepId]: stamped,
  });
  const replaced =
    previous?.kind === 'photo' && answer.kind === 'photo' && previous.photo.id !== answer.photo.id
      ? [previous.photo]
      : [];
  const discardedPhotos = [
    ...replaced,
    ...removed.flatMap(({ answer: lost }) => (lost.kind === 'photo' ? [lost.photo] : [])),
  ];
  return ok({
    inspection: { ...inspection, answers, updatedAt: now.toISOString() },
    discardedPhotos,
  });
}

export function setObservation(
  inspection: Inspection,
  observation: string,
): Result<Inspection, InspectionError> {
  if (inspection.state !== 'draft') return err({ type: 'not-editable' });
  if (observation.length > OBSERVATION_MAX_LENGTH) return err({ type: 'observation-too-long' });
  return ok({ ...inspection, observation });
}

export function submitInspection(
  inspection: Inspection,
  definition: InspectionDefinition,
  now: Date,
): Result<Inspection, InspectionError> {
  if (inspection.state !== 'draft') return err({ type: 'not-editable' });
  const missing = currentStep(definition, inspection.answers);
  if (missing) return err({ type: 'incomplete', missingStepId: missing.id });
  const at = now.toISOString();
  return ok({ ...inspection, state: 'submitted', updatedAt: at, finishedAt: at });
}

// La placa no coincide: la inspección termina como observada y se informa al supervisor
export function reportPlateMismatch(
  inspection: Inspection,
  now: Date,
): Result<Inspection, InspectionError> {
  if (inspection.state !== 'draft') return err({ type: 'not-editable' });
  const at = now.toISOString();
  return ok({ ...inspection, state: 'observed', updatedAt: at, finishedAt: at });
}

export const photosOf = (inspection: Pick<Inspection, 'answers'>): PhotoRef[] =>
  Object.values(inspection.answers).flatMap((answer) =>
    answer.kind === 'photo' ? [answer.photo] : [],
  );

export const readyToSubmit = (inspection: Inspection, definition: InspectionDefinition) =>
  inspection.state === 'draft' && isComplete(definition, inspection.answers);

function toTramaValue(answer: Answer): TramaAnswer['value'] {
  if (answer.kind === 'yes_no') return answer.value;
  if (answer.kind === 'plate') return { plateMatches: answer.confirmed };
  const { photo } = answer;
  return {
    photo: {
      hash: photo.hash,
      takenAt: photo.takenAt,
      width: photo.width,
      height: photo.height,
      sizeKb: Math.round(photo.bytes / 1024),
    },
  };
}

// Todas las preguntas de la versión viajan siempre, cada una con su estado (trama)
export function toSubmitRequest(
  inspection: Inspection,
  definition: InspectionDefinition,
): SubmitInspectionRequest {
  const visible = new Set(visibleSteps(definition, inspection.answers).map((step) => step.id));
  const observed = inspection.state === 'observed';
  const answers = definition.steps.map((step): TramaAnswer => {
    const answer = inspection.answers[step.id];
    const base = { questionId: step.questionId, code: step.id };
    if (answer) {
      return {
        ...base,
        status: 'ANSWERED',
        value: toTramaValue(answer),
        answeredAt: answer.answeredAt ?? null,
      };
    }
    // La placa que no coincide se registra como respuesta de la pregunta 1
    if (observed && step.kind === 'plate') {
      return {
        ...base,
        status: 'ANSWERED',
        value: { plateMatches: false },
        answeredAt: inspection.finishedAt,
      };
    }
    return {
      ...base,
      status: visible.has(step.id) ? 'PENDING' : 'SKIPPED',
      value: null,
      answeredAt: null,
    };
  });
  return {
    inspectionId: inspection.id,
    definitionVersion: inspection.definitionVersion,
    vehicleId: inspection.vehicleId,
    appointmentId: inspection.appointmentId,
    plate: inspection.plate,
    inspectorId: inspection.inspectorId,
    startedAt: inspection.startedAt,
    finishedAt: inspection.finishedAt ?? inspection.updatedAt,
    result: observed ? 'OBSERVED' : 'COMPLETED',
    observation: inspection.observation.trim(),
    answers,
    photos: Object.entries(inspection.answers).flatMap(([stepId, answer]) =>
      answer.kind === 'photo' ? [{ stepId, photo: answer.photo }] : [],
    ),
  };
}
