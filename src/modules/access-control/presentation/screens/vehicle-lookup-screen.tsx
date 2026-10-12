import type { IdentifiedVehicle } from '../../domain';
import { useDependencies } from '@/core/di';
import { STRINGS } from '@/shared/lib';

import { VehicleScanScreen } from './vehicle-scan-screen';

type VehicleLookupScreenProps = {
  onFound: (vehicle: IdentifiedVehicle) => void;
  onCancel: () => void;
};

// RF-F5: el HSE escanea el QR del vehículo para abrir su inspección
export function VehicleLookupScreen({ onFound, onCancel }: VehicleLookupScreenProps) {
  const { accessControl } = useDependencies();
  return (
    <VehicleScanScreen
      roleLabel={STRINGS.session.hseRole}
      resolve={accessControl.identifyVehicle}
      onResolved={onFound}
      onCancel={onCancel}
    />
  );
}
