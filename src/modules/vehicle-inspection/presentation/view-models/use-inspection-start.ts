import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import { useBoard } from './use-board';
import { useCurrentUser } from '@/modules/auth';
import { useDependencies } from '@/core/di';
import { STRINGS } from '@/shared/lib';

const { start: TEXT } = STRINGS.inspections;

export function useInspectionStart() {
  const router = useRouter();
  const { inspections, logger } = useDependencies();
  const user = useCurrentUser();
  const { vehicleId } = useLocalSearchParams<{ vehicleId: string }>();
  const { board, loading } = useBoard();
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const appointment = board?.appointments.find((item) =>
    item.vehicles.some((vehicle) => vehicle.id === vehicleId),
  );
  const vehicle = appointment?.vehicles.find((item) => item.id === vehicleId) ?? null;
  const inspectorName = user ? `${user.firstName} ${user.lastName}` : '';

  const start = async () => {
    if (!user || !vehicle || opening) return;
    setOpening(true);
    setError(null);
    const result = await inspections.open({
      vehicleId: vehicle.id,
      inspector: { id: user.id, name: inspectorName },
    });
    setOpening(false);
    if (!result.ok) {
      logger.warn('No se pudo abrir la inspección', { error: result.error.type });
      setError(
        result.error.type === 'not-entered' ? TEXT.notEntered : STRINGS.common.unexpectedError,
      );
      return;
    }
    router.replace({
      pathname: '/inspection/wizard/[inspectionId]',
      params: { inspectionId: result.value.id },
    });
  };

  return {
    loading,
    appointment: appointment ?? null,
    vehicle,
    inspectorName,
    opening,
    error,
    start: () => void start(),
    viewResult: () => {
      if (vehicle?.inspectionId) {
        router.replace({
          pathname: '/inspection/result/[inspectionId]',
          params: { inspectionId: vehicle.inspectionId },
        });
      }
    },
    back: () => router.back(),
  };
}
