import { AppState } from 'react-native';

import type { Connectivity } from '@/shared/domain';

type SyncTriggerDeps = {
  readonly connectivity: Connectivity;
  readonly requestSync: () => Promise<void>;
};

// Sincroniza al recuperar la red y al volver la app a primer plano
export function startSyncTriggers({ connectivity, requestSync }: SyncTriggerDeps): () => void {
  let wasOnline = false;
  const stopConnectivity = connectivity.subscribe((online) => {
    if (online && !wasOnline) void requestSync();
    wasOnline = online;
  });
  const appState = AppState.addEventListener('change', (state) => {
    if (state === 'active') void requestSync();
  });
  void requestSync();
  return () => {
    stopConnectivity();
    appState.remove();
  };
}
