import type { InspectionDefinition } from './definition';
import { requireDefinition, type Question } from './questionnaire';
import trama from './questionnaire-v1.json';

// Copia de docs/PREGUNTAS-INSPECCION.json: la trama acordada con backend para la versión 1
export const STANDARD_DEFINITION_V1: InspectionDefinition = requireDefinition(
  'v1',
  trama.questions as unknown as Question[],
);
