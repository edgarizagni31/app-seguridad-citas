import type { Answer, Answers, PhotoRef } from './answers';
import type { InspectionDefinition } from './definition';
import {
  definitionFromQuestions,
  type Question,
  type QuestionKind,
  type QuestionnaireError,
  type QuestionValidation,
} from './questionnaire';
import { err, type Result } from '@/shared/domain';

// Protocolo de inspección física que devuelve VehicleInspection/GetInspectionProtocol
export type ProtocolOption = {
  readonly id: string;
  readonly name: string;
  readonly nonCompliant: boolean;
  // YES_NO: "true" | "false"; el resto: null
  readonly value: string | null;
};

export type SavedAnswer = {
  readonly status: 'PENDING' | 'ANSWERED' | 'SKIPPED';
  readonly optionId: string | null;
  readonly evidenceUrl: string | null;
};

export type ProtocolQuestion = {
  readonly id: string;
  readonly code: string;
  readonly number: number;
  readonly kind: string;
  readonly title: string;
  readonly instruction: string | null;
  readonly referenceImage: string | null;
  readonly notice: string | null;
  readonly badge: string | null;
  readonly skippedMessage: string | null;
  readonly mandatory: boolean;
  readonly dependsOn: { readonly questionId: string; readonly value: boolean } | null;
  readonly options: readonly ProtocolOption[];
  readonly saved: SavedAnswer;
};

export type InspectionProtocol = {
  readonly protocolId: string;
  readonly name: string;
  readonly responseId: string | null;
  readonly questions: readonly ProtocolQuestion[];
};

export type ProtocolError =
  | { readonly type: 'no-protocol' }
  | { readonly type: 'invalid-protocol'; readonly errors: readonly QuestionnaireError[] };

const YES_NO_AUTO_ADVANCE_MS = 400;

const text = (value: string | null) => value ?? undefined;

function toQuestion(question: ProtocolQuestion): Question {
  const validations: QuestionValidation[] = [];
  if (question.mandatory) validations.push({ type: 'REQUIRED' });
  if (question.dependsOn) {
    validations.push({
      type: 'SHOW_IF',
      when: {
        questionId: question.dependsOn.questionId,
        operator: 'EQUALS',
        value: question.dependsOn.value,
      },
    });
  }
  return {
    questionId: question.id,
    code: question.code,
    number: question.number,
    kind: question.kind as QuestionKind,
    screen: {
      title: question.title,
      instruction: text(question.instruction),
      notice: text(question.notice),
      badge: text(question.badge),
      skippedMessage: text(question.skippedMessage),
      referenceImage: text(question.referenceImage),
    },
    validations,
    ...(question.kind === 'YES_NO' && { behavior: { autoAdvanceMs: YES_NO_AUTO_ADVANCE_MS } }),
  };
}

// Reutiliza el motor de la trama: mismas condiciones, mismo flujo
export function definitionFromProtocol(
  protocol: InspectionProtocol,
): Result<InspectionDefinition, ProtocolError> {
  if (protocol.questions.length === 0) return err({ type: 'no-protocol' });
  const result = definitionFromQuestions(protocol.protocolId, protocol.questions.map(toQuestion));
  return result.ok ? result : err({ type: 'invalid-protocol', errors: result.error });
}

// La opción del backend que corresponde a la respuesta (la conformidad la decide el servidor)
export function optionFor(
  question: ProtocolQuestion,
  answer: Answer | 'plate-mismatch',
): string | null {
  if (answer === 'plate-mismatch') {
    return question.options.find((option) => option.nonCompliant)?.id ?? null;
  }
  if (answer.kind === 'yes_no') {
    const value = String(answer.value);
    return question.options.find((option) => option.value?.toLowerCase() === value)?.id ?? null;
  }
  if (answer.kind === 'plate') {
    return question.options.find((option) => !option.nonCompliant)?.id ?? null;
  }
  return null;
}

const remotePhoto = (question: ProtocolQuestion, url: string): PhotoRef => ({
  id: `remote-${question.id}`,
  uri: url,
  takenAt: '',
  width: 0,
  height: 0,
  bytes: 0,
  hash: '',
  remoteUrl: url,
});

function savedAnswer(question: ProtocolQuestion): Answer | null {
  const { saved } = question;
  if (saved.status !== 'ANSWERED') return null;
  const option = question.options.find((candidate) => candidate.id === saved.optionId);
  switch (question.kind) {
    case 'YES_NO':
      return option?.value
        ? { kind: 'yes_no', value: option.value.toLowerCase() === 'true' }
        : null;
    case 'CONFIRM_PLATE':
      return option && !option.nonCompliant ? { kind: 'plate', confirmed: true } : null;
    case 'PHOTO':
      return saved.evidenceUrl
        ? { kind: 'photo', photo: remotePhoto(question, saved.evidenceUrl) }
        : null;
    default:
      return null;
  }
}

// Lo que el servidor ya tiene guardado de una inspección empezada en otro momento
export function savedAnswers(protocol: InspectionProtocol): Answers {
  const answers: Record<string, Answer> = {};
  for (const question of protocol.questions) {
    const answer = savedAnswer(question);
    if (answer) answers[question.code] = answer;
  }
  return answers;
}
