import type {
  ConditionOperator,
  InspectionDefinition,
  JumpRule,
  StepCondition,
  StepDefinition,
  StepKind,
} from './definition';
import { err, ok, type Result } from '@/shared/domain';

// Formato de la trama compartida con backend (docs/PREGUNTAS-INSPECCION.md)
export type QuestionKind =
  | 'CONFIRM_PLATE'
  | 'YES_NO'
  | 'PHOTO'
  | 'TEXT'
  | 'NUMBER'
  | 'SINGLE_CHOICE'
  | 'MULTI_CHOICE'
  | 'DATE'
  | 'SIGNATURE';

export type QuestionCondition =
  | { readonly all: readonly QuestionCondition[] }
  | { readonly any: readonly QuestionCondition[] }
  | {
      readonly questionId: string;
      readonly questionCode?: string;
      readonly operator: ConditionOperator;
      readonly value?: unknown;
    };

export type QuestionValidation =
  | { readonly type: 'REQUIRED'; readonly message?: string }
  | { readonly type: 'SHOW_IF'; readonly when: QuestionCondition; readonly message?: string }
  | {
      readonly type: 'JUMP_TO';
      readonly when: QuestionCondition;
      readonly goToQuestionId: string;
    }
  | { readonly type: string; readonly [key: string]: unknown };

export type Question = {
  readonly questionId: string;
  readonly code: string;
  readonly number: number;
  readonly kind: QuestionKind;
  readonly screen: {
    readonly title: string;
    readonly instruction?: string;
    readonly notice?: string;
    readonly badge?: string;
    readonly skippedMessage?: string;
    readonly image?: string;
    readonly referenceImage?: string;
  };
  readonly validations: readonly QuestionValidation[];
  readonly behavior?: { readonly autoAdvanceMs?: number };
};

export type QuestionnaireError =
  | { readonly type: 'unsupported-kind'; readonly code: string; readonly kind: string }
  | { readonly type: 'unknown-question'; readonly code: string; readonly reference: string };

// Tipos que la app sabe dibujar hoy; el resto queda para versiones futuras
const KINDS: Partial<Record<QuestionKind, StepKind>> = {
  CONFIRM_PLATE: 'plate',
  YES_NO: 'yes_no',
  PHOTO: 'photo',
};

const isSimple = (
  condition: QuestionCondition,
): condition is Extract<QuestionCondition, { questionId: string }> => 'questionId' in condition;

// Convierte las preguntas de la trama en la definición que usa el motor de flujo
export function definitionFromQuestions(
  version: string,
  questions: readonly Question[],
): Result<InspectionDefinition, QuestionnaireError[]> {
  const errors: QuestionnaireError[] = [];
  const codeById = new Map(questions.map((question) => [question.questionId, question.code]));

  const toCondition = (question: Question, condition: QuestionCondition): StepCondition => {
    if ('all' in condition)
      return { all: condition.all.map((item) => toCondition(question, item)) };
    if ('any' in condition)
      return { any: condition.any.map((item) => toCondition(question, item)) };
    if (!isSimple(condition)) return { all: [] };
    const stepId = codeById.get(condition.questionId);
    if (!stepId) {
      errors.push({
        type: 'unknown-question',
        code: question.code,
        reference: condition.questionId,
      });
    }
    return {
      stepId: stepId ?? condition.questionId,
      operator: condition.operator,
      value: condition.value,
    };
  };

  const steps = [...questions]
    .sort((a, b) => a.number - b.number)
    .map((question): StepDefinition => {
      const kind = KINDS[question.kind];
      if (!kind)
        errors.push({ type: 'unsupported-kind', code: question.code, kind: question.kind });

      let showIf: StepCondition | undefined;
      const jumps: JumpRule[] = [];
      for (const validation of question.validations) {
        if (validation.type === 'SHOW_IF' && 'when' in validation) {
          showIf = toCondition(question, validation.when as QuestionCondition);
        }
        if (validation.type === 'JUMP_TO' && 'goToQuestionId' in validation) {
          const goTo = codeById.get(validation.goToQuestionId as string);
          if (!goTo) {
            errors.push({
              type: 'unknown-question',
              code: question.code,
              reference: String(validation.goToQuestionId),
            });
          }
          jumps.push({
            when: toCondition(question, validation.when as QuestionCondition),
            goTo: goTo ?? '',
          });
        }
      }

      const { screen } = question;
      return {
        id: question.code,
        questionId: question.questionId,
        kind: kind ?? 'yes_no',
        title: screen.title,
        prompt: screen.instruction ?? '',
        required: question.validations.some((validation) => validation.type === 'REQUIRED'),
        ...(showIf && { showIf }),
        ...(jumps.length > 0 && { jumps }),
        ...(screen.notice && { notice: screen.notice }),
        ...(screen.badge && { badge: screen.badge }),
        ...(screen.skippedMessage && { skippedMessage: screen.skippedMessage }),
        ...(screen.image && { image: screen.image }),
        ...(screen.referenceImage && { referenceImage: screen.referenceImage }),
        ...(question.behavior?.autoAdvanceMs !== undefined && {
          autoAdvanceMs: question.behavior.autoAdvanceMs,
        }),
      };
    });

  return errors.length > 0 ? err(errors) : ok({ version, steps });
}

// Para la trama que viene con la app: si es inválida, es un error de programación
export function requireDefinition(
  version: string,
  questions: readonly Question[],
): InspectionDefinition {
  const result = definitionFromQuestions(version, questions);
  if (!result.ok) throw new Error(`Trama de inspección inválida: ${JSON.stringify(result.error)}`);
  return result.value;
}
