import type { InspectionDefinition, StepDefinition } from './definition';

const SELECT_ONE = 'Selecciona una opción.';

const question = (id: string, title: string): StepDefinition => ({
  id,
  kind: 'yes_no',
  title,
  prompt: SELECT_ONE,
});

const photo = (
  id: string,
  title: string,
  prompt: string,
  condition?: { stepId: string; omittedLabel: string },
): StepDefinition => ({
  id,
  kind: 'photo',
  title,
  prompt,
  ...(condition && {
    showIf: { stepId: condition.stepId, equals: true },
    omittedLabel: condition.omittedLabel,
  }),
});

// RF-G1: 15 pasos en orden fijo; los textos siguen el mockup del cuestionario
export const STANDARD_DEFINITION_V1: InspectionDefinition = {
  version: 'v1',
  steps: [
    {
      id: 'front-plate',
      kind: 'plate',
      title: 'Placa del vehículo · parte delantera',
      prompt: 'Verifica que la placa coincida con el vehículo que se encuentra en la garita.',
    },
    photo(
      'front-photo',
      'Fotografía del vehículo y placa de identificación (delantera)',
      'Toma una fotografía del vehículo y su placa de identificación (delantera).',
    ),
    question('has-trailer', '¿El vehículo cuenta con acoplado?'),
    photo(
      'trailer-photo',
      'Fotografía del acoplado y placa de identificación',
      'Toma una fotografía del acoplado y su placa de identificación.',
      { stepId: 'has-trailer', omittedLabel: 'del acoplado' },
    ),
    question('has-rear-left-seal', '¿El vehículo cuenta con precinto trasero izquierdo?'),
    photo(
      'rear-left-seal-photo',
      'Fotografía del precinto trasero izquierdo',
      'Toma una fotografía del precinto trasero izquierdo.',
      { stepId: 'has-rear-left-seal', omittedLabel: 'del precinto trasero izquierdo' },
    ),
    question('has-rear-right-seal', '¿El vehículo cuenta con precinto trasero derecho?'),
    photo(
      'rear-right-seal-photo',
      'Fotografía del precinto trasero derecho',
      'Toma una fotografía del precinto trasero derecho.',
      { stepId: 'has-rear-right-seal', omittedLabel: 'del precinto trasero derecho' },
    ),
    question('has-side-door', '¿El vehículo cuenta con puerta lateral?'),
    photo(
      'side-door-photo',
      'Fotografía lateral del vehículo y del mecanismo de cierre',
      'Toma una fotografía lateral del vehículo y del mecanismo de cierre.',
      { stepId: 'has-side-door', omittedLabel: 'lateral y del mecanismo de cierre' },
    ),
    question('has-side-seal', '¿El vehículo cuenta con precinto lateral?'),
    photo(
      'side-seal-photo',
      'Fotografía del precinto lateral',
      'Toma una fotografía del precinto lateral.',
      { stepId: 'has-side-seal', omittedLabel: 'del precinto lateral' },
    ),
    photo(
      'cabin-photo',
      'Fotografía de la inspección interna de la cabina del vehículo',
      'Toma una fotografía de la inspección interna de la cabina del vehículo.',
    ),
    question('has-waybill', '¿El transportista cuenta con guía?'),
    photo('waybill-photo', 'Fotografía de la guía', 'Toma una fotografía de la guía.', {
      stepId: 'has-waybill',
      omittedLabel: 'de la guía',
    }),
  ],
};
