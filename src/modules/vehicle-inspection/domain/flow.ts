import type { Answer, Answers } from './answers';
import type { InspectionDefinition, StepCondition, StepDefinition } from './definition';
import { err, ok, type Result } from '@/shared/domain';

export type DefinitionError =
  | { readonly type: 'duplicate-step'; readonly stepId: string }
  | { readonly type: 'unknown-step'; readonly stepId: string; readonly reference: string }
  | { readonly type: 'not-a-question'; readonly stepId: string; readonly reference: string }
  | { readonly type: 'backward-reference'; readonly stepId: string; readonly reference: string };

// Solo se permiten referencias hacia atrás en condiciones y hacia adelante en saltos: sin ciclos
export function validateDefinition(
  definition: InspectionDefinition,
): Result<InspectionDefinition, DefinitionError[]> {
  const errors: DefinitionError[] = [];
  const index = new Map<string, number>();
  definition.steps.forEach((step, position) => {
    if (index.has(step.id)) errors.push({ type: 'duplicate-step', stepId: step.id });
    index.set(step.id, position);
  });

  const checkCondition = (step: StepDefinition, position: number, condition: StepCondition) => {
    const target = index.get(condition.stepId);
    const referenced = target === undefined ? undefined : definition.steps[target];
    if (target === undefined || !referenced) {
      errors.push({ type: 'unknown-step', stepId: step.id, reference: condition.stepId });
    } else if (referenced.kind !== 'yes_no') {
      errors.push({ type: 'not-a-question', stepId: step.id, reference: condition.stepId });
    } else if (target >= position) {
      errors.push({ type: 'backward-reference', stepId: step.id, reference: condition.stepId });
    }
  };

  definition.steps.forEach((step, position) => {
    if (step.showIf) checkCondition(step, position, step.showIf);
    for (const jump of step.jumps ?? []) {
      checkCondition(step, position + 1, jump.when);
      const target = index.get(jump.goTo);
      if (target === undefined) {
        errors.push({ type: 'unknown-step', stepId: step.id, reference: jump.goTo });
      } else if (target <= position) {
        errors.push({ type: 'backward-reference', stepId: step.id, reference: jump.goTo });
      }
    }
  });
  return errors.length > 0 ? err(errors) : ok(definition);
}

const yesNo = (answers: Answers, stepId: string) => {
  const answer = answers[stepId];
  return answer?.kind === 'yes_no' ? answer.value : undefined;
};

// Sin respuesta todavía, el paso condicionado se cuenta como posible
const conditionHolds = (answers: Answers, condition: StepCondition) => {
  const value = yesNo(answers, condition.stepId);
  return value === undefined || value === condition.equals;
};

const conditionMet = (answers: Answers, condition: StepCondition) =>
  yesNo(answers, condition.stepId) === condition.equals;

export function visibleSteps(definition: InspectionDefinition, answers: Answers): StepDefinition[] {
  const visible: StepDefinition[] = [];
  let position = 0;
  while (position < definition.steps.length) {
    const step = definition.steps[position];
    if (!step) break;
    position += 1;
    if (step.showIf && !conditionHolds(answers, step.showIf)) continue;
    visible.push(step);
    const jump = step.jumps?.find((rule) => conditionMet(answers, rule.when));
    const target = jump
      ? definition.steps.findIndex((candidate) => candidate.id === jump.goTo)
      : -1;
    // Solo saltos hacia adelante: una definición inválida nunca genera un ciclo
    if (target >= position) position = target;
  }
  return visible;
}

export const currentStep = (definition: InspectionDefinition, answers: Answers) =>
  visibleSteps(definition, answers).find((step) => !answers[step.id]) ?? null;

export const isComplete = (definition: InspectionDefinition, answers: Answers) =>
  currentStep(definition, answers) === null;

function neighbor(
  definition: InspectionDefinition,
  answers: Answers,
  stepId: string,
  offset: number,
) {
  const visible = visibleSteps(definition, answers);
  const position = visible.findIndex((step) => step.id === stepId);
  if (position < 0) return null;
  return visible[position + offset] ?? null;
}

export const nextStep = (definition: InspectionDefinition, answers: Answers, stepId: string) =>
  neighbor(definition, answers, stepId, 1);

export const previousStep = (definition: InspectionDefinition, answers: Answers, stepId: string) =>
  neighbor(definition, answers, stepId, -1);

export function progress(definition: InspectionDefinition, answers: Answers, stepId: string) {
  const visible = visibleSteps(definition, answers);
  const answered = visible.filter((step) => answers[step.id]).length;
  return {
    position: visible.findIndex((step) => step.id === stepId) + 1,
    total: visible.length,
    percent: visible.length === 0 ? 0 : Math.round((answered / visible.length) * 100),
  };
}

// Quita las respuestas de pasos que dejaron de verse (p. ej. la foto tras cambiar Sí por No)
export function pruneAnswers(definition: InspectionDefinition, answers: Answers) {
  const visible = new Set(visibleSteps(definition, answers).map((step) => step.id));
  const kept: Record<string, Answer> = {};
  const removed: { stepId: string; answer: Answer }[] = [];
  for (const [stepId, answer] of Object.entries(answers)) {
    if (visible.has(stepId)) kept[stepId] = answer;
    else removed.push({ stepId, answer });
  }
  return { answers: kept as Answers, removed };
}

// Para pedir confirmación antes de cambiar una respuesta que borra otras (RF-G4)
export const invalidatedBy = (
  definition: InspectionDefinition,
  answers: Answers,
  stepId: string,
  answer: Answer,
) => pruneAnswers(definition, { ...answers, [stepId]: answer }).removed.map((item) => item.stepId);
