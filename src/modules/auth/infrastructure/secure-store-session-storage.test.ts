import * as SecureStore from 'expo-secure-store';

import { buildTokens } from '@/test/factories/auth';

import { secureStoreSessionStorage, STORAGE_KEYS } from './secure-store-session-storage';

jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'when-unlocked-this-device-only',
    getItemAsync: jest.fn(async (key: string) => store.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => void store.set(key, value)),
    deleteItemAsync: jest.fn(async (key: string) => void store.delete(key)),
    __store: store,
  };
});

const store = (SecureStore as unknown as { __store: Map<string, string> }).__store;

describe('secureStoreSessionStorage', () => {
  beforeEach(() => store.clear());

  it('guarda y recupera los tokens en claves separadas', async () => {
    await secureStoreSessionStorage.save(buildTokens());

    expect(store.get(STORAGE_KEYS.idToken)).toBe('id-token-1');
    expect(store.get(STORAGE_KEYS.refreshToken)).toBe('refresh-token-1');
    expect(await secureStoreSessionStorage.load()).toEqual({ ok: true, value: buildTokens() });
  });

  it('usa accesibilidad de llavero solo en este dispositivo', async () => {
    await secureStoreSessionStorage.save(buildTokens());

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(STORAGE_KEYS.idToken, 'id-token-1', {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  });

  it('sin datos devuelve null', async () => {
    expect(await secureStoreSessionStorage.load()).toEqual({ ok: true, value: null });
  });

  it('limpia un par incompleto y devuelve null', async () => {
    store.set(STORAGE_KEYS.idToken, 'huérfano');

    expect(await secureStoreSessionStorage.load()).toEqual({ ok: true, value: null });
    expect(store.size).toBe(0);
  });

  it('clear borra ambos tokens', async () => {
    await secureStoreSessionStorage.save(buildTokens());

    await secureStoreSessionStorage.clear();

    expect(store.size).toBe(0);
  });

  it.each([
    ['load', () => secureStoreSessionStorage.load(), SecureStore.getItemAsync],
    ['save', () => secureStoreSessionStorage.save(buildTokens()), SecureStore.setItemAsync],
    ['clear', () => secureStoreSessionStorage.clear(), SecureStore.deleteItemAsync],
  ])('%s traduce fallos del llavero a error de almacenamiento', async (_name, action, method) => {
    (method as jest.Mock).mockRejectedValueOnce(new Error('keychain'));

    expect(await action()).toMatchObject({ ok: false, error: { type: 'storage' } });
  });
});
