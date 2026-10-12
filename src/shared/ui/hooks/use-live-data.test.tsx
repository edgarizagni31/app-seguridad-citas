import { act, renderHook } from '@testing-library/react-native';

import { createChangeBus } from '@/shared/infrastructure/db';

import { useLiveData } from './use-live-data';

describe('useLiveData', () => {
  it('carga al montar y recarga cuando cambian sus tablas', async () => {
    const bus = createChangeBus();
    let value = 1;
    const load = jest.fn(async () => value);
    const { result } = await renderHook(() => useLiveData(load, bus, ['entries']));
    await act(async () => undefined);
    expect(result.current.data).toBe(1);

    value = 2;
    await act(async () => bus.emit(['entries']));
    expect(result.current.data).toBe(2);

    await act(async () => bus.emit(['otra']));
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('expone el error de carga', async () => {
    const bus = createChangeBus();
    const failure = new Error('db');
    const { result } = await renderHook(() =>
      useLiveData(async () => Promise.reject(failure), bus, ['entries']),
    );
    await act(async () => undefined);

    expect(result.current.error).toBe(failure);
  });
});
