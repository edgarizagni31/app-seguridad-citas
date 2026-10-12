import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';

import type { Connectivity } from '@/shared/domain';

// isInternetReachable puede ser null mientras se verifica: solo false cuenta como sin internet
export const isStateOnline = (state: Pick<NetInfoState, 'isConnected' | 'isInternetReachable'>) =>
  state.isConnected === true && state.isInternetReachable !== false;

export const netInfoConnectivity: Connectivity = {
  isOnline: async () => isStateOnline(await NetInfo.fetch()),
  subscribe: (listener) => NetInfo.addEventListener((state) => listener(isStateOnline(state))),
};
