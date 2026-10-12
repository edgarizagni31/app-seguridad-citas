import type { ShiftSnapshot } from '@/shared/domain';

// El paquete vence al cambiar de día en la zona horaria de la sede
export const isSnapshotForDate = (snapshot: Pick<ShiftSnapshot, 'date'>, today: string) =>
  snapshot.date === today;
