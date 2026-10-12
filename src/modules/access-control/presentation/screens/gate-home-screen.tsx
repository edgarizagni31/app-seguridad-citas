import { useRouter } from 'expo-router';

import type { UnitValidation } from '../../domain';
import { useEntryFlowStore } from '../stores/entry-flow-store';
import { STRINGS } from '@/shared/lib';

import { VehicleScanScreen } from './vehicle-scan-screen';

// Inicio de Garita (RF-A3): escanear el QR del vehículo
export function GateHomeScreen() {
  const router = useRouter();
  const start = useEntryFlowStore((state) => state.start);

  const admit = (validation: UnitValidation) => {
    start(validation);
    router.push('/entry/visitors');
  };

  return <VehicleScanScreen roleLabel={STRINGS.session.securityRole} onAdmitted={admit} />;
}
