import type { ExecuteInspectionRequest, PhotoRef } from '../domain';
import { createHttpClient } from '@/shared/infrastructure';

import { createCitasInspectionGateway } from './citas-inspection-gateway';

type FakeResponse = { status: number; body?: unknown };

function setup(response: FakeResponse | Error) {
  const fetchFn = jest.fn(async (_url: string, _init?: RequestInit) => {
    if (response instanceof Error) throw response;
    return {
      status: response.status,
      ok: response.status >= 200 && response.status < 300,
      text: async () => (response.body === undefined ? '' : JSON.stringify(response.body)),
    } as Response;
  });
  const http = createHttpClient({
    baseUrl: 'https://citas.test/api/',
    appVersion: '1.0.0',
    platform: 'android',
    createCorrelationId: () => 'corr',
    fetchFn: fetchFn as unknown as typeof fetch,
    getAccessToken: async () => 'id-token',
  });
  const request = () => {
    const [url, init] = fetchFn.mock.calls[0] ?? [];
    return { url, body: JSON.parse(String(init?.body ?? 'null')) as Record<string, unknown> };
  };
  return { gateway: createCitasInspectionGateway(http), request };
}

const data = (value: unknown) => ({ status: 200, body: { data: value } });

const question = (overrides: Record<string, unknown> = {}) => ({
  questionId: 'q-trailer',
  code: 'VID00000003',
  number: 3,
  kind: 'YES_NO',
  title: '¿Cuenta con acoplado?',
  instruction: 'Selecciona una opción.',
  referenceImage: '',
  notice: null,
  badge: null,
  skippedMessage: null,
  isMandatory: true,
  requiresEvidence: false,
  dependsOnDetailId: null,
  dependsOnValue: null,
  options: [
    { optionId: 'o-si', name: 'Sí', isNonCompliant: false, value: 'true' },
    { optionId: 'o-no', name: 'No', isNonCompliant: true, value: 'false' },
  ],
  answerStatus: 'PENDING',
  selectedOptionId: null,
  evidenceUrl: null,
  ...overrides,
});

describe('citasInspectionGateway.getProtocol', () => {
  it('pide el protocolo de la unidad y lo traduce al dominio', async () => {
    const { gateway, request } = setup(
      data({
        protocolId: 'p-1',
        protocolName: 'Inspección física',
        responseId: 'r-1',
        responseStatusId: 's',
        questions: [
          question(),
          question({
            questionId: 'q-photo',
            code: 'VID00000004',
            number: 4,
            kind: 'PHOTO',
            options: null,
            dependsOnDetailId: 'q-trailer',
            dependsOnValue: true,
            answerStatus: 'ANSWERED',
            evidenceUrl: 'https://s3/p.jpg',
            referenceImage: 'https://s3/ref.jpg',
          }),
          question({
            questionId: 'q-raro',
            code: 'X',
            answerStatus: 'OTRO',
            dependsOnDetailId: 'q-trailer',
          }),
        ],
      }),
    );

    const result = await gateway.getProtocol('voucher-1', 'vtu-1');

    expect(request()).toEqual({
      url: 'https://citas.test/api/appointment/VehicleInspection/GetInspectionProtocol',
      body: { voucherId: 'voucher-1', voucherTransportUnitId: 'vtu-1' },
    });
    if (!result.ok) throw new Error('se esperaba el protocolo');
    expect(result.value).toMatchObject({
      protocolId: 'p-1',
      name: 'Inspección física',
      responseId: 'r-1',
    });
    expect(result.value.questions[0]).toEqual({
      id: 'q-trailer',
      code: 'VID00000003',
      number: 3,
      kind: 'YES_NO',
      title: '¿Cuenta con acoplado?',
      instruction: 'Selecciona una opción.',
      referenceImage: null,
      notice: null,
      badge: null,
      skippedMessage: null,
      mandatory: true,
      dependsOn: null,
      options: [
        { id: 'o-si', name: 'Sí', nonCompliant: false, value: 'true' },
        { id: 'o-no', name: 'No', nonCompliant: true, value: 'false' },
      ],
      saved: { status: 'PENDING', optionId: null, evidenceUrl: null },
    });
    expect(result.value.questions[1]).toMatchObject({
      dependsOn: { questionId: 'q-trailer', value: true },
      options: [],
      referenceImage: 'https://s3/ref.jpg',
      saved: { status: 'ANSWERED', evidenceUrl: 'https://s3/p.jpg' },
    });
    // Un estado desconocido o una dependencia sin valor no rompen la lectura
    expect(result.value.questions[2]).toMatchObject({
      dependsOn: null,
      saved: { status: 'PENDING' },
    });
  });

  it('sin protocolo activo devuelve un protocolo vacío', async () => {
    const { gateway } = setup(
      data({ protocolId: null, protocolName: null, responseId: null, questions: [question()] }),
    );

    expect(await gateway.getProtocol('v', 'u')).toEqual({
      ok: true,
      value: { protocolId: '', name: '', responseId: null, questions: [] },
    });
  });
});

describe('citasInspectionGateway.execute', () => {
  const local = {
    id: 'ph-1',
    uri: 'file:///a.jpg',
    hash: 'abc',
    takenAt: '2026-10-29T15:00:00.000Z',
  } as PhotoRef;
  const remote = {
    id: 'ph-2',
    uri: 'https://s3/b.jpg',
    hash: '',
    takenAt: '',
    remoteUrl: 'https://s3/b.jpg',
  } as PhotoRef;
  const REQUEST: ExecuteInspectionRequest = {
    inspectionId: 'insp-1',
    protocolId: 'p-1',
    voucherId: 'voucher-1',
    unitId: 'vtu-1',
    plate: 'ABC-123',
    observation: 'Sin novedad',
    answers: [
      { questionId: 'q-trailer', status: 'ANSWERED', optionId: 'o-si', photo: null },
      { questionId: 'q-photo', status: 'ANSWERED', optionId: null, photo: local },
      { questionId: 'q-cabin', status: 'ANSWERED', optionId: null, photo: remote },
      { questionId: 'q-skip', status: 'SKIPPED', optionId: null, photo: null },
    ],
  };

  it('envía respuestas y fotos (nuevas en base64, ya subidas por URL) y devuelve el veredicto', async () => {
    const { gateway, request } = setup(
      data({
        responseId: 'r-1',
        responseStatusId: 's',
        isCompliant: false,
        authorizesEntry: false,
        requires5Bis: true,
        nonCompliantQuestions: ['¿Cuenta con precinto?: No'],
      }),
    );

    const result = await gateway.execute(REQUEST, { 'ph-1': 'BASE64' });

    expect(request()).toEqual({
      url: 'https://citas.test/api/appointment/VehicleInspection/ExecuteInspectionProtocol',
      body: {
        protocolId: 'p-1',
        voucherId: 'voucher-1',
        voucherTransportUnitId: 'vtu-1',
        visitorId: null,
        observation: 'Sin novedad',
        conclusions: null,
        answers: [
          {
            questionId: 'q-trailer',
            status: 'ANSWERED',
            selectedOptionId: 'o-si',
            photoContentBase64: null,
            photoHash: null,
            photoTakenAtUtc: null,
            evidenceUrl: null,
          },
          {
            questionId: 'q-photo',
            status: 'ANSWERED',
            selectedOptionId: null,
            photoContentBase64: 'BASE64',
            photoHash: 'abc',
            photoTakenAtUtc: '2026-10-29T15:00:00.000Z',
            evidenceUrl: null,
          },
          {
            questionId: 'q-cabin',
            status: 'ANSWERED',
            selectedOptionId: null,
            photoContentBase64: null,
            photoHash: null,
            photoTakenAtUtc: null,
            evidenceUrl: 'https://s3/b.jpg',
          },
          {
            questionId: 'q-skip',
            status: 'SKIPPED',
            selectedOptionId: null,
            photoContentBase64: null,
            photoHash: null,
            photoTakenAtUtc: null,
            evidenceUrl: null,
          },
        ],
      },
    });
    expect(result).toEqual({
      ok: true,
      value: { type: 'accepted', compliant: false, nonCompliant: ['¿Cuenta con precinto?: No'] },
    });
  });

  it('una foto que falta en el lote viaja sin contenido', async () => {
    const { gateway, request } = setup(data({ isCompliant: true, nonCompliantQuestions: null }));

    const result = await gateway.execute(REQUEST, {});

    const answers = request().body.answers as { photoContentBase64: string | null }[];
    expect(answers[1]?.photoContentBase64).toBeNull();
    expect(result).toEqual({
      ok: true,
      value: { type: 'accepted', compliant: true, nonCompliant: [] },
    });
  });

  it('un 400 del negocio es un rechazo definitivo con su mensaje', async () => {
    const { gateway } = setup({
      status: 400,
      body: { statusCode: 400, message: 'La foto supera el tamaño máximo permitido (500 KB).' },
    });

    expect(await gateway.execute(REQUEST, {})).toEqual({
      ok: true,
      value: { type: 'rejected', message: 'La foto supera el tamaño máximo permitido (500 KB).' },
    });
  });

  it('un 400 sin mensaje usa uno genérico', async () => {
    const { gateway } = setup({ status: 400 });

    expect(await gateway.execute(REQUEST, {})).toEqual({
      ok: true,
      value: { type: 'rejected', message: 'Inspección rechazada.' },
    });
  });
});

describe('errores de transporte', () => {
  it.each([
    ['sin red', new TypeError('Network request failed'), 'network'],
    ['token rechazado', { status: 401 }, 'unauthorized'],
    ['error del servidor', { status: 500, body: { message: 'boom' } }, 'server'],
  ] as const)('%s', async (_case, response, type) => {
    const { gateway } = setup(response as FakeResponse | Error);

    const protocol = await gateway.getProtocol('v', 'u');
    const execute = await gateway.execute(
      {
        inspectionId: 'i',
        protocolId: 'p',
        voucherId: 'v',
        unitId: 'u',
        plate: 'P',
        observation: null,
        answers: [],
      },
      {},
    );

    expect(!protocol.ok && protocol.error.type).toBe(type);
    expect(!execute.ok && execute.error.type).toBe(type);
  });
});
