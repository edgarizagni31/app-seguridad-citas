import { useRouter } from 'expo-router';

import { localStatusOf } from '../components/inspection-status-chip';
import { useInspectionScanStore } from '../stores/inspection-scan-store';
import type { InspectionTarget, StoredInspection } from '../../domain';
import { useDependencies } from '@/core/di';
import type { GateAppointment } from '@/modules/access-control';
import { formatLongDate, STRINGS } from '@/shared/lib';
import { useLiveData } from '@/shared/ui';

const { inspections: TEXT } = STRINGS;

const startParams = (target: InspectionTarget) => ({
  unitId: target.unitId,
  voucherId: target.voucherId,
  plate: target.plate,
  clientName: target.clientName,
  voucherCode: target.voucherCode,
});

export function useInspectionsHome() {
  const router = useRouter();
  const { inspections, changes, clock, config } = useDependencies();
  const { data } = useLiveData(() => inspections.list(), changes, inspections.tables);

  const open = (inspection: StoredInspection) => {
    if (inspection.state === 'draft') {
      router.push({ pathname: '/inspection/[unitId]', params: startParams(inspection) });
      return;
    }
    router.push({
      pathname: '/inspection/result/[inspectionId]',
      params: { inspectionId: inspection.id },
    });
  };

  return {
    loading: data === undefined,
    today: TEXT.today(formatLongDate(clock.now(), config.timeZone)),
    items: (data ?? []).map((inspection) => ({
      id: inspection.id,
      plate: inspection.plate,
      clientName: inspection.clientName,
      voucherCode: inspection.voucherCode,
      status: localStatusOf(inspection),
      open: () => open(inspection),
    })),
    scan: () => router.push('/inspections/scan'),
  };
}

export function useInspectionScan() {
  const router = useRouter();
  const { gate } = useDependencies();
  const setAppointment = useInspectionScanStore((state) => state.setAppointment);

  return {
    lookup: gate.lookup,
    open: (appointment: GateAppointment) => {
      setAppointment(appointment);
      router.replace('/inspections/units');
    },
    cancel: () => router.back(),
  };
}

export function useInspectionUnits() {
  const router = useRouter();
  const { inspections, changes } = useDependencies();
  const appointment = useInspectionScanStore((state) => state.appointment);
  const { data } = useLiveData(() => inspections.list(), changes, inspections.tables);

  const targetOf = (unitId: string, plate: string): InspectionTarget => ({
    voucherId: appointment?.voucherId ?? '',
    unitId,
    plate,
    clientName: appointment?.clientName ?? '',
    voucherCode: appointment?.code ?? '',
  });

  return {
    appointment,
    units: (appointment?.units ?? []).map((unit, index) => {
      const local =
        data?.find(
          (inspection) =>
            inspection.voucherId === appointment?.voucherId && inspection.unitId === unit.id,
        ) ?? null;
      return {
        id: unit.id,
        plate: unit.plate,
        number: STRINGS.gate.unitNumber(index + 1),
        status: local ? localStatusOf(local) : null,
        open: () =>
          router.push({
            pathname: '/inspection/[unitId]',
            params: startParams(targetOf(unit.id, unit.plate)),
          }),
      };
    }),
    back: () => router.back(),
  };
}
