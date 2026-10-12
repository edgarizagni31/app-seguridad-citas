import { useLocalSearchParams, useRouter } from 'expo-router';

import { photosOf } from '../../domain';
import { useDependencies } from '@/core/di';
import { SYNC_TABLES } from '@/shared/domain';
import { useLiveData, useOnlineStatus } from '@/shared/ui';

export type ResultState =
  | { readonly type: 'loading' }
  | { readonly type: 'observed' }
  | { readonly type: 'sent' }
  | { readonly type: 'rejected'; readonly message: string | null }
  | { readonly type: 'uploading'; readonly done: number; readonly total: number }
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
    if (inspection.syncStatus === 'rejected') {
      return { type: 'rejected', message: inspection.syncMessage };
    }
    if (inspection.state === 'observed') return { type: 'observed' };
    if (inspection.syncStatus === 'synced') return { type: 'sent' };
    const total = photosOf(inspection).length;
    // RF-G8: con red se muestra el avance de la subida de fotos
    if (online && total > 0) return { type: 'uploading', done: inspection.uploadedPhotos, total };
    return { type: 'pending' };
  })();

  return {
    plate: inspection?.plate ?? '',
    state,
    backToList: () => router.dismissTo('/inspections'),
  };
}
