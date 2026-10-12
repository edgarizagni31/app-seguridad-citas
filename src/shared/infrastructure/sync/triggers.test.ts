import { AppState, type AppStateStatus } from 'react-native';

import type { Connectivity } from '@/shared/domain';

import { startSyncTriggers } from './triggers';

function setup() {
  let emitOnline: (online: boolean) => void = () => undefined;
  let emitAppState: (state: AppStateStatus) => void = () => undefined;
  const remove = jest.fn();
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
    emitAppState = listener as (state: AppStateStatus) => void;
    return { remove };
  });
  const unsubscribe = jest.fn();
  const connectivity: Connectivity = {
    isOnline: async () => true,
    subscribe: (listener) => {
      emitOnline = listener;
      return unsubscribe;
    },
  };
  const requestSync = jest.fn(async () => undefined);
  const stop = startSyncTriggers({ connectivity, requestSync });
  return {
    requestSync,
    stop,
    remove,
    unsubscribe,
    online: (v: boolean) => emitOnline(v),
    appState: (s: AppStateStatus) => emitAppState(s),
  };
}

afterEach(() => jest.restoreAllMocks());

describe('startSyncTriggers', () => {
  it('sincroniza al arrancar', () => {
    expect(setup().requestSync).toHaveBeenCalledTimes(1);
  });

  it('sincroniza solo al pasar de sin red a con red', () => {
    const { requestSync, online } = setup();

    online(false);
    online(true);
    online(true);

    expect(requestSync).toHaveBeenCalledTimes(2);
  });

  it('sincroniza al volver a primer plano', () => {
    const { requestSync, appState } = setup();

    appState('background');
    appState('active');

    expect(requestSync).toHaveBeenCalledTimes(2);
  });

  it('se detiene limpiando las suscripciones', () => {
    const { stop, remove, unsubscribe } = setup();

    stop();

    expect(remove).toHaveBeenCalled();
    expect(unsubscribe).toHaveBeenCalled();
  });
});
