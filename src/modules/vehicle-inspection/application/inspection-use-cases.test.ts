import { STANDARD_DEFINITION_V1, type StoredInspection } from '../domain';
import { err, type LocalEntry, type ShiftSnapshot } from '@/shared/domain';
import { buildDemoSnapshot } from '@/shared/infrastructure/demo';
import { createFixedClock } from '@/test/fakes/fixed-clock';
import { createFakePhotoStore, createMemoryInspectionRepository } from '@/test/fakes/inspections';
import { silentLogger } from '@/test/fakes/test-dependencies';

import {
  answerInspection,
  capturePhoto,
  cleanupStaleDrafts,
  finishInspection,
  openInspection,
  reportMismatch,
  updateObservation,
} from './inspection-use-cases';

const NOW = new Date('2026-10-05T17:00:00Z');
const SNAPSHOT = buildDemoSnapshot('site-central', 'Almacén Central', '2026-10-05', NOW);
const INSPECTOR = { id: 'user-ana', name: 'Ana Morales' };
const CAPTURE = { uri: 'file:///cache/camera.jpg', width: 4000, height: 3000 };

function setup({
  snapshot = SNAPSHOT as ShiftSnapshot | null,
  entries = [] as LocalEntry[],
  repo = createMemoryInspectionRepository(),
} = {}) {
  let ids = 0;
  const deps = {
    repo,
    photos: createFakePhotoStore(),
    shift: { current: async () => snapshot },
    entries: { tables: [], list: async () => entries },
    definition: STANDARD_DEFINITION_V1,
    clock: createFixedClock(NOW.toISOString()),
    createId: () => `insp-${(ids += 1)}`,
    requestSync: jest.fn(async () => undefined),
    logger: silentLogger,
  };
  return {
    deps,
    open: openInspection(deps),
    answer: answerInspection(deps),
    capture: capturePhoto(deps),
    observe: updateObservation(deps),
    finish: finishInspection(deps),
    mismatch: reportMismatch(deps),
  };
}

async function opened(context: ReturnType<typeof setup>) {
  const result = await context.open({ vehicleId: 'veh-mnp-456', inspector: INSPECTOR });
  if (!result.ok) throw new Error(result.error.type);
  return result.value;
}

describe('openInspection', () => {
  it('crea el borrador de un vehículo con ingreso confirmado', async () => {
    const context = setup();

    const inspection = await opened(context);

    expect(inspection).toMatchObject({
      id: 'insp-1',
      plate: 'MNP-456',
      clientName: 'DOLLAR CITY',
      inspectorName: 'Ana Morales',
      state: 'draft',
    });
    expect(context.deps.repo.save).toHaveBeenCalled();
  });

  it('retoma el borrador existente en vez de crear otro (RF-G9)', async () => {
    const context = setup();
    const first = await opened(context);

    expect((await opened(context)).id).toBe(first.id);
    expect(context.deps.repo.save).toHaveBeenCalledTimes(1);
  });

  it('un vehículo sin ingreso no se puede inspeccionar (RF-F2)', async () => {
    const { open } = setup();

    expect(await open({ vehicleId: 'veh-abc-123', inspector: INSPECTOR })).toEqual(
      err({ type: 'not-entered' }),
    );
  });

  it('un ingreso confirmado en este dispositivo habilita la inspección', async () => {
    const { open } = setup({
      entries: [{ vehicleId: 'veh-abc-123', enteredAt: NOW.toISOString(), visitorIds: [] }],
    });

    expect(await open({ vehicleId: 'veh-abc-123', inspector: INSPECTOR })).toMatchObject({
      ok: true,
    });
  });

  it('sin paquete del día o con un vehículo desconocido', async () => {
    expect(await setup({ snapshot: null }).open({ vehicleId: 'x', inspector: INSPECTOR })).toEqual(
      err({ type: 'no-shift' }),
    );
    expect(await setup().open({ vehicleId: 'nope', inspector: INSPECTOR })).toEqual(
      err({ type: 'vehicle-not-found' }),
    );
  });
});

describe('respuestas y fotos', () => {
  it('cambiar Sí por No borra del dispositivo la foto que dejó de aplicar', async () => {
    const context = setup();
    const { id } = await opened(context);
    await context.answer(id, 'has-trailer', { kind: 'yes_no', value: true });
    const withPhoto = await context.capture(id, 'trailer-photo', CAPTURE);
    expect(withPhoto.ok && withPhoto.value.answers['trailer-photo']).toMatchObject({
      kind: 'photo',
    });

    const changed = await context.answer(id, 'has-trailer', { kind: 'yes_no', value: false });

    expect(changed.ok && changed.value.answers['trailer-photo']).toBeUndefined();
    expect(context.deps.photos.delete).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'photo-1' }),
    );
  });

  it('la foto se guarda con el paso y la hora de captura', async () => {
    const context = setup();
    const { id } = await opened(context);

    await context.capture(id, 'front-photo', CAPTURE);

    expect(context.deps.photos.save).toHaveBeenCalledWith({
      inspectionId: id,
      stepId: 'front-photo',
      capture: CAPTURE,
      takenAt: NOW,
    });
  });

  it('si la foto no se puede guardar, la respuesta no cambia', async () => {
    const context = setup();
    const { id } = await opened(context);
    context.deps.photos.save.mockRejectedValueOnce(new Error('sin espacio'));

    expect(await context.capture(id, 'front-photo', CAPTURE)).toEqual(
      err({ type: 'photo-failed' }),
    );
  });

  it('una foto para un paso oculto se descarta del dispositivo', async () => {
    const context = setup();
    const { id } = await opened(context);
    await context.answer(id, 'has-trailer', { kind: 'yes_no', value: false });

    const result = await context.capture(id, 'trailer-photo', CAPTURE);

    expect(result).toEqual(err({ type: 'hidden-step', stepId: 'trailer-photo' }));
    expect(context.deps.photos.delete).toHaveBeenCalled();
  });

  it('una inspección inexistente', async () => {
    const context = setup();

    expect(await context.answer('nope', 'has-trailer', { kind: 'yes_no', value: true })).toEqual(
      err({ type: 'not-found' }),
    );
    expect(await context.capture('nope', 'front-photo', CAPTURE)).toEqual(
      err({ type: 'not-found' }),
    );
  });

  it('guarda la observación opcional', async () => {
    const context = setup();
    const { id } = await opened(context);

    expect(await context.observe(id, 'Sin novedades')).toMatchObject({
      ok: true,
      value: { observation: 'Sin novedades' },
    });
  });
});

describe('cierre', () => {
  async function answerAllNo(context: ReturnType<typeof setup>, id: string) {
    await context.answer(id, 'front-plate', { kind: 'plate', confirmed: true });
    await context.capture(id, 'front-photo', CAPTURE);
    for (const stepId of [
      'has-trailer',
      'has-rear-left-seal',
      'has-rear-right-seal',
      'has-side-door',
      'has-side-seal',
    ]) {
      await context.answer(id, stepId, { kind: 'yes_no', value: false });
    }
    await context.capture(id, 'cabin-photo', CAPTURE);
    await context.answer(id, 'has-waybill', { kind: 'yes_no', value: false });
  }

  it('enviar encola la inspección completa y pide sincronizar', async () => {
    const context = setup();
    const { id } = await opened(context);
    await answerAllNo(context, id);

    const result = await context.finish(id);

    expect(result).toMatchObject({ ok: true, value: { state: 'submitted' } });
    const [, request] = context.deps.repo.saveFinished.mock.calls[0] ?? [];
    expect(request).toMatchObject({ result: 'COMPLETED', inspectionId: id });
    expect(request?.photos).toHaveLength(2);
    expect(context.deps.requestSync).toHaveBeenCalled();
  });

  it('no se envía incompleta', async () => {
    const context = setup();
    const { id } = await opened(context);

    expect(await context.finish(id)).toEqual(
      err({ type: 'incomplete', missingStepId: 'front-plate' }),
    );
    expect(context.deps.repo.saveFinished).not.toHaveBeenCalled();
  });

  it('la placa que no coincide se registra como observada', async () => {
    const context = setup();
    const { id } = await opened(context);

    expect(await context.mismatch(id)).toMatchObject({ ok: true, value: { state: 'observed' } });
    const [, request] = context.deps.repo.saveFinished.mock.calls[0] ?? [];
    expect(request).toMatchObject({ result: 'OBSERVED' });
  });

  it('si no se puede guardar el cierre, informa error de almacenamiento', async () => {
    const repo = createMemoryInspectionRepository();
    const context = setup({ repo });
    const { id } = await opened(context);
    repo.saveFinished.mockRejectedValueOnce(new Error('db'));

    expect(await context.mismatch(id)).toEqual(err({ type: 'storage' }));
    expect(context.deps.requestSync).not.toHaveBeenCalled();
  });

  it('una inspección ya cerrada no se vuelve a abrir como borrador', async () => {
    const closed = {
      id: 'insp-9',
      vehicleId: 'veh-mnp-456',
      state: 'submitted',
    } as StoredInspection;
    const context = setup({ repo: createMemoryInspectionRepository([closed]) });

    expect(await context.open({ vehicleId: 'veh-mnp-456', inspector: INSPECTOR })).toMatchObject({
      ok: true,
      value: { id: 'insp-9', state: 'submitted' },
    });
  });
});

describe('cleanupStaleDrafts', () => {
  it('borra los borradores y sus fotos de vehículos que ya no están en el paquete', async () => {
    const context = setup();
    const { id } = await opened(context);
    const cleanup = cleanupStaleDrafts(context.deps);

    await cleanup(SNAPSHOT);
    expect(context.deps.repo.delete).not.toHaveBeenCalled();

    await cleanup({ appointments: [] });
    expect(context.deps.photos.deleteAll).toHaveBeenCalledWith(id);
    expect(context.deps.repo.delete).toHaveBeenCalledWith(id);
  });
});
