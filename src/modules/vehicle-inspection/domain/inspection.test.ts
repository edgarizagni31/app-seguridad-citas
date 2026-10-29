import type { Answer, PhotoRef } from './answers';
import { buildDemoProtocol } from '@/modules/vehicle-inspection/infrastructure/demo-protocol';
import { err } from '@/shared/domain';

import { currentStep } from './flow';
import {
  answerStep,
  definitionOf,
  photosOf,
  readyToSubmit,
  reportPlateMismatch,
  setObservation,
  startInspection,
  submitInspection,
  toExecuteRequest,
  type Inspection,
} from './inspection';
import type { InspectionProtocol } from './protocol';

const NOW = new Date('2026-10-05T17:00:00Z');
const LATER = new Date('2026-10-05T17:05:00Z');
const PROTOCOL = buildDemoProtocol();
const ref = (id: string) => ({ id, uri: `file:///${id}.jpg` }) as PhotoRef;
const photo = (id: string): Answer => ({ kind: 'photo', photo: ref(id) });
const yes: Answer = { kind: 'yes_no', value: true };
const no: Answer = { kind: 'yes_no', value: false };
const idOf = (code: string) => PROTOCOL.questions.find((q) => q.code === code)!.id;

const start = (protocol: InspectionProtocol = PROTOCOL) =>
  startInspection(
    {
      id: 'insp-1',
      voucherId: 'voucher-1',
      unitId: 'vtu-1',
      voucherCode: 'APPASP0000000000000093',
      clientName: 'DELOSI',
      plate: 'ABC-123',
      inspectorId: 'user-1',
      inspectorName: 'Ana Morales',
    },
    protocol,
    NOW,
  );

function answer(inspection: Inspection, stepId: string, value: Answer, now = LATER) {
  const result = answerStep(inspection, stepId, value, now);
  if (!result.ok) throw new Error(result.error.type);
  return result.value;
}

function completeWith(value: Answer) {
  let inspection = start();
  const definition = definitionOf(inspection);
  for (
    let step = currentStep(definition, inspection.answers);
    step;
    step = currentStep(definition, inspection.answers)
  ) {
    const next: Answer =
      step.kind === 'plate'
        ? { kind: 'plate', confirmed: true }
        : step.kind === 'yes_no'
          ? value
          : photo(step.id);
    inspection = answer(inspection, step.id, next).inspection;
  }
  return inspection;
}

describe('Inspection', () => {
  it('empieza como borrador por voucher + unidad, con su protocolo', () => {
    const inspection = start();

    expect(inspection).toMatchObject({
      state: 'draft',
      voucherId: 'voucher-1',
      unitId: 'vtu-1',
      answers: {},
      startedAt: NOW.toISOString(),
      finishedAt: null,
    });
    expect(definitionOf(inspection).steps).toHaveLength(15);
  });

  it('un protocolo inválido deja la inspección sin pasos', () => {
    expect(definitionOf(start({ ...PROTOCOL, questions: [] })).steps).toEqual([]);
  });

  it('valida el tipo de respuesta y que el paso exista y esté visible', () => {
    const inspection = start();

    expect(answerStep(inspection, 'has-trailer', photo('x'), NOW)).toEqual(
      err({ type: 'wrong-answer-kind', stepId: 'has-trailer' }),
    );
    expect(answerStep(inspection, 'nope', yes, NOW)).toEqual(
      err({ type: 'unknown-step', stepId: 'nope' }),
    );
    const withoutTrailer = answer(inspection, 'has-trailer', no).inspection;
    expect(answerStep(withoutTrailer, 'trailer-photo', photo('t'), NOW)).toEqual(
      err({ type: 'hidden-step', stepId: 'trailer-photo' }),
    );
  });

  it('cambiar Sí por No descarta la foto dependiente para borrarla', () => {
    let inspection = answer(start(), 'has-trailer', yes).inspection;
    inspection = answer(inspection, 'trailer-photo', photo('trailer')).inspection;

    const changed = answer(inspection, 'has-trailer', no);

    expect(changed.inspection.answers['trailer-photo']).toBeUndefined();
    expect(changed.discardedPhotos).toEqual([ref('trailer')]);
    expect(changed.inspection.updatedAt).toBe(LATER.toISOString());
  });

  it('repetir una foto descarta la anterior, salvo si ya estaba en el servidor', () => {
    const first = answer(start(), 'front-photo', photo('a')).inspection;
    const retaken = answer(first, 'front-photo', photo('b'));
    expect(retaken.discardedPhotos).toEqual([ref('a')]);
    expect(photosOf(retaken.inspection)).toEqual([ref('b')]);

    const remote = { ...ref('r'), remoteUrl: 'https://s3/r.jpg' };
    const fromServer = answer(start(), 'front-photo', { kind: 'photo', photo: remote }).inspection;
    expect(answer(fromServer, 'front-photo', photo('c')).discardedPhotos).toEqual([]);
  });

  it('solo se envía completa; luego deja de ser editable', () => {
    const incomplete = answer(start(), 'front-plate', {
      kind: 'plate',
      confirmed: true,
    }).inspection;
    expect(submitInspection(incomplete, LATER)).toEqual(
      err({ type: 'incomplete', missingStepId: 'front-photo' }),
    );

    const complete = completeWith(no);
    expect(readyToSubmit(complete)).toBe(true);
    const submitted = submitInspection(complete, LATER);
    expect(submitted).toMatchObject({
      ok: true,
      value: { state: 'submitted', finishedAt: LATER.toISOString() },
    });
    if (!submitted.ok) return;
    expect(answerStep(submitted.value, 'has-waybill', yes, LATER)).toEqual(
      err({ type: 'not-editable' }),
    );
    expect(submitInspection(submitted.value, LATER)).toEqual(err({ type: 'not-editable' }));
    expect(readyToSubmit(submitted.value)).toBe(false);
  });

  it('"todo Sí" acumula las 8 fotos del recorrido completo', () => {
    expect(photosOf(completeWith(yes))).toHaveLength(8);
  });

  it('la placa que no coincide cierra la inspección como observada', () => {
    const observed = reportPlateMismatch(start(), LATER);

    expect(observed).toMatchObject({ ok: true, value: { state: 'observed' } });
    if (observed.ok)
      expect(reportPlateMismatch(observed.value, LATER)).toEqual(err({ type: 'not-editable' }));
  });

  it('la observación es opcional y tiene un largo máximo', () => {
    expect(setObservation(start(), 'Sin novedades')).toMatchObject({
      ok: true,
      value: { observation: 'Sin novedades' },
    });
    expect(setObservation(start(), 'x'.repeat(501))).toEqual(err({ type: 'observation-too-long' }));
    const observed = reportPlateMismatch(start(), LATER);
    if (observed.ok) {
      expect(setObservation(observed.value, 'x')).toEqual(err({ type: 'not-editable' }));
    }
  });
});

describe('toExecuteRequest (ExecuteInspectionProtocol)', () => {
  it('envía las respuestas con su opción y las ocultas como SKIPPED', () => {
    const submitted = submitInspection(completeWith(no), LATER);
    if (!submitted.ok) throw new Error('no se pudo enviar');

    const request = toExecuteRequest({ ...submitted.value, observation: '  Todo ok  ' });

    expect(request).toMatchObject({
      inspectionId: 'insp-1',
      protocolId: PROTOCOL.protocolId,
      voucherId: 'voucher-1',
      unitId: 'vtu-1',
      plate: 'ABC-123',
      observation: 'Todo ok',
    });
    expect(request.answers).toHaveLength(15);
    expect(request.answers[0]).toEqual({
      questionId: idOf('front-plate'),
      status: 'ANSWERED',
      optionId: `${idOf('front-plate')}-ok`,
      photo: null,
    });
    expect(request.answers.find((a) => a.questionId === idOf('has-trailer'))).toMatchObject({
      status: 'ANSWERED',
      optionId: `${idOf('has-trailer')}-no`,
    });
    expect(request.answers.find((a) => a.questionId === idOf('trailer-photo'))).toEqual({
      questionId: idOf('trailer-photo'),
      status: 'SKIPPED',
      optionId: null,
      photo: null,
    });
    expect(request.answers.find((a) => a.questionId === idOf('front-photo'))).toMatchObject({
      status: 'ANSWERED',
      photo: ref('front-photo'),
    });
  });

  it('la placa que no coincide viaja con la opción no conforme y sin observación vacía', () => {
    const observed = reportPlateMismatch(start(), LATER);
    if (!observed.ok) throw new Error('no se pudo observar');

    const request = toExecuteRequest(observed.value);

    expect(request.observation).toBeNull();
    expect(request.answers[0]).toMatchObject({
      status: 'ANSWERED',
      optionId: `${idOf('front-plate')}-ko`,
    });
    expect(request.answers.some((a) => a.questionId === idOf('front-photo'))).toBe(false);
  });

  it('ignora preguntas del protocolo que la definición no reconoce', () => {
    const inspection = start();
    const request = toExecuteRequest({
      ...inspection,
      protocol: {
        ...inspection.protocol,
        questions: inspection.protocol.questions.map((q) =>
          q.code === 'front-plate' ? { ...q, code: 'otro' } : q,
        ),
      },
    });

    expect(request.answers.some((a) => a.questionId === idOf('front-plate'))).toBe(false);
  });
});
