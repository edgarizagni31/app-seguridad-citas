import { useInspectionScan } from '../view-models/use-inspections-flow';
import { gateErrorMessage, QrScanScreen, type QrScanTexts } from '@/modules/access-control';
import { STRINGS } from '@/shared/lib';

const { gate: GATE } = STRINGS;

const TEXTS: QrScanTexts = {
  title: GATE.scanTitle,
  subtitle: STRINGS.inspections.scanHint,
  hint: GATE.scanHint,
  validating: GATE.validating,
};

// HSE escanea (o sube la foto de) el QR de la cita y luego elige la placa
export function InspectionScanScreen() {
  const vm = useInspectionScan();
  return (
    <QrScanScreen
      roleLabel={STRINGS.session.hseRole}
      texts={TEXTS}
      target={{
        kind: 'appointmentQr',
        resolve: vm.lookup,
        describe: gateErrorMessage,
        notMatching: GATE.notAppointmentQr,
      }}
      onResolved={vm.open}
      onCancel={vm.cancel}
    />
  );
}
