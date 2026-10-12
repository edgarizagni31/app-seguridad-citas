// El cuestionario es datos versionados, no lógica en las pantallas (ADR 0007)
export type StepKind = 'plate' | 'yes_no' | 'photo';

// Se cumple si la pregunta Sí/No indicada tiene esa respuesta
export type StepCondition = { readonly stepId: string; readonly equals: boolean };

// Salto declarativo hacia adelante; v1 no tiene ninguno activo (RF-G2)
export type JumpRule = { readonly when: StepCondition; readonly goTo: string };

export type StepDefinition = {
  readonly id: string;
  readonly kind: StepKind;
  readonly title: string;
  readonly prompt: string;
  readonly showIf?: StepCondition;
  readonly jumps?: readonly JumpRule[];
  // Pasos de foto condicionados: texto del aviso "Se omitirá la fotografía de…"
  readonly omittedLabel?: string;
};

export type InspectionDefinition = {
  readonly version: string;
  readonly steps: readonly StepDefinition[];
};
