import type { InspectionGateway } from '../domain';
import { buildDemoProtocol } from '../infrastructure/demo-protocol';
import { createMockInspectionGateway } from '../infrastructure/mock-inspection-gateway';
import { err, ok } from '@/shared/domain';
import { createFixedClock } from '@/test/fakes/fixed-clock';
import {
  createFakePhotoStore,
  createMemoryInspectionRepository,
  TEST_TARGET,
} from '@/test/fakes/inspections';
import { silentLogger } from '@/test/fakes/test-dependencies';

import {
  answerInspection,
  capturePhoto,
  discardCapture,
  finishInspection,
  openInspection,
  reportMismatch,
  updateObservation,
} from './inspection-use-cases';

const INSPECTOR = { id: 'user-ana', name: 'Ana Morales' };
const CAPTURE = { uri: 'file:///cache/camera.jpg', width: 4000, height: 3000 };

function setup({ online = true, gateway }: { online?: boolean; gateway?: InspectionGateway } = {}) {
  const repo = createMemoryInspectionRepository();
  const photos = createFakePhotoStore();
  const deps = {
    repo,
    photos,
    gateway: gateway ?? createMockInspectionGateway({ isOnline: async () => online, latencyMs: 0 }),
    isOnline: async () => online,
    clock: createFixedClock('2026-10-29T15:00:00.000Z'),
    createId: () => 'insp-1',
    requestSync: jest.fn(async () => undefined),
    logger: silentLogger,
  };
  const open = () => openInspection(deps)({ target: TEST_TARGET, inspector: INSPECTOR });
  return { deps, repo, photos, open };
}

describe('openInspection', () => {
  it('descarga el protocolo y empieza un borrador por voucher + unidad', async () => {
    const { open, repo } = setup();

    const result = await open();

    expect(result).toMatchObject({
      ok: true,
      value: {
        id: 'insp-1',
        voucherId: 'voucher-1',
        unitId: 'vtu-1',
        plate: 'ABC-123',
        inspectorName: 'Ana Morales',
        state: 'draft',
        syncStatus: null,
        verdict: null,
      },
    });
    expect(result.ok && result.value.protocol.questions).toHaveLength(15);
    expect(repo.save).toHaveBeenCalledTimes(1);
  });

  it('retoma el borrador local sin pedir nada al servidor (funciona sin red)', async () => {
    const online = setup();
    await online.open();
    const getProtocol = jest.fn();
    const offline = {
      ...online.deps,
      isOnline: async () => false,
      gateway: { getProtocol, execute: jest.fn() },
    };

    const result = await openInspection(offline)({ target: TEST_TARGET, inspector: INSPECTOR });

    expect(result.ok && result.value.id).toBe('insp-1');
    expect(getProtocol).not.toHaveBeenCalled();
  });

  it('una inspección nueva necesita red para descargar el protocolo', async () => {
    expect(await setup({ online: false }).open()).toEqual(err({ type: 'offline' }));
  });

  it('propaga el error del servidor o un protocolo vacío o inválido', async () => {
    const failing = {
      getProtocol: jest.fn(async () => err({ type: 'server' as const })),
      execute: jest.fn(),
    };
    const empty = {
      getProtocol: jest.fn(async () => ok({ ...buildDemoProtocol(), questions: [] })),
      execute: jest.fn(),
    };
    const invalid = {
      getProtocol: jest.fn(async () =>
        ok({
          ...buildDemoProtocol(),
          questions: [{ ...buildDemoProtocol().questions[0]!, kind: 'SIGNATURE' }],
        }),
      ),
      execute: jest.fn(),
    };

    expect(await setup({ gateway: failing }).open()).toEqual(err({ type: 'server' }));
    expect(await setup({ gateway: empty }).open()).toEqual(err({ type: 'no-protocol' }));
    expect(await setup({ gateway: invalid }).open()).toMatchObject(
      err({ type: 'invalid-protocol' }),
    );
  });

  it('si no puede guardar, informa el problema de almacenamiento', async () => {
    const { open, repo } = setup();
    repo.save.mockRejectedValueOnce(new Error('disco lleno'));

    expect(await open()).toEqual(err({ type: 'storage' }));
  });
});

describe('responder, fotos y cierre', () => {
  it('guarda respuestas y borra la foto que deja de aplicar', async () => {
    const { deps, open, photos } = setup();
    await open();
    await answerInspection(deps)('insp-1', 'has-trailer', { kind: 'yes_no', value: true });
    await capturePhoto(deps)('insp-1', 'trailer-photo', CAPTURE);

    const result = await answerInspection(deps)('insp-1', 'has-trailer', {
      kind: 'yes_no',
      value: false,
    });

    expect(result.ok && result.value.answers['trailer-photo']).toBeUndefined();
    expect(photos.delete).toHaveBeenCalledWith(expect.objectContaining({ id: 'photo-1' }));
  });

  it('una respuesta inválida, una inspección inexistente o un fallo al guardar no rompen', async () => {
    const { deps, open, repo, photos } = setup();
    await open();

    expect(
      await answerInspection(deps)('nope', 'has-trailer', { kind: 'yes_no', value: true }),
    ).toEqual(err({ type: 'not-found' }));
    expect(
      await answerInspection(deps)('insp-1', 'front-photo', { kind: 'yes_no', value: true }),
    ).toEqual(err({ type: 'wrong-answer-kind', stepId: 'front-photo' }));
    repo.save.mockRejectedValueOnce(new Error('disco lleno'));
    expect(
      await answerInspection(deps)('insp-1', 'has-trailer', { kind: 'yes_no', value: true }),
    ).toEqual(err({ type: 'storage' }));
    photos.delete.mockRejectedValueOnce(new Error('no existe'));
    await answerInspection(deps)('insp-1', 'has-trailer', { kind: 'yes_no', value: true });
    await capturePhoto(deps)('insp-1', 'trailer-photo', CAPTURE);
    expect(
      (await answerInspection(deps)('insp-1', 'has-trailer', { kind: 'yes_no', value: false })).ok,
    ).toBe(true);
  });

  it('la foto que no se pudo guardar o asociar no queda en el teléfono', async () => {
    const { deps, open, photos } = setup();
    await open();
    photos.save.mockRejectedValueOnce(new Error('cámara'));
    expect(await capturePhoto(deps)('insp-1', 'front-photo', CAPTURE)).toEqual(
      err({ type: 'photo-failed' }),
    );

    // Paso oculto: se guarda la foto, se rechaza la respuesta y se borra
    await answerInspection(deps)('insp-1', 'has-trailer', { kind: 'yes_no', value: false });
    const hidden = await capturePhoto(deps)('insp-1', 'trailer-photo', CAPTURE);
    expect(hidden).toEqual(err({ type: 'hidden-step', stepId: 'trailer-photo' }));
    expect(photos.delete).toHaveBeenCalled();
    expect(await capturePhoto(deps)('nope', 'front-photo', CAPTURE)).toEqual(
      err({ type: 'not-found' }),
    );
  });

  it('descarta la captura de la vista previa aunque falle el borrado', async () => {
    const { deps, photos } = setup();
    photos.discardCapture.mockRejectedValueOnce(new Error('no existe'));

    await expect(discardCapture(deps)(CAPTURE)).resolves.toBeUndefined();
  });

  it('la observación se guarda y valida su largo', async () => {
    const { deps, open, repo } = setup();
    await open();

    expect((await updateObservation(deps)('insp-1', 'Sin novedad')).ok).toBe(true);
    expect(await updateObservation(deps)('insp-1', 'x'.repeat(501))).toEqual(
      err({ type: 'observation-too-long' }),
    );
    expect(await updateObservation(deps)('nope', 'x')).toEqual(err({ type: 'not-found' }));
    repo.save.mockRejectedValueOnce(new Error('disco lleno'));
    expect(await updateObservation(deps)('insp-1', 'x')).toEqual(err({ type: 'storage' }));
  });

  it('cerrar incompleta falla; la placa que no coincide encola el envío y lo dispara', async () => {
    const { deps, open, repo } = setup();
    await open();

    expect(await finishInspection(deps)('insp-1')).toEqual(
      err({ type: 'incomplete', missingStepId: 'front-plate' }),
    );
    const observed = await reportMismatch(deps)('insp-1');

    expect(observed.ok && observed.value.state).toBe('observed');
    expect(repo.saveFinished).toHaveBeenCalledWith(
      expect.objectContaining({ state: 'observed' }),
      expect.objectContaining({ voucherId: 'voucher-1', unitId: 'vtu-1', plate: 'ABC-123' }),
    );
    expect(deps.requestSync).toHaveBeenCalled();
    expect(await reportMismatch(deps)('nope')).toEqual(err({ type: 'not-found' }));
  });

  it('si no puede guardar el cierre, no lo encola', async () => {
    const { deps, open, repo } = setup();
    await open();
    repo.saveFinished.mockRejectedValueOnce(new Error('disco lleno'));

    expect(await reportMismatch(deps)('insp-1')).toEqual(err({ type: 'storage' }));
    expect(deps.requestSync).not.toHaveBeenCalled();
  });
});
