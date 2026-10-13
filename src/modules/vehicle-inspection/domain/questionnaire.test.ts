import { err } from '@/shared/domain';

import { validateDefinition } from './flow';
import { definitionFromQuestions, requireDefinition, type Question } from './questionnaire';
import trama from './questionnaire-v1.json';
import { STANDARD_DEFINITION_V1 as V1 } from './standard-definition';

const QUESTIONS = trama.questions as unknown as Question[];

const question = (code: string, number: number, extra: Partial<Question> = {}): Question => ({
  questionId: `guid-${code}`,
  code,
  number,
  kind: 'YES_NO',
  screen: { title: code },
  validations: [],
  ...extra,
});

describe('definitionFromQuestions (trama de preguntas)', () => {
  it('la versión 1 sale de la trama: 15 preguntas válidas, en orden, con sus GUID', () => {
    expect(V1.steps).toHaveLength(15);
    expect(V1.steps.map((step) => step.questionId)).toEqual(QUESTIONS.map((q) => q.questionId));
    expect(V1.steps.map((step) => step.id)).toEqual(QUESTIONS.map((q) => q.code));
    expect(validateDefinition(V1).ok).toBe(true);
  });

  it('respeta los textos, tipos y comportamiento de cada pregunta', () => {
    const [plate, frontPhoto, trailer, trailerPhoto] = V1.steps;

    expect(plate).toMatchObject({
      kind: 'plate',
      title: 'Placa del vehículo - Parte delantera',
      notice: 'Si la placa no coincide, informa al supervisor y no continúes con la inspección.',
      required: true,
    });
    expect(frontPhoto).toMatchObject({ kind: 'photo' });
    expect(frontPhoto?.badge).toBeUndefined();
    expect(trailer).toMatchObject({
      kind: 'yes_no',
      title: '¿Vehículo cuenta con acoplado?',
      prompt: 'Selecciona una opción.',
      autoAdvanceMs: 400,
    });
    expect(trailerPhoto).toMatchObject({
      kind: 'photo',
      title: 'Fotografía de acoplado y placa de identificación',
      badge: 'Porque respondiste Sí',
      skippedMessage: 'Se omitirá la fotografía del acoplado.',
    });
  });

  it('convierte el SHOW_IF por GUID en una condición sobre el paso', () => {
    const trailerPhoto = V1.steps.find((step) => step.id === 'trailer-photo');

    expect(trailerPhoto?.showIf).toEqual({
      stepId: 'has-trailer',
      operator: 'EQUALS',
      value: true,
    });
  });

  it('las 6 fotos condicionadas dependen de la pregunta Sí/No anterior', () => {
    const dependent = V1.steps.filter((step) => step.showIf).map((step) => step.id);

    expect(dependent).toEqual([
      'trailer-photo',
      'rear-left-seal-photo',
      'rear-right-seal-photo',
      'side-door-photo',
      'side-seal-photo',
      'waybill-photo',
    ]);
  });

  it('convierte JUMP_TO y condiciones compuestas', () => {
    const result = definitionFromQuestions('test', [
      question('a', 1, {
        validations: [
          { type: 'REQUIRED' },
          {
            type: 'JUMP_TO',
            when: { questionId: 'guid-a', operator: 'EQUALS', value: false },
            goToQuestionId: 'guid-c',
          },
        ],
      }),
      question('b', 2),
      question('c', 3, {
        validations: [
          {
            type: 'SHOW_IF',
            when: {
              any: [
                { questionId: 'guid-a', operator: 'EQUALS', value: true },
                { questionId: 'guid-b', operator: 'ANSWERED' },
              ],
            },
          },
        ],
      }),
    ]);

    expect(result.ok && result.value.steps[0]).toMatchObject({
      required: true,
      jumps: [{ when: { stepId: 'a', operator: 'EQUALS', value: false }, goTo: 'c' }],
    });
    expect(result.ok && result.value.steps[2]?.showIf).toEqual({
      any: [
        { stepId: 'a', operator: 'EQUALS', value: true },
        { stepId: 'b', operator: 'ANSWERED', value: undefined },
      ],
    });
  });

  it('rechaza tipos que la app todavía no dibuja y referencias a preguntas inexistentes', () => {
    const result = definitionFromQuestions('test', [
      question('a', 1, { kind: 'TEXT' }),
      question('b', 2, {
        validations: [
          { type: 'SHOW_IF', when: { questionId: 'guid-x', operator: 'EQUALS', value: true } },
        ],
      }),
    ]);

    expect(result).toEqual(
      err([
        { type: 'unsupported-kind', code: 'a', kind: 'TEXT' },
        { type: 'unknown-question', code: 'b', reference: 'guid-x' },
      ]),
    );
  });

  it('una trama inválida incluida en la app falla al cargar', () => {
    expect(() => requireDefinition('bad', [question('a', 1, { kind: 'NUMBER' })])).toThrow(
      'Trama de inspección inválida',
    );
    expect(requireDefinition('ok', [question('a', 1)]).steps).toHaveLength(1);
  });
});
