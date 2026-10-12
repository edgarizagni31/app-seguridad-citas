import type { Answer, Answers, PhotoRef } from './answers';
import type { InspectionDefinition } from './definition';
import { err } from '@/shared/domain';

import {
  currentStep,
  invalidatedBy,
  isComplete,
  nextStep,
  previousStep,
  progress,
  pruneAnswers,
  validateDefinition,
  visibleSteps,
} from './flow';
import { STANDARD_DEFINITION_V1 as V1 } from './standard-definition';

const photo = (id: string): Answer => ({
  kind: 'photo',
  photo: { id, uri: `file:///${id}.jpg` } as PhotoRef,
});
const yes: Answer = { kind: 'yes_no', value: true };
const no: Answer = { kind: 'yes_no', value: false };
const plate: Answer = { kind: 'plate', confirmed: true };

const QUESTIONS = [
  'has-trailer',
  'has-rear-left-seal',
  'has-rear-right-seal',
  'has-side-door',
  'has-side-seal',
  'has-waybill',
];
const ids = (steps: { id: string }[]) => steps.map((step) => step.id);

function answerAll(value: Answer): Answers {
  const answers: Record<string, Answer> = {};
  for (const step of V1.steps) {
    if (step.kind === 'plate') answers[step.id] = plate;
    if (step.kind === 'yes_no') answers[step.id] = value;
  }
  for (const step of visibleSteps(V1, answers)) {
    if (step.kind === 'photo') answers[step.id] = photo(step.id);
  }
  return answers;
}

describe('STANDARD_DEFINITION_V1', () => {
  it('tiene los 15 pasos en el orden de RF-G1 y es válida', () => {
    expect(V1.steps).toHaveLength(15);
    expect(ids([...V1.steps]).slice(0, 4)).toEqual([
      'front-plate',
      'front-photo',
      'has-trailer',
      'trailer-photo',
    ]);
    expect(validateDefinition(V1).ok).toBe(true);
  });

  it('no tiene saltos activos todavía (RF-G2)', () => {
    expect(V1.steps.some((step) => step.jumps?.length)).toBe(false);
  });
});

describe('visibleSteps', () => {
  it('sin respuestas cuenta todos los pasos como posibles', () => {
    expect(visibleSteps(V1, {})).toHaveLength(15);
  });

  it('recorrido "todo Sí": 15 pasos', () => {
    const answers = answerAll(yes);

    expect(visibleSteps(V1, answers)).toHaveLength(15);
    expect(isComplete(V1, answers)).toBe(true);
  });

  it('recorrido "todo No": se omiten las 6 fotos condicionadas', () => {
    const answers = answerAll(no);

    expect(ids(visibleSteps(V1, answers))).toEqual([
      'front-plate',
      'front-photo',
      ...QUESTIONS.slice(0, 5),
      'cabin-photo',
      'has-waybill',
    ]);
    expect(isComplete(V1, answers)).toBe(true);
  });

  it('el ejemplo del mockup: No en precinto derecho y lateral da 13 pasos', () => {
    const answers = {
      ...answerAll(yes),
      'has-rear-right-seal': no,
      'has-side-seal': no,
    };

    expect(visibleSteps(V1, answers)).toHaveLength(13);
  });
});

describe('navegación y progreso', () => {
  const partial: Answers = { 'front-plate': plate, 'front-photo': photo('f'), 'has-trailer': no };

  it('el paso actual es el primero sin responder', () => {
    expect(currentStep(V1, {})?.id).toBe('front-plate');
    expect(currentStep(V1, partial)?.id).toBe('has-rear-left-seal');
  });

  it('siguiente y anterior saltan los pasos ocultos', () => {
    expect(nextStep(V1, partial, 'has-trailer')?.id).toBe('has-rear-left-seal');
    expect(previousStep(V1, partial, 'has-rear-left-seal')?.id).toBe('has-trailer');
    expect(previousStep(V1, partial, 'front-plate')).toBeNull();
    expect(nextStep(V1, partial, 'trailer-photo')).toBeNull();
  });

  it('el progreso indica "Paso X de N" y el porcentaje respondido', () => {
    expect(progress(V1, partial, 'has-rear-left-seal')).toEqual({
      position: 4,
      total: 14,
      percent: 21,
    });
    expect(progress({ version: 'x', steps: [] }, {}, 'a')).toEqual({
      position: 0,
      total: 0,
      percent: 0,
    });
  });
});

describe('poda de respuestas (RF-G4)', () => {
  it('cambiar Sí por No descarta la foto que dependía de esa respuesta', () => {
    const answers = { ...answerAll(yes), 'has-trailer': no };

    const result = pruneAnswers(V1, answers);

    expect(result.removed).toEqual([{ stepId: 'trailer-photo', answer: photo('trailer-photo') }]);
    expect(result.answers['trailer-photo']).toBeUndefined();
  });

  it('avisa qué respuestas se perderían antes de cambiar', () => {
    const answers = answerAll(yes);

    expect(invalidatedBy(V1, answers, 'has-waybill', no)).toEqual(['waybill-photo']);
    expect(invalidatedBy(V1, answers, 'has-waybill', yes)).toEqual([]);
  });
});

describe('saltos condicionales (goTo)', () => {
  const definition: InspectionDefinition = {
    version: 'test',
    steps: [
      {
        id: 'q1',
        kind: 'yes_no',
        title: '',
        prompt: '',
        jumps: [{ when: { stepId: 'q1', equals: false }, goTo: 'end' }],
      },
      { id: 'p1', kind: 'photo', title: '', prompt: '' },
      { id: 'q2', kind: 'yes_no', title: '', prompt: '' },
      { id: 'end', kind: 'photo', title: '', prompt: '' },
    ],
  };

  it('con la condición cumplida salta a la pregunta indicada', () => {
    expect(ids(visibleSteps(definition, { q1: no }))).toEqual(['q1', 'end']);
    expect(ids(visibleSteps(definition, { q1: yes }))).toEqual(['q1', 'p1', 'q2', 'end']);
  });

  it('las respuestas de los pasos saltados se podan', () => {
    const result = pruneAnswers(definition, { q1: no, p1: photo('p1'), q2: yes });

    expect(result.removed.map((item) => item.stepId)).toEqual(['p1', 'q2']);
  });

  it('un salto hacia atrás en una definición inválida nunca genera un ciclo', () => {
    const looping: InspectionDefinition = {
      version: 'bad',
      steps: [
        { id: 'a', kind: 'yes_no', title: '', prompt: '' },
        {
          id: 'b',
          kind: 'yes_no',
          title: '',
          prompt: '',
          jumps: [{ when: { stepId: 'a', equals: true }, goTo: 'a' }],
        },
      ],
    };

    expect(ids(visibleSteps(looping, { a: yes }))).toEqual(['a', 'b']);
  });
});

describe('validateDefinition', () => {
  it('detecta ids duplicados, referencias rotas, condiciones sobre no-preguntas y ciclos', () => {
    const invalid: InspectionDefinition = {
      version: 'bad',
      steps: [
        { id: 'p', kind: 'photo', title: '', prompt: '' },
        { id: 'p', kind: 'photo', title: '', prompt: '' },
        { id: 'x', kind: 'photo', title: '', prompt: '', showIf: { stepId: 'nope', equals: true } },
        { id: 'y', kind: 'photo', title: '', prompt: '', showIf: { stepId: 'p', equals: true } },
        { id: 'z', kind: 'photo', title: '', prompt: '', showIf: { stepId: 'q', equals: true } },
        {
          id: 'q',
          kind: 'yes_no',
          title: '',
          prompt: '',
          jumps: [
            { when: { stepId: 'q', equals: true }, goTo: 'p' },
            { when: { stepId: 'q', equals: false }, goTo: 'missing' },
          ],
        },
      ],
    };

    expect(validateDefinition(invalid)).toEqual(
      err([
        { type: 'duplicate-step', stepId: 'p' },
        { type: 'unknown-step', stepId: 'x', reference: 'nope' },
        { type: 'not-a-question', stepId: 'y', reference: 'p' },
        { type: 'backward-reference', stepId: 'z', reference: 'q' },
        { type: 'backward-reference', stepId: 'q', reference: 'p' },
        { type: 'unknown-step', stepId: 'q', reference: 'missing' },
      ]),
    );
  });
});
