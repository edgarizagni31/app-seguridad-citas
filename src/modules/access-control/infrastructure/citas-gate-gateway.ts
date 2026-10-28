import { z } from 'zod';

import type {
  GateDocument,
  GateGatewayError,
  GateLookup,
  GatePerson,
  GatePresentationGateway,
  GateUnit,
  PresentationItem,
  PresentationResult,
} from '../domain';
import { err, normalizePlate, ok } from '@/shared/domain';
import type { HttpClient, HttpError } from '@/shared/infrastructure';

// Contratos de AccessControl (portal-citas-back-v2, rama epic/access-control)
const BASE = 'appointment/AccessControl';

const documentDto = z.object({
  id: z.string(),
  documentName: z.string().nullish(),
  status: z.number().nullish(),
  expiresAt: z.string().nullish(),
  fileUrl: z.string().nullish(),
});

const unitDto = z.object({
  voucherTransportUnitId: z.string(),
  transportUnitId: z.string(),
  plateNumber: z.string().nullish(),
  normalizedPlate: z.string().nullish(),
  driverVoucherVisitorId: z.string().nullish(),
  driverName: z.string().nullish(),
  driverDocumentNumber: z.string().nullish(),
  documents: z.array(documentDto).nullish(),
});

const visitorDto = z.object({
  voucherVisitorId: z.string(),
  name: z.string().nullish(),
  documentNumber: z.string().nullish(),
  visitorStatus: z.string(),
  isEnabled: z.boolean(),
  isConductor: z.boolean(),
  documents: z.array(documentDto).nullish(),
});

const lookupDto = z.object({
  found: z.boolean(),
  reason: z.string().nullish(),
  displayMessage: z.string(),
  voucher: z
    .object({
      id: z.string(),
      code: z.string(),
      isEligible: z.boolean(),
      timeZoneId: z.string().nullish(),
      scheduledStartLocal: z.string().nullish(),
      scheduledEndLocal: z.string().nullish(),
      withinWindow: z.boolean(),
    })
    .nullish(),
  client: z.object({ name: z.string().nullish() }).nullish(),
  supplier: z.object({ name: z.string().nullish() }).nullish(),
  units: z.array(unitDto).nullish(),
  visitors: z.array(visitorDto).nullish(),
});

const registerDto = z.object({
  results: z.array(
    z.object({
      index: z.number(),
      registered: z.boolean(),
      rejectionReason: z.string().nullish(),
      displayMessage: z.string(),
      visitorAccessId: z.string().nullish(),
      transportUnitAccessId: z.string().nullish(),
    }),
  ),
});

const confirmDto = z.object({
  confirmedUnits: z.number(),
  confirmedVisitors: z.number(),
  entryDateTime: z.string().nullish(),
  displayMessage: z.string(),
});

const toDocument = (dto: z.infer<typeof documentDto>): GateDocument => ({
  id: dto.id,
  name: dto.documentName ?? null,
  status: dto.status ?? null,
  expiresAt: dto.expiresAt ?? null,
  fileUrl: dto.fileUrl ?? null,
});

function toUnit(dto: z.infer<typeof unitDto>): GateUnit {
  const plate = dto.plateNumber?.trim() || dto.normalizedPlate || '';
  return {
    id: dto.voucherTransportUnitId,
    transportUnitId: dto.transportUnitId,
    plate,
    normalizedPlate: dto.normalizedPlate || normalizePlate(plate),
    driver: dto.driverVoucherVisitorId
      ? {
          personId: dto.driverVoucherVisitorId,
          name: dto.driverName ?? null,
          documentNumber: dto.driverDocumentNumber ?? null,
        }
      : null,
    documents: (dto.documents ?? []).map(toDocument),
  };
}

const toPerson = (dto: z.infer<typeof visitorDto>): GatePerson => ({
  id: dto.voucherVisitorId,
  name: dto.name?.trim() || '—',
  documentNumber: dto.documentNumber ?? null,
  status: dto.visitorStatus,
  enabled: dto.isEnabled,
  isConductor: dto.isConductor,
  documents: (dto.documents ?? []).map(toDocument),
});

function toLookup(dto: z.infer<typeof lookupDto>): GateLookup {
  const { voucher } = dto;
  if (!dto.found || !voucher) {
    return { found: false, reason: dto.reason ?? null, message: dto.displayMessage };
  }
  return {
    found: true,
    appointment: {
      voucherId: voucher.id,
      code: voucher.code,
      eligible: voucher.isEligible,
      message: dto.displayMessage,
      timeZoneId: voucher.timeZoneId ?? null,
      windowStart: voucher.scheduledStartLocal ?? null,
      windowEnd: voucher.scheduledEndLocal ?? null,
      withinWindow: voucher.withinWindow,
      clientName: dto.client?.name ?? null,
      supplierName: dto.supplier?.name ?? null,
      units: (dto.units ?? []).map(toUnit),
      people: (dto.visitors ?? []).map(toPerson),
    },
  };
}

// mode: 1 = vehicular (unidad + conductor), 2 = peatonal
const toItem = (item: PresentationItem) =>
  item.mode === 'vehicular'
    ? {
        mode: 1,
        voucherTransportUnitId: item.unitId,
        driverDocumentNumber: item.driverDocument,
        voucherVisitorId: null,
        documentNumber: null,
      }
    : {
        mode: 2,
        voucherTransportUnitId: null,
        driverDocumentNumber: null,
        voucherVisitorId: item.personId,
        documentNumber: null,
      };

const toResult = (dto: z.infer<typeof registerDto>['results'][number]): PresentationResult =>
  dto.registered
    ? {
        registered: true,
        unitAccessId: dto.transportUnitAccessId ?? null,
        personAccessId: dto.visitorAccessId ?? null,
        message: dto.displayMessage,
      }
    : {
        registered: false,
        reason: dto.rejectionReason ?? 'UNKNOWN',
        message: dto.displayMessage,
      };

// Los errores de negocio llegan como 400 con el mensaje listo para mostrar
function toGatewayError(error: HttpError): GateGatewayError {
  if (error.type === 'network' || error.type === 'timeout') return { type: 'network' };
  if (error.type === 'unauthorized') return { type: 'unauthorized' };
  if (error.type === 'http' && error.status === 400 && error.message) {
    return { type: 'rejected', message: error.message };
  }
  return { type: 'unknown' };
}

export function createCitasGateGateway(http: HttpClient): GatePresentationGateway {
  return {
    async lookup(qrCode) {
      const result = await http.request({
        method: 'POST',
        url: `${BASE}/ValidateGatePresentation`,
        body: { qrCode },
        schema: lookupDto,
        unwrapEnvelope: true,
      });
      return result.ok ? ok(toLookup(result.value)) : err(toGatewayError(result.error));
    },
    async register(voucherId, items) {
      const result = await http.request({
        method: 'POST',
        url: `${BASE}/RegisterGatePresentation`,
        body: { voucherId, items: items.map(toItem) },
        schema: registerDto,
        unwrapEnvelope: true,
      });
      if (!result.ok) return err(toGatewayError(result.error));
      const ordered = [...result.value.results].sort((a, b) => a.index - b.index);
      return ok(ordered.map(toResult));
    },
    async confirm(request) {
      const result = await http.request({
        method: 'POST',
        url: `${BASE}/ConfirmEntrySession`,
        body: {
          voucherId: request.voucherId,
          transportUnitAccessIds: request.unitAccessIds,
          visitorAccessIds: request.personAccessIds,
        },
        schema: confirmDto,
        unwrapEnvelope: true,
      });
      if (!result.ok) return err(toGatewayError(result.error));
      return ok({
        confirmedUnits: result.value.confirmedUnits,
        confirmedVisitors: result.value.confirmedVisitors,
        enteredAt: result.value.entryDateTime ?? null,
        message: result.value.displayMessage,
      });
    },
  };
}
