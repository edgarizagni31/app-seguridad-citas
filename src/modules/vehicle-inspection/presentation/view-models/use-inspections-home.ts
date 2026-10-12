import { useRouter } from 'expo-router';
import { useState } from 'react';

import { countByStatus, type BoardVehicle } from '../../domain';
import { useBoard } from './use-board';
import { useDependencies } from '@/core/di';
import { normalizePlate, type InspectionStatus } from '@/shared/domain';
import { formatLongDate, formatTime } from '@/shared/lib';

export type BoardFilter = 'all' | 'pending' | 'in_progress' | 'inspected';

const MATCHES: Record<BoardFilter, readonly InspectionStatus[]> = {
  all: ['pending', 'in_progress', 'inspected', 'observed'],
  pending: ['pending'],
  in_progress: ['in_progress'],
  inspected: ['inspected', 'observed'],
};

export function useInspectionsHome() {
  const router = useRouter();
  const { clock, config } = useDependencies();
  const { board, loading } = useBoard();
  const [filter, setFilter] = useState<BoardFilter>('all');
  const [query, setQuery] = useState('');

  const term = normalizePlate(query);
  const matches = (vehicle: BoardVehicle, voucherCode: string) =>
    MATCHES[filter].includes(vehicle.status) &&
    (!term || normalizePlate(vehicle.plate).includes(term) || voucherCode.includes(term));

  const appointments = (board?.appointments ?? [])
    .map((appointment) => ({
      appointment,
      vehicles: appointment.vehicles.filter((vehicle) => matches(vehicle, appointment.voucherCode)),
    }))
    .filter((group) => group.vehicles.length > 0);

  return {
    loading,
    hasVehicles: (board?.appointments.length ?? 0) > 0,
    today: formatLongDate(clock.now(), config.timeZone),
    counts: board ? countByStatus(board) : { pending: 0, inProgress: 0, inspected: 0 },
    filter,
    // Tocar el filtro activo vuelve a "Todos"
    setFilter: (next: BoardFilter) => setFilter((current) => (current === next ? 'all' : next)),
    query,
    setQuery,
    appointments,
    time: (iso: string) => formatTime(new Date(iso), config.timeZone),
    scan: () => router.push('/inspections/scan'),
    openAppointment: (id: string) =>
      router.push({
        pathname: '/inspections/appointment/[appointmentId]',
        params: { appointmentId: id },
      }),
    openVehicle: (vehicleId: string) =>
      router.push({ pathname: '/inspection/[vehicleId]', params: { vehicleId } }),
  };
}
