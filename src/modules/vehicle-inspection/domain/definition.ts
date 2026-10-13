// El cuestionario es datos versionados, no lógica en las pantallas (ADR 0007)
export type StepKind = 'plate' | 'yes_no' | 'photo';

export type ConditionOperator =
  'EQUALS' | 'NOT_EQUALS' | 'IN' | 'NOT_IN' | 'ANSWERED' | 'NOT_ANSWERED';

// Compara la respuesta de otro paso; all = todas (Y), any = alguna (O)
export type StepCondition =
  | { readonly all: readonly StepCondition[] }
  | { readonly any: readonly StepCondition[] }
  | { readonly stepId: string; readonly operator: ConditionOperator; readonly value?: unknown };

// Salto declarativo hacia adelante; v1 no tiene ninguno activo (RF-G2)
export type JumpRule = { readonly when: StepCondition; readonly goTo: string };

export type StepDefinition = {
  // code de la trama: legible y único dentro de la versión
  readonly id: string;
  // GUID fijo de la pregunta en todas las versiones
  readonly questionId: string;
  readonly kind: StepKind;
  readonly title: string;
  readonly prompt: string;
  readonly required: boolean;
  readonly showIf?: StepCondition;
  readonly jumps?: readonly JumpRule[];
  readonly notice?: string;
  readonly badge?: string;
  // Aviso "Se omitirá la fotografía de…" cuando el paso deja de aplicar
  readonly skippedMessage?: string;
  readonly image?: string;
  readonly referenceImage?: string;
  readonly autoAdvanceMs?: number;
};

export type InspectionDefinition = {
  readonly version: string;
  readonly steps: readonly StepDefinition[];
};
