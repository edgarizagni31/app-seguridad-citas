import { create } from 'zustand';

import type { ScanRecord } from '../../domain';

type ScanState = {
  readonly lastScan: ScanRecord | null;
  setLastScan: (scan: ScanRecord) => void;
  clearLastScan: () => void;
};

export const useScanStore = create<ScanState>()((set) => ({
  lastScan: null,
  setLastScan: (lastScan) => set({ lastScan }),
  clearLastScan: () => set({ lastScan: null }),
}));

export const resetScanStore = () => useScanStore.setState({ lastScan: null });
