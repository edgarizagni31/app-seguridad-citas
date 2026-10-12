import type { Connectivity } from '@/shared/domain';

export function createFakeConnectivity(initial = true) {
  let online = initial;
  const listeners = new Set<(online: boolean) => void>();
  return {
    isOnline: async () => online,
    subscribe: (listener: (online: boolean) => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    set(next: boolean) {
      online = next;
      listeners.forEach((listener) => listener(next));
    },
  } satisfies Connectivity & Record<string, unknown>;
}
