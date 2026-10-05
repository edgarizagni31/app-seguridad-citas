import { act, renderHook } from '@testing-library/react-native';
import { useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import { Linking } from 'react-native';

import { resetScanStore, useScanStore } from '../stores/scan-store';
import { DependenciesProvider } from '@/core/di';
import { createFixedClock } from '@/test/fakes/fixed-clock';
import { createTestDependencies } from '@/test/fakes/test-dependencies';

import { useScannerViewModel } from './use-scanner-view-model';

jest.mock('expo-camera', () => ({ useCameraPermissions: jest.fn() }));
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(async () => undefined),
  NotificationFeedbackType: { Success: 'success' },
}));

const mockPermissions = jest.mocked(useCameraPermissions);
const requestPermission = jest.fn();

const permission = (granted: boolean, canAskAgain = true) =>
  ({ granted, canAskAgain, status: granted ? 'granted' : 'denied', expires: 'never' }) as never;

const scan = (data: string) => ({ data, type: 'qr' }) as BarcodeScanningResult;

async function setup(state: ReturnType<typeof permission> | null = permission(true)) {
  mockPermissions.mockReturnValue([state, requestPermission, jest.fn()]);
  const onRead = jest.fn();
  const dependencies = createTestDependencies({ clock: createFixedClock('2026-10-05T16:42:00Z') });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <DependenciesProvider value={dependencies}>{children}</DependenciesProvider>
  );
  const { result } = await renderHook(() => useScannerViewModel(onRead), { wrapper });
  return { result, onRead };
}

beforeEach(() => resetScanStore());

describe('useScannerViewModel · permisos', () => {
  it.each([
    ['checking', null],
    ['granted', permission(true)],
    ['requestable', permission(false, true)],
    ['blocked', permission(false, false)],
  ] as const)('estado %s', async (expected, state) => {
    const { result } = await setup(state);

    expect(result.current.permissionState).toBe(expected);
  });

  it('solicita el permiso y abre ajustes', async () => {
    const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
    const { result } = await setup(permission(false));

    result.current.requestPermission();
    result.current.openSettings();

    expect(requestPermission).toHaveBeenCalled();
    expect(openSettings).toHaveBeenCalled();
  });
});

describe('useScannerViewModel · lectura', () => {
  it('guarda la lectura interpretada, vibra y avisa', async () => {
    const { result, onRead } = await setup();

    await act(async () => result.current.handleScanned(scan('APPSCH00000000000123-ABC-123')));

    expect(useScanStore.getState().lastScan).toEqual({
      content: {
        kind: 'codeWithSuffix',
        code: 'APPSCH00000000000123',
        suffix: 'ABC-123',
        raw: 'APPSCH00000000000123-ABC-123',
      },
      scannedAt: new Date('2026-10-05T16:42:00Z'),
    });
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
    expect(onRead).toHaveBeenCalledTimes(1);
  });

  it('ignora las lecturas repetidas del mismo encuadre', async () => {
    const { result, onRead } = await setup();

    await act(async () => {
      result.current.handleScanned(scan('VI000007'));
      result.current.handleScanned(scan('PASS-123'));
    });

    expect(onRead).toHaveBeenCalledTimes(1);
    expect(useScanStore.getState().lastScan?.content.raw).toBe('VI000007');
  });

  it('alterna la linterna', async () => {
    const { result } = await setup();

    await act(async () => result.current.toggleTorch());

    expect(result.current.torchOn).toBe(true);
  });
});
