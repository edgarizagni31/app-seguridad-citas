import type { Answer, PhotoRef } from './answers';
import { err } from '@/shared/domain';

import { currentStep } from './flow';
import {
  answerStep,
  photosOf,
  readyToSubmit,
  reportPlateMismatch,
  setObservation,
  startInspection,
  submitInspection,
  type Inspection,
} from './inspection';
import { STANDARD_DEFINITION_V1 as V1 } from './standard-definition';

const NOW = new Date('2026-10-05T17:00:00Z');
const LATER = new Date('2026-10-05T17:05:00Z');
const ref = (id: string) => ({ id, uri: `file:///${id}.jpg` }) as PhotoRef;
const photo = (id: string): Answer => ({ kind: 'photo', photo: ref(id) });
const yes: Answer = { kind: 'yes_no', value: true };
const no: Answer = { kind: 'yes_no', value: false };

const start = () =>
  startInspection(
    {
      id: 'insp-1',
      vehicleId: 'veh-abc-123',
      appointmentId: 'apt-delosi',
      voucherCode: 'APPASP0000000000000093',
      clientName: 'DELOSI',
      plate: 'ABC-123',
      inspectorId: 'user-1',
      inspectorName: 'Ana Morales',
    },
    V1,
    NOW,
  );

function answer(inspection: Inspection, stepId: string, value: Answer, now = LATER) {
  const result = answerStep(inspection, V1, stepId, value, now);
  if (!result.ok) throw new Error(result.error.type);
  return result.value;
}

function completeWith(value: Answer) {
  let inspection = start();
  for (
    let step = currentStep(V1, inspection.answers);
    step;
    step = currentStep(V1, inspection.answers)
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
  it('empieza como borrador con la versión de la definición', () => {
    expect(start()).toMatchObject({
      state: 'draft',
      definitionVersion: 'v1',
      answers: {},
      startedAt: NOW.toISOString(),
      finishedAt: null,
    });
  });

  it('valida el tipo de respuesta y que el paso exista y esté visible', () => {
    const inspection = start();

    expect(answerStep(inspection, V1, 'has-trailer', photo('x'), NOW)).toEqual(
      err({ type: 'wrong-answer-kind', stepId: 'has-trailer' }),
    );
    expect(answerStep(inspection, V1, 'nope', yes, NOW)).toEqual(
      err({ type: 'unknown-step', stepId: 'nope' }),
    );
    const withoutTrailer = answer(inspection, 'has-trailer', no).inspection;
    expect(answerStep(withoutTrailer, V1, 'trailer-photo', photo('t'), NOW)).toEqual(
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

  it('repetir una foto descarta la anterior', () => {
    const first = answer(start(), 'front-photo', photo('a')).inspection;

    const retaken = answer(first, 'front-photo', photo('b'));

    expect(retaken.discardedPhotos).toEqual([ref('a')]);
    expect(photosOf(retaken.inspection)).toEqual([ref('b')]);
  });

  it('solo se envía completa; luego deja de ser editable', () => {
    const incomplete = answer(start(), 'front-plate', {
      kind: 'plate',
      confirmed: true,
    }).inspection;
    expect(submitInspection(incomplete, V1, LATER)).toEqual(
      err({ type: 'incomplete', missingStepId: 'front-photo' }),
    );

    const complete = completeWith(no);
    expect(readyToSubmit(complete, V1)).toBe(true);
    const submitted = submitInspection(complete, V1, LATER);
    expect(submitted).toMatchObject({
      ok: true,
      value: { state: 'submitted', finishedAt: LATER.toISOString() },
    });
    if (!submitted.ok) return;
    expect(answerStep(submitted.value, V1, 'has-waybill', yes, LATER)).toEqual(
      err({ type: 'not-editable' }),
    );
    expect(submitInspection(submitted.value, V1, LATER)).toEqual(err({ type: 'not-editable' }));
    expect(readyToSubmit(submitted.value, V1)).toBe(false);
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
