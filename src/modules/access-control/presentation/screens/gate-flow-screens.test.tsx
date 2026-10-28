import { act, screen, userEvent } from '@testing-library/react-native';
import { scanFromURLAsync, useCameraPermissions } from 'expo-camera';
import { launchImageLibraryAsync } from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { recordPerson, recordUnit, type GateSession } from '../../domain';
import { useGateFlowStore } from '../stores/gate-flow-store';
import type { GateUseCases } from '@/core/di';
import { useSessionStore } from '@/modules/auth';
import { err, ok } from '@/shared/domain';
import { buildSession } from '@/test/factories/auth';
import { buildAppointment } from '@/test/factories/gate';
import { renderWithDeps } from '@/test/render-with-deps';

import { GateConfirmedScreen } from './gate-confirmed-screen';
import { GateHomeScreen } from './gate-home-screen';
import { GateModeScreen } from './gate-mode-screen';
import { GatePeopleScreen } from './gate-people-screen';
import { GatePersonScreen } from './gate-person-screen';
import { GateUnitScreen } from './gate-unit-screen';
import { GateUnitsScreen } from './gate-units-screen';
import { GateVisitorsScreen } from './gate-visitors-screen';

const mockCamera: { onScan?: (result: { data: string }) => void } = {};

jest.mock('expo-camera', () => ({
  CameraView: (props: { onBarcodeScanned: (result: { data: string }) => void }) => {
    mockCamera.onScan = props.onBarcodeScanned;
    return null;
  },
  useCameraPermissions: jest.fn(),
  scanFromURLAsync: jest.fn(),
}));
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));
jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
  useLocalSearchParams: jest.fn(),
  useIsFocused: () => true,
  Redirect: () => null,
}));

const router = { push: jest.fn(), back: jest.fn(), replace: jest.fn(), dismissAll: jest.fn() };
const APPOINTMENT = buildAppointment();
const QR = '442c766389044391b4f59d2d5518c4a0';

const fakeGate = (overrides: Partial<GateUseCases> = {}): GateUseCases => ({
  lookup: jest.fn(async () => ok(APPOINTMENT)),
  presentUnit: jest.fn(async (session: GateSession, unitId: string) =>
    ok(recordUnit(session, unitId, { unitAccessId: `tua-${unitId}`, driverAccessId: 'va-luis' })),
  ),
  presentPerson: jest.fn(async (session: GateSession, personId: string) =>
    ok(recordPerson(session, personId, `va-${personId}`)),
  ),
  confirmVehicle: jest.fn(async () =>
    ok({
      confirmation: {
        confirmedUnits: 1,
        confirmedVisitors: 2,
        enteredAt: '2026-10-28T15:40:00Z',
        message: 'ok',
      },
      rejectedCompanions: [],
    }),
  ),
  confirmPedestrian: jest.fn(async () =>
    ok({
      confirmation: {
        confirmedUnits: 0,
        confirmedVisitors: 1,
        enteredAt: '2026-10-28T15:40:00Z',
        message: 'ok',
      },
      rejectedCompanions: [],
    }),
  ),
  ...overrides,
});

const store = () => useGateFlowStore.getState();

function prepare(params: Record<string, string> = {}) {
  jest.mocked(useRouter).mockReturnValue(router as never);
  jest.mocked(useLocalSearchParams).mockReturnValue(params);
  useSessionStore.getState().setSession(buildSession());
  store().start(APPOINTMENT);
  return userEvent.setup();
}

afterEach(() => store().reset());

describe('GateHomeScreen: QR de la cita', () => {
  async function setup(gate: GateUseCases) {
    jest
      .mocked(useCameraPermissions)
      .mockReturnValue([
        { granted: true, canAskAgain: true, status: 'granted', expires: 'never' },
        jest.fn(),
        jest.fn(),
      ] as never);
    prepare();
    store().reset();
    await renderWithDeps(<GateHomeScreen />, { gate });
    return (data: string) => act(async () => mockCamera.onScan?.({ data }));
  }

  it('busca la cita y abre la selección del tipo de ingreso', async () => {
    const gate = fakeGate();
    const scan = await setup(gate);

    expect(screen.getByRole('heading', { name: 'Escanear QR de la cita' })).toBeOnTheScreen();
    await scan(QR);

    expect(gate.lookup).toHaveBeenCalledWith(QR);
    expect(store().session?.appointment).toEqual(APPOINTMENT);
    expect(router.push).toHaveBeenCalledWith('/gate/mode');
  });

  it('una cita inexistente muestra el mensaje del servidor y no avanza', async () => {
    const scan = await setup(
      fakeGate({
        lookup: jest.fn(async () =>
          err({ type: 'not-found' as const, message: 'No existe la cita.' }),
        ),
      }),
    );

    await scan(QR);

    expect(await screen.findByText('No existe la cita.')).toBeOnTheScreen();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('otro tipo de QR no se consulta', async () => {
    const gate = fakeGate();
    const scan = await setup(gate);

    await scan('APPSCH00000000000123-ABC-123');

    expect(
      await screen.findByText('Este QR no es el de una cita. Escanea el QR de la cita.'),
    ).toBeOnTheScreen();
    expect(gate.lookup).not.toHaveBeenCalled();
  });
});

describe('GateHomeScreen: foto del QR', () => {
  async function setup(gate: GateUseCases) {
    jest
      .mocked(useCameraPermissions)
      .mockReturnValue([
        { granted: true, canAskAgain: true, status: 'granted', expires: 'never' },
        jest.fn(),
        jest.fn(),
      ] as never);
    const user = prepare();
    store().reset();
    await renderWithDeps(<GateHomeScreen />, { gate });
    return user;
  }
  const picked = (uri: string | null) =>
    jest
      .mocked(launchImageLibraryAsync)
      .mockResolvedValue(
        (uri ? { canceled: false, assets: [{ uri }] } : { canceled: true, assets: null }) as never,
      );

  it('lee el QR de la foto elegida y busca la cita', async () => {
    const gate = fakeGate();
    const user = await setup(gate);
    picked('file:///qr.png');
    jest.mocked(scanFromURLAsync).mockResolvedValue([{ type: 'qr', data: QR }] as never);

    await user.press(screen.getByRole('button', { name: 'Subir foto del QR' }));

    expect(scanFromURLAsync).toHaveBeenCalledWith('file:///qr.png', ['qr']);
    expect(gate.lookup).toHaveBeenCalledWith(QR);
    expect(router.push).toHaveBeenCalledWith('/gate/mode');
  });

  it('una foto sin QR lo explica y permite reintentar', async () => {
    const gate = fakeGate();
    const user = await setup(gate);
    picked('file:///gato.png');
    jest.mocked(scanFromURLAsync).mockResolvedValue([]);

    await user.press(screen.getByRole('button', { name: 'Subir foto del QR' }));

    expect(
      await screen.findByText(
        'No se encontró un código QR en la foto. Prueba con una imagen más nítida y centrada.',
      ),
    ).toBeOnTheScreen();
    expect(gate.lookup).not.toHaveBeenCalled();
  });

  it('si se cancela la galería no pasa nada y se puede volver a intentar', async () => {
    const gate = fakeGate();
    const user = await setup(gate);
    picked(null);

    await user.press(screen.getByRole('button', { name: 'Subir foto del QR' }));
    await user.press(screen.getByRole('button', { name: 'Subir foto del QR' }));

    expect(launchImageLibraryAsync).toHaveBeenCalledTimes(2);
    expect(gate.lookup).not.toHaveBeenCalled();
  });

  it('una foto con otro tipo de QR se rechaza igual que con la cámara', async () => {
    const gate = fakeGate();
    const user = await setup(gate);
    picked('file:///unidad.png');
    jest
      .mocked(scanFromURLAsync)
      .mockResolvedValue([{ type: 'qr', data: 'APPSCH00000000000123-ABC-123' }] as never);

    await user.press(screen.getByRole('button', { name: 'Subir foto del QR' }));

    expect(
      await screen.findByText('Este QR no es el de una cita. Escanea el QR de la cita.'),
    ).toBeOnTheScreen();
    expect(gate.lookup).not.toHaveBeenCalled();
  });

  it('si no se puede leer la foto lo informa', async () => {
    const user = await setup(fakeGate());
    jest.mocked(launchImageLibraryAsync).mockRejectedValue(new Error('sin memoria'));

    await user.press(screen.getByRole('button', { name: 'Subir foto del QR' }));

    expect(
      await screen.findByText('No se pudo leer la foto. Inténtalo de nuevo.'),
    ).toBeOnTheScreen();
  });
});

describe('GateModeScreen', () => {
  it('ofrece ambos tipos y navega al elegido', async () => {
    const user = prepare();
    await renderWithDeps(<GateModeScreen />);

    expect(
      screen.getByRole('heading', { name: '¿Qué tipo de ingreso vas a registrar?' }),
    ).toBeOnTheScreen();
    expect(screen.getByText('DELOSI')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Ingreso peatonal' }));

    expect(store().session?.mode).toBe('pedestrian');
    expect(router.push).toHaveBeenCalledWith('/gate/people');
  });

  it('sin unidades deshabilita el ingreso vehicular', async () => {
    prepare();
    store().start(buildAppointment({ units: [] }));
    await renderWithDeps(<GateModeScreen />);

    expect(screen.getByRole('button', { name: 'Ingreso vehicular' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Ingreso peatonal' })).toBeEnabled();
  });

  it('una cita no elegible lo avisa', async () => {
    prepare();
    store().start(buildAppointment({ eligible: false }));
    await renderWithDeps(<GateModeScreen />);

    expect(
      screen.getByText(
        'La cita no está habilitada para ingresar. No se puede registrar la llegada.',
      ),
    ).toBeOnTheScreen();
  });
});

describe('GateUnitsScreen', () => {
  it('lista las placas con su número, marca las presentadas y permite confirmar', async () => {
    const user = prepare();
    store().update(
      recordUnit(store().session!, 'vtu-1', { unitAccessId: 'tua-1', driverAccessId: null }),
    );
    await renderWithDeps(<GateUnitsScreen />);

    expect(screen.getByRole('button', { name: 'ABC-123, Unidad 01, Llegó' })).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'XYZ-789, Unidad 02' }));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/gate/unit/[unitId]',
      params: { unitId: 'vtu-2' },
    });

    await user.press(screen.getByRole('button', { name: 'Confirmar ingreso (1)' }));
    expect(router.push).toHaveBeenCalledWith('/gate/visitors');
  });

  it('busca por placa normalizada', async () => {
    const user = prepare();
    await renderWithDeps(<GateUnitsScreen />);

    await user.type(screen.getByLabelText('Buscar placa, unidad…'), 'xyz 7');

    expect(screen.queryByText('ABC-123')).not.toBeOnTheScreen();
    expect(screen.getByText('XYZ-789')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /Confirmar ingreso/ })).not.toBeOnTheScreen();
  });
});

describe('GateUnitScreen', () => {
  it('muestra los documentos por pestaña y registra la llegada de la unidad', async () => {
    const user = prepare({ unitId: 'vtu-1' });
    const gate = fakeGate();
    await renderWithDeps(<GateUnitScreen />, { gate });

    expect(screen.getByText('Tarjeta de circulación')).toBeOnTheScreen();
    await user.press(screen.getByRole('radio', { name: 'Conductor' }));
    expect(screen.getByText('Luis Hernández')).toBeOnTheScreen();
    expect(screen.getByText('Documentos del conductor')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Continuar' }));

    expect(gate.presentUnit).toHaveBeenCalledWith(expect.anything(), 'vtu-1', null);
    expect(store().session?.presentedUnits['vtu-1']).toBeDefined();
    expect(router.back).toHaveBeenCalled();
  });

  it('sin conductor pide su documento antes de registrar', async () => {
    const user = prepare({ unitId: 'vtu-2' });
    const gate = fakeGate();
    await renderWithDeps(<GateUnitScreen />, { gate });

    await user.press(screen.getByRole('button', { name: 'Continuar' }));
    expect(await screen.findByText('Ingresa el documento del conductor')).toBeOnTheScreen();
    expect(gate.presentUnit).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText('Documento del conductor *'), '04512378');
    await user.press(screen.getByRole('button', { name: 'Continuar' }));

    expect(gate.presentUnit).toHaveBeenCalledWith(expect.anything(), 'vtu-2', '04512378');
  });

  it('si el servidor pide el documento del conductor, lo solicita y no avanza', async () => {
    const user = prepare({ unitId: 'vtu-1' });
    const gate = fakeGate({
      presentUnit: jest.fn(async () =>
        err({
          type: 'not-presented' as const,
          reason: 'DRIVER_DOCUMENT_REQUIRED',
          message: 'Falta el documento del conductor.',
        }),
      ),
    });
    await renderWithDeps(<GateUnitScreen />, { gate });

    await user.press(screen.getByRole('button', { name: 'Continuar' }));

    expect(await screen.findByText('Falta el documento del conductor.')).toBeOnTheScreen();
    expect(screen.getByLabelText('Documento del conductor *')).toBeOnTheScreen();
    expect(router.back).not.toHaveBeenCalled();
  });
});

describe('GateVisitorsScreen', () => {
  it('conductores fijos en Llegó; marca acompañantes y confirma el ingreso', async () => {
    const user = prepare();
    store().update(
      recordUnit(store().session!, 'vtu-1', { unitAccessId: 'tua-1', driverAccessId: 'va-luis' }),
    );
    const gate = fakeGate();
    await renderWithDeps(<GateVisitorsScreen />, { gate });

    expect(screen.getByText('Conductor · ABC-123')).toBeOnTheScreen();
    expect(screen.getByText('Acompañantes (3)')).toBeOnTheScreen();
    // Ana y Pedro se marcan; Raúl no está habilitado y no tiene selector
    const arrivedButtons = screen.getAllByRole('radio', { name: 'Llegó' });
    expect(arrivedButtons).toHaveLength(2);
    await user.press(arrivedButtons[0]!);
    expect(store().session?.arrivedCompanions).toEqual(['vv-ana']);

    await user.press(screen.getByRole('button', { name: 'Confirmar ingreso' }));

    expect(gate.confirmVehicle).toHaveBeenCalled();
    expect(store().outcome).not.toBeNull();
    expect(router.replace).toHaveBeenCalledWith('/gate/confirmed');
  });

  it('un rechazo al confirmar (fuera de ventana) se muestra y no avanza', async () => {
    const user = prepare();
    store().update(
      recordUnit(store().session!, 'vtu-1', { unitAccessId: 'tua-1', driverAccessId: 'va-luis' }),
    );
    await renderWithDeps(<GateVisitorsScreen />, {
      gate: fakeGate({
        confirmVehicle: jest.fn(async () =>
          err({ type: 'rejected' as const, message: 'Fuera de la ventana de ingreso.' }),
        ),
      }),
    });

    await user.press(screen.getByRole('button', { name: 'Confirmar ingreso' }));

    expect(await screen.findByText('Fuera de la ventana de ingreso.')).toBeOnTheScreen();
    expect(router.replace).not.toHaveBeenCalled();
  });
});

describe('Ingreso peatonal', () => {
  it('lista a las personas sin conductores, con su estado, y confirma las presentadas', async () => {
    const user = prepare();
    store().update(recordPerson(store().session!, 'vv-ana', 'va-ana'));
    const gate = fakeGate();
    await renderWithDeps(<GatePeopleScreen />, { gate });

    expect(screen.getByText('Personas esperadas (3)')).toBeOnTheScreen();
    expect(screen.queryByText('Luis Hernández')).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Ana Torres, Llegó' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Raúl Pineda, Inhabilitado' })).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Pedro Rojas, Pendiente' }));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/gate/person/[personId]',
      params: { personId: 'vv-pedro' },
    });

    await user.press(screen.getByRole('button', { name: 'Confirmar ingreso (1)' }));
    expect(gate.confirmPedestrian).toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith('/gate/confirmed');
  });

  it('la persona muestra sus documentos y registra su llegada', async () => {
    const user = prepare({ personId: 'vv-ana' });
    const gate = fakeGate();
    await renderWithDeps(<GatePersonScreen />, { gate });

    expect(screen.getByText('DNI')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Continuar' }));

    expect(gate.presentPerson).toHaveBeenCalledWith(expect.anything(), 'vv-ana');
    expect(store().session?.presentedPeople).toEqual({ 'vv-ana': 'va-vv-ana' });
    expect(router.back).toHaveBeenCalled();
  });

  it('una persona no habilitada no se puede presentar', async () => {
    prepare({ personId: 'vv-raul' });
    await renderWithDeps(<GatePersonScreen />);

    expect(screen.getByText('No habilitado')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled();
  });
});

describe('GateConfirmedScreen', () => {
  it('resume el ingreso vehicular y ofrece la inspección opcional', async () => {
    const user = prepare();
    let session = recordUnit(store().session!, 'vtu-1', {
      unitAccessId: 'tua-1',
      driverAccessId: 'va-luis',
    });
    session = { ...session, mode: 'vehicular', arrivedCompanions: ['vv-ana'] };
    store().update(session);
    store().finish({
      confirmation: {
        confirmedUnits: 1,
        confirmedVisitors: 2,
        enteredAt: '2026-10-28T15:40:00Z',
        message: 'ok',
      },
      rejectedCompanions: [],
    });
    await renderWithDeps(<GateConfirmedScreen />);

    expect(screen.getByRole('heading', { name: 'Ingreso confirmado' })).toBeOnTheScreen();
    expect(screen.getByText('28/10/2026 · 9:40 a. m.')).toBeOnTheScreen();
    expect(screen.getByText('ABC-123')).toBeOnTheScreen();
    expect(screen.getByText('Visitantes que ingresan (2)')).toBeOnTheScreen();
    expect(screen.getByText('Visitantes que no ingresan (2)')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Ir a inspección (opcional)' }));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/inspection/[vehicleId]',
      params: { vehicleId: 'tu-1' },
    });
    expect(store().session).toBeNull();
  });

  it('volver al inicio limpia la sesión', async () => {
    const user = prepare();
    store().update({ ...recordPerson(store().session!, 'vv-ana', 'va-ana'), mode: 'pedestrian' });
    store().finish({
      confirmation: { confirmedUnits: 0, confirmedVisitors: 1, enteredAt: null, message: 'ok' },
      rejectedCompanions: [],
    });
    await renderWithDeps(<GateConfirmedScreen />);

    expect(screen.getByText('Personas (1)')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /inspección/ })).not.toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Volver al inicio' }));

    expect(router.dismissAll).toHaveBeenCalled();
    expect(store().session).toBeNull();
  });
});
