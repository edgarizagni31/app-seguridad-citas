import trama from '../domain/questionnaire-v1.json';
import type { InspectionProtocol, ProtocolOption, ProtocolQuestion } from '../domain';

export const DEMO_PROTOCOL_ID = 'demo-protocol-v1';

type TramaQuestion = {
  readonly questionId: string;
  readonly code: string;
  readonly number: number;
  readonly kind: string;
  readonly screen: Readonly<Record<string, string | undefined>>;
  readonly validations: readonly {
    readonly type: string;
    readonly when?: { readonly questionId?: string; readonly value?: unknown };
  }[];
};

// En la demo, no tener un precinto es un control no conforme
const NON_COMPLIANT_WHEN_NO = new Set([
  'has-rear-left-seal',
  'has-rear-right-seal',
  'has-side-seal',
]);

function optionsOf(question: TramaQuestion): ProtocolOption[] {
  if (question.kind === 'CONFIRM_PLATE') {
    return [
      { id: `${question.questionId}-ok`, name: 'Coincide', nonCompliant: false, value: null },
      { id: `${question.questionId}-ko`, name: 'No coincide', nonCompliant: true, value: null },
    ];
  }
  if (question.kind === 'YES_NO') {
    return [
      { id: `${question.questionId}-si`, name: 'Sí', nonCompliant: false, value: 'true' },
      {
        id: `${question.questionId}-no`,
        name: 'No',
        nonCompliant: NON_COMPLIANT_WHEN_NO.has(question.code),
        value: 'false',
      },
    ];
  }
  return [];
}

function toProtocolQuestion(question: TramaQuestion): ProtocolQuestion {
  const showIf = question.validations.find((validation) => validation.type === 'SHOW_IF');
  const { screen } = question;
  return {
    id: question.questionId,
    code: question.code,
    number: question.number,
    kind: question.kind,
    title: screen.title ?? question.code,
    instruction: screen.instruction ?? null,
    // Las imágenes de referencia de la demo están en la app (REFERENCE_IMAGES)
    referenceImage: null,
    notice: screen.notice ?? null,
    badge: screen.badge ?? null,
    skippedMessage: screen.skippedMessage ?? null,
    mandatory: question.validations.some((validation) => validation.type === 'REQUIRED'),
    dependsOn:
      showIf?.when?.questionId !== undefined
        ? { questionId: showIf.when.questionId, value: showIf.when.value === true }
        : null,
    options: optionsOf(question),
    saved: { status: 'PENDING', optionId: null, evidenceUrl: null },
  };
}

// El cuestionario v1 servido con la forma de GetInspectionProtocol
export const buildDemoProtocol = (): InspectionProtocol => ({
  protocolId: DEMO_PROTOCOL_ID,
  name: 'Inspección vehicular estándar',
  responseId: null,
  questions: (trama.questions as unknown as TramaQuestion[]).map(toProtocolQuestion),
});
