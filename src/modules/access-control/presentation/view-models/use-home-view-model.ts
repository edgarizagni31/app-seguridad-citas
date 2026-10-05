import { useRouter } from 'expo-router';

import { toScanResultView } from '../mappers/scan-result-view';
import { useScanStore } from '../stores/scan-store';
import { useDependencies } from '@/core/di';

export function useHomeViewModel() {
  const router = useRouter();
  const { clock, config } = useDependencies();
  const lastScan = useScanStore((state) => state.lastScan);

  return {
    result: lastScan ? toScanResultView(lastScan, clock.now(), config.timeZone) : null,
    openScanner: () => router.push('/scanner'),
  };
}
