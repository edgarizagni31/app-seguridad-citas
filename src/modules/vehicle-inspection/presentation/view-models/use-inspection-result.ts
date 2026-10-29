import { useLocalSearchParams, useRouter } from 'expo-router';

import { useDependencies } from '@/core/di';
import { SYNC_TABLES } from '@/shared/domain';
import { useLiveData, useOnlineStatus } from '@/shared/ui';

export type ResultState =
  | { readonly type: 'loading' }
  | { readonly type: 'compliant' }
  | {
      readonly type: 'non-compliant';
      readonly controls: readonly string[];
      readonly observed: boolean;
    }
  | { readonly type: 'observed' }
  | { readonly type: 'rejected'; readonly message: string | null }
  | { readonly type: 'sending' }
  | { readonly type: 'pending' };

export function useInspectionResult() {
  const router = useRouter();
  const { inspectionId } = useLocalSearchParams<{ inspectionId: string }>();
  const { inspections, changes, connectivity } = useDependencies();
  const online = useOnlineStatus(connectivity);
  const { data: inspection } = useLiveData(() => inspections.get(inspectionId), changes, [
    ...inspections.tables,
    ...SYNC_TABLES,
  ]);

  const state = ((): ResultState => {
    if (!inspection) return { type: 'loading' };
    const observed = inspection.state === 'observed';
    if (inspection.syncStatus === 'rejected') {
      return { type: 'rejected', message: inspection.syncMessage };
    }
    // El veredicto lo da el servidor al recibir la inspección
    if (inspection.verdict) {
      return inspection.verdict.compliant
        ? { type: 'compliant' }
        : { type: 'non-compliant', controls: inspection.verdict.nonCompliant, observed };
    }
    if (observed) return { type: 'observed' };
    return online ? { type: 'sending' } : { type: 'pending' };
  })();

  return {
    plate: inspection?.plate ?? '',
    state,
    backToList: () => router.dismissTo('/inspections'),
  };
}
