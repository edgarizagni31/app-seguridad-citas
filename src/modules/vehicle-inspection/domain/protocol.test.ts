import { buildDemoProtocol } from '@/modules/vehicle-inspection/infrastructure/demo-protocol';
import { err } from '@/shared/domain';

import {
  definitionFromProtocol,
  optionFor,
  savedAnswers,
  type InspectionProtocol,
  type ProtocolQuestion,
} from './protocol';

const PROTOCOL = buildDemoProtocol();
const question = (code: string) => PROTOCOL.questions.find((q) => q.code === code)!;

const withSaved = (
  code: string,
  saved: ProtocolQuestion['saved'],
  protocol: InspectionProtocol = PROTOCOL,
): InspectionProtocol => ({
  ...protocol,
  questions: protocol.questions.map((q) => (q.code === code ? { ...q, saved } : q)),
});

describe('definitionFromProtocol', () => {
  it('convierte el protocolo del backend en la definición del motor', () => {
    const result = definitionFromProtocol(PROTOCOL);
    if (!result.ok) throw new Error('se esperaba una definición');
    const steps = result.value.steps;

    expect(result.value.version).toBe(PROTOCOL.protocolId);
    expect(steps).toHaveLength(15);
    expect(steps[0]).toMatchObject({ id: 'front-plate', kind: 'plate', required: true });
    expect(steps.find((step) => step.id === 'has-trailer')).toMatchObject({
      kind: 'yes_no',
      autoAdvanceMs: 400,
    });
    expect(steps.find((step) => step.id === 'trailer-photo')?.showIf).toEqual({
      stepId: 'has-trailer',
      operator: 'EQUALS',
      value: true,
    });
  });

  it('sin preguntas no hay protocolo, y un tipo desconocido lo invalida', () => {
    expect(definitionFromProtocol({ ...PROTOCOL, questions: [] })).toEqual(
      err({ type: 'no-protocol' }),
    );
    const result = definitionFromProtocol({
      ...PROTOCOL,
      questions: [{ ...question('front-photo'), kind: 'SIGNATURE' }],
    });
    expect(result).toEqual(
      err({
        type: 'invalid-protocol',
        errors: [{ type: 'unsupported-kind', code: 'front-photo', kind: 'SIGNATURE' }],
      }),
    );
  });

  it('los textos nulos del backend no llegan a la pantalla', () => {
    const bare = { ...question('front-photo'), instruction: null, notice: null, badge: null };
    const result = definitionFromProtocol({ ...PROTOCOL, questions: [bare] });

    expect(result.ok && result.value.steps[0]).toMatchObject({ prompt: '' });
    expect(result.ok && result.value.steps[0]?.notice).toBeUndefined();
  });
});

describe('optionFor', () => {
  it('Sí/No por su valor; placa por su conformidad; foto sin opción', () => {
    const trailer = question('has-trailer');
    const plate = question('front-plate');

    expect(optionFor(trailer, { kind: 'yes_no', value: true })).toBe(`${trailer.id}-si`);
    expect(optionFor(trailer, { kind: 'yes_no', value: false })).toBe(`${trailer.id}-no`);
    expect(optionFor(plate, { kind: 'plate', confirmed: true })).toBe(`${plate.id}-ok`);
    expect(optionFor(plate, 'plate-mismatch')).toBe(`${plate.id}-ko`);
    expect(optionFor(question('front-photo'), { kind: 'photo', photo: {} as never })).toBeNull();
    expect(optionFor({ ...trailer, options: [] }, { kind: 'yes_no', value: true })).toBeNull();
    expect(optionFor({ ...plate, options: [] }, 'plate-mismatch')).toBeNull();
    expect(optionFor({ ...plate, options: [] }, { kind: 'plate', confirmed: true })).toBeNull();
  });
});

describe('savedAnswers', () => {
  it('precarga lo que el servidor ya tiene guardado', () => {
    const trailer = question('has-trailer');
    const plate = question('front-plate');
    let protocol = withSaved('has-trailer', {
      status: 'ANSWERED',
      optionId: `${trailer.id}-no`,
      evidenceUrl: null,
    });
    protocol = withSaved(
      'front-plate',
      { status: 'ANSWERED', optionId: `${plate.id}-ok`, evidenceUrl: null },
      protocol,
    );
    protocol = withSaved(
      'front-photo',
      { status: 'ANSWERED', optionId: null, evidenceUrl: 'https://s3/front.jpg' },
      protocol,
    );

    const answers = savedAnswers(protocol);

    expect(answers['has-trailer']).toEqual({ kind: 'yes_no', value: false });
    expect(answers['front-plate']).toEqual({ kind: 'plate', confirmed: true });
    expect(answers['front-photo']).toMatchObject({
      kind: 'photo',
      photo: { uri: 'https://s3/front.jpg', remoteUrl: 'https://s3/front.jpg' },
    });
  });

  it('no precarga pendientes, omitidas, placa no conforme ni respuestas incompletas', () => {
    const plate = question('front-plate');
    let protocol = withSaved('front-plate', {
      status: 'ANSWERED',
      optionId: `${plate.id}-ko`,
      evidenceUrl: null,
    });
    protocol = withSaved(
      'has-trailer',
      { status: 'ANSWERED', optionId: 'desconocida', evidenceUrl: null },
      protocol,
    );
    protocol = withSaved(
      'front-photo',
      { status: 'ANSWERED', optionId: null, evidenceUrl: null },
      protocol,
    );
    protocol = withSaved(
      'cabin-photo',
      { status: 'SKIPPED', optionId: null, evidenceUrl: null },
      protocol,
    );
    protocol = {
      ...protocol,
      questions: [
        ...protocol.questions,
        {
          ...question('has-trailer'),
          code: 'firma',
          kind: 'SIGNATURE',
          saved: { status: 'ANSWERED', optionId: null, evidenceUrl: null },
        },
      ],
    };

    expect(savedAnswers(protocol)).toEqual({});
  });
});
