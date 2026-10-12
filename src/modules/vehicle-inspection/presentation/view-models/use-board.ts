import { useDependencies } from '@/core/di';
import { useLiveData } from '@/shared/ui';

// Tablero del turno, recalculado cuando cambian el paquete, los ingresos o las inspecciones
export function useBoard() {
  const { inspections, changes } = useDependencies();
  const { data, error } = useLiveData(() => inspections.board(), changes, inspections.boardTables);
  return {
    loading: data === undefined && !error,
    board: data?.ok ? data.value : null,
  };
}
