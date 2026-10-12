import { useRouter } from 'expo-router';

import { VehicleLookupScreen } from '@/modules/access-control';

// RF-F5: escanear el QR desde Inspecciones abre directamente su inspección
export function InspectionScanScreen() {
  const router = useRouter();
  return (
    <VehicleLookupScreen
      onFound={(vehicle) =>
        router.replace({
          pathname: '/inspection/[vehicleId]',
          params: { vehicleId: vehicle.vehicleId },
        })
      }
      onCancel={() => router.back()}
    />
  );
}
