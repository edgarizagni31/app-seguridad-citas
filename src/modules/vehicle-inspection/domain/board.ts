import type { InspectionDefinition } from './definition';
import { currentStep, progress } from './flow';
import type { StoredInspection } from './ports';
import type { InspectionStatus, RecordSyncStatus, ShiftSnapshot } from '@/shared/domain';

export type BoardVehicle = {
  readonly id: string;
  readonly plate: string;
  readonly enteredAt: string;
  readonly visitorsEntered: number;
  readonly status: InspectionStatus;
  readonly inspectionId: string | null;
  // Solo para inspecciones en curso: "Paso 6 de 13" y su porcentaje
  readonly progress: {
    readonly position: number;
    readonly total: number;
    readonly percent: number;
  } | null;
  readonly syncStatus: RecordSyncStatus | null;
};

export type BoardAppointment = {
  readonly id: string;
  readonly clientName: string;
  readonly voucherCode: string;
  readonly carrierName: string;
  readonly windowStart: string;
  readonly windowEnd: string;
  readonly enteredVisitors: number;
  readonly vehicles: readonly BoardVehicle[];
};

export type InspectionBoard = {
  readonly siteName: string;
  readonly appointments: readonly BoardAppointment[];
};

const localStatus = (inspection: StoredInspection): InspectionStatus =>
  inspection.state === 'draft'
    ? 'in_progress'
    : inspection.state === 'observed'
      ? 'observed'
      : 'inspected';

// RF-F1/F2: citas con vehículos ingresados, con el estado local por encima del paquete
export function buildBoard(
  snapshot: ShiftSnapshot,
  inspections: readonly StoredInspection[],
  definition: InspectionDefinition,
): InspectionBoard {
  const byVehicle = new Map(inspections.map((inspection) => [inspection.vehicleId, inspection]));

  const appointments = snapshot.appointments
    .map((appointment) => {
      const vehicles = appointment.vehicles
        .flatMap((vehicle) =>
          vehicle.enteredAt ? [{ ...vehicle, enteredAt: vehicle.enteredAt }] : [],
        )
        .map((vehicle): BoardVehicle => {
          const inspection = byVehicle.get(vehicle.id);
          const step =
            inspection?.state === 'draft' ? currentStep(definition, inspection.answers) : null;
          return {
            id: vehicle.id,
            plate: vehicle.plate,
            enteredAt: vehicle.enteredAt,
            visitorsEntered: vehicle.enteredVisitorIds.length,
            status: inspection ? localStatus(inspection) : vehicle.inspectionStatus,
            inspectionId: inspection?.id ?? null,
            progress: inspection && step ? progress(definition, inspection.answers, step.id) : null,
            syncStatus: inspection?.syncStatus ?? null,
          };
        })
        .sort((a, b) => a.enteredAt.localeCompare(b.enteredAt));
      return {
        id: appointment.id,
        clientName: appointment.clientName,
        voucherCode: appointment.voucherCode,
        carrierName: appointment.carrierName,
        windowStart: appointment.windowStart,
        windowEnd: appointment.windowEnd,
        enteredVisitors: appointment.vehicles.reduce(
          (total, vehicle) => total + vehicle.enteredVisitorIds.length,
          0,
        ),
        vehicles,
      };
    })
    .filter((appointment) => appointment.vehicles.length > 0)
    .sort((a, b) => a.windowStart.localeCompare(b.windowStart));

  return { siteName: snapshot.siteName, appointments };
}

export function countByStatus(board: InspectionBoard) {
  const vehicles = board.appointments.flatMap((appointment) => appointment.vehicles);
  const count = (statuses: InspectionStatus[]) =>
    vehicles.filter((vehicle) => statuses.includes(vehicle.status)).length;
  return {
    pending: count(['pending']),
    inProgress: count(['in_progress']),
    inspected: count(['inspected', 'observed']),
  };
}
