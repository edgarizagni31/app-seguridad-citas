import { z } from 'zod';

import type {
  ExecuteAnswer,
  InspectionGateway,
  InspectionGatewayError,
  InspectionProtocol,
  ProtocolQuestion,
} from '../domain';
import { err, ok } from '@/shared/domain';
import type { HttpClient, HttpError } from '@/shared/infrastructure';

// Inspección física SP3-IN-03 (portal-citas-back-v2, rama epic/access-control)
const BASE = 'appointment/VehicleInspection';

const optionDto = z.object({
  optionId: z.string(),
  name: z.string(),
  isNonCompliant: z.boolean(),
  value: z.string().nullish(),
});

const questionDto = z.object({
  questionId: z.string(),
  code: z.string(),
  number: z.number(),
  kind: z.string(),
  title: z.string(),
  instruction: z.string().nullish(),
  referenceImage: z.string().nullish(),
  notice: z.string().nullish(),
  badge: z.string().nullish(),
  skippedMessage: z.string().nullish(),
  isMandatory: z.boolean(),
  dependsOnDetailId: z.string().nullish(),
  dependsOnValue: z.boolean().nullish(),
  options: z.array(optionDto).nullish(),
  answerStatus: z.enum(['PENDING', 'ANSWERED', 'SKIPPED']).catch('PENDING'),
  selectedOptionId: z.string().nullish(),
  evidenceUrl: z.string().nullish(),
});

const protocolDto = z.object({
  protocolId: z.string().nullish(),
  protocolName: z.string().nullish(),
  responseId: z.string().nullish(),
  questions: z.array(questionDto).nullish(),
});

const executeDto = z.object({
  isCompliant: z.boolean(),
  nonCompliantQuestions: z.array(z.string()).nullish(),
});

const toQuestion = (dto: z.infer<typeof questionDto>): ProtocolQuestion => ({
  id: dto.questionId,
  code: dto.code,
  number: dto.number,
  kind: dto.kind,
  title: dto.title,
  instruction: dto.instruction ?? null,
  referenceImage: dto.referenceImage || null,
  notice: dto.notice ?? null,
  badge: dto.badge ?? null,
  skippedMessage: dto.skippedMessage ?? null,
  mandatory: dto.isMandatory,
  dependsOn:
    dto.dependsOnDetailId && dto.dependsOnValue !== null && dto.dependsOnValue !== undefined
      ? { questionId: dto.dependsOnDetailId, value: dto.dependsOnValue }
      : null,
  options: (dto.options ?? []).map((option) => ({
    id: option.optionId,
    name: option.name,
    nonCompliant: option.isNonCompliant,
    value: option.value ?? null,
  })),
  saved: {
    status: dto.answerStatus,
    optionId: dto.selectedOptionId ?? null,
    evidenceUrl: dto.evidenceUrl ?? null,
  },
});

// Sin protocolo activo el backend devuelve protocolId null y ninguna pregunta
const toProtocol = (dto: z.infer<typeof protocolDto>): InspectionProtocol => ({
  protocolId: dto.protocolId ?? '',
  name: dto.protocolName ?? '',
  responseId: dto.responseId ?? null,
  questions: dto.protocolId ? (dto.questions ?? []).map(toQuestion) : [],
});

function toAnswerBody(answer: ExecuteAnswer, photos: Readonly<Record<string, string>>) {
  const { photo } = answer;
  return {
    questionId: answer.questionId,
    status: answer.status,
    selectedOptionId: answer.optionId,
    photoContentBase64: photo && !photo.remoteUrl ? (photos[photo.id] ?? null) : null,
    photoHash: photo?.hash || null,
    photoTakenAtUtc: photo?.takenAt || null,
    // Foto ya subida en otro envío: no se vuelve a mandar
    evidenceUrl: photo?.remoteUrl ?? null,
  };
}

const toGatewayError = (error: HttpError): InspectionGatewayError =>
  error.type === 'network' || error.type === 'timeout'
    ? { type: 'network' }
    : error.type === 'unauthorized'
      ? { type: 'unauthorized' }
      : { type: 'server' };

// Las fotos en base64 hacen pesado el envío: más tiempo que el resto de llamadas
const EXECUTE_TIMEOUT_MS = 90_000;

export function createCitasInspectionGateway(http: HttpClient): InspectionGateway {
  return {
    async getProtocol(voucherId, unitId) {
      const result = await http.request({
        method: 'POST',
        url: `${BASE}/GetInspectionProtocol`,
        body: { voucherId, voucherTransportUnitId: unitId },
        schema: protocolDto,
        unwrapEnvelope: true,
      });
      return result.ok ? ok(toProtocol(result.value)) : err(toGatewayError(result.error));
    },
    async execute(request, photos) {
      const result = await http.request({
        method: 'POST',
        url: `${BASE}/ExecuteInspectionProtocol`,
        body: {
          protocolId: request.protocolId,
          voucherId: request.voucherId,
          voucherTransportUnitId: request.unitId,
          visitorId: null,
          observation: request.observation,
          conclusions: null,
          answers: request.answers.map((answer) => toAnswerBody(answer, photos)),
        },
        schema: executeDto,
        unwrapEnvelope: true,
        timeoutMs: EXECUTE_TIMEOUT_MS,
      });
      if (result.ok) {
        return ok({
          type: 'accepted',
          compliant: result.value.isCompliant,
          nonCompliant: result.value.nonCompliantQuestions ?? [],
        });
      }
      // Rechazo de negocio (foto inválida o muy pesada, protocolo inexistente…): no se reintenta
      if (result.error.type === 'http' && result.error.status === 400) {
        return ok({ type: 'rejected', message: result.error.message ?? 'Inspección rechazada.' });
      }
      return err(toGatewayError(result.error));
    },
  };
}
