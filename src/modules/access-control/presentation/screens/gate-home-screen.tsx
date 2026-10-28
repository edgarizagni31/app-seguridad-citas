import { useRouter } from 'expo-router';

import type { GateAppointment } from '../../domain';
import { gateErrorMessage } from '../mappers/gate-text';
import { useGateFlowStore } from '../stores/gate-flow-store';
import { useDependencies } from '@/core/di';
import { STRINGS } from '@/shared/lib';

import { QrScanScreen, type QrScanTexts } from './vehicle-scan-screen';

const { gate: TEXT } = STRINGS;

const TEXTS: QrScanTexts = {
  title: TEXT.scanTitle,
  subtitle: TEXT.scanSubtitle,
  hint: TEXT.scanHint,
  validating: TEXT.validating,
};

// Inicio de Garita: escanear el QR de la cita (ValidateGatePresentation)
export function GateHomeScreen() {
  const router = useRouter();
  const { gate } = useDependencies();
  const start = useGateFlowStore((state) => state.start);

  const open = (appointment: GateAppointment) => {
    start(appointment);
    router.push('/gate/mode');
  };

  return (
    <QrScanScreen
      roleLabel={STRINGS.session.securityRole}
      texts={TEXTS}
      target={{
        kind: 'appointmentQr',
        resolve: gate.lookup,
        describe: gateErrorMessage,
        notMatching: TEXT.notAppointmentQr,
      }}
      onResolved={open}
    />
  );
}
