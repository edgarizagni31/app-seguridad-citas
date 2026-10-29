import type { Answer, Answers, PhotoRef } from './answers';
import type { InspectionDefinition } from './definition';
import { currentStep, isComplete, pruneAnswers, visibleSteps } from './flow';
import type { ExecuteAnswer, ExecuteInspectionRequest } from './ports';
import {
  definitionFromProtocol,
  optionFor,
  savedAnswers,
  type InspectionProtocol,
} from './protocol';
import { err, ok, type Result } from '@/shared/domain';

export const OBSERVATION_MAX_LENGTH = 500;

// draft: en curso · submitted: enviada (o en cola) · observed: placa no coincide
export type InspectionState = 'draft' | 'submitted' | 'observed';

// Una inspección por unidad de la cita (VoucherId + VoucherTransportUnitId)
export type Inspection = {
  readonly id: string;
  // El protocolo descargado viaja con la inspección: se puede retomar y enviar sin red
  readonly protocol: InspectionProtocol;
  readonly voucherId: string;
  readonly unitId: string;
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
  | 'voucherId'
  | 'unitId'
  | 'voucherCode'
  | 'clientName'
  | 'plate'
  | 'inspectorId'
  | 'inspectorName'
>;

// Lo ya guardado en el servidor se precarga al empezar
export const startInspection = (
  data: StartInspection,
  protocol: InspectionProtocol,
  now: Date,
): Inspection => ({
  ...data,
  protocol,
  state: 'draft',
  answers: savedAnswers(protocol),
  observation: '',
  startedAt: now.toISOString(),
  updatedAt: now.toISOString(),
  finishedAt: null,
});

// El protocolo se validó al abrir la inspección; si no, queda sin pasos
export function definitionOf(inspection: Pick<Inspection, 'protocol'>): InspectionDefinition {
  const result = definitionFromProtocol(inspection.protocol);
  return result.ok ? result.value : { version: inspection.protocol.protocolId, steps: [] };
}

export type AnswerResult = {
  readonly inspection: Inspection;
  // Fotos que dejaron de aplicar: hay que borrarlas del dispositivo
  readonly discardedPhotos: readonly PhotoRef[];
};

const isLocal = (photo: PhotoRef) => !photo.remoteUrl;

export function answerStep(
  inspection: Inspection,
  stepId: string,
  answer: Answer,
  now: Date,
): Result<AnswerResult, InspectionError> {
  if (inspection.state !== 'draft') return err({ type: 'not-editable' });
  const definition = definitionOf(inspection);
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
  ].filter(isLocal);
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
  now: Date,
): Result<Inspection, InspectionError> {
  if (inspection.state !== 'draft') return err({ type: 'not-editable' });
  const missing = currentStep(definitionOf(inspection), inspection.answers);
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

export const readyToSubmit = (inspection: Inspection) =>
  inspection.state === 'draft' && isComplete(definitionOf(inspection), inspection.answers);

// Respuestas visibles contestadas; las ocultas viajan como SKIPPED (ExecuteInspectionProtocol)
export function toExecuteRequest(inspection: Inspection): ExecuteInspectionRequest {
  const definition = definitionOf(inspection);
  const visible = new Set(visibleSteps(definition, inspection.answers).map((step) => step.id));
  const questionByCode = new Map(inspection.protocol.questions.map((q) => [q.code, q]));
  const observed = inspection.state === 'observed';

  const answers = definition.steps.flatMap((step): ExecuteAnswer[] => {
    const question = questionByCode.get(step.id);
    if (!question) return [];
    const answer = inspection.answers[step.id];
    if (answer) {
      return [
        {
          questionId: question.id,
          status: 'ANSWERED',
          optionId: optionFor(question, answer),
          photo: answer.kind === 'photo' ? answer.photo : null,
        },
      ];
    }
    if (observed && step.kind === 'plate') {
      return [
        {
          questionId: question.id,
          status: 'ANSWERED',
          optionId: optionFor(question, 'plate-mismatch'),
          photo: null,
        },
      ];
    }
    if (!visible.has(step.id)) {
      return [{ questionId: question.id, status: 'SKIPPED', optionId: null, photo: null }];
    }
    return [];
  });

  return {
    inspectionId: inspection.id,
    protocolId: inspection.protocol.protocolId,
    voucherId: inspection.voucherId,
    unitId: inspection.unitId,
    plate: inspection.plate,
    observation: inspection.observation.trim() || null,
    answers,
  };
}
