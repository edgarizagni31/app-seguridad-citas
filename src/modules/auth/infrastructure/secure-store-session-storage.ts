import * as SecureStore from 'expo-secure-store';

import type { SessionStorage } from '../domain';
import { err, ok } from '@/shared/domain';

// Claves separadas: algunos Android rechazan valores de más de 2048 bytes
export const STORAGE_KEYS = {
  idToken: 'auth.idToken.v1',
  refreshToken: 'auth.refreshToken.v1',
} as const;

const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

const clearAll = () =>
  Promise.all(Object.values(STORAGE_KEYS).map((key) => SecureStore.deleteItemAsync(key, OPTIONS)));

export const secureStoreSessionStorage: SessionStorage = {
  async load() {
    try {
      const [idToken, refreshToken] = await Promise.all([
        SecureStore.getItemAsync(STORAGE_KEYS.idToken, OPTIONS),
        SecureStore.getItemAsync(STORAGE_KEYS.refreshToken, OPTIONS),
      ]);
      if (idToken && refreshToken) return ok({ idToken, refreshToken });
      if (idToken || refreshToken) await clearAll();
      return ok(null);
    } catch (cause) {
      return err({ type: 'storage', cause });
    }
  },

  async save({ idToken, refreshToken }) {
    try {
      await SecureStore.setItemAsync(STORAGE_KEYS.idToken, idToken, OPTIONS);
      await SecureStore.setItemAsync(STORAGE_KEYS.refreshToken, refreshToken, OPTIONS);
      return ok(undefined);
    } catch (cause) {
      return err({ type: 'storage', cause });
    }
  },

  async clear() {
    try {
      await clearAll();
      return ok(undefined);
    } catch (cause) {
      return err({ type: 'storage', cause });
    }
  },
};
