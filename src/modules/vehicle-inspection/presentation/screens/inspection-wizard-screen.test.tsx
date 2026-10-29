import { act, screen, userEvent } from '@testing-library/react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert } from 'react-native';

import { createChangeBus } from '@/shared/infrastructure/db';
import { createMemoryInspections, TEST_TARGET } from '@/test/fakes/inspections';
import { renderWithDeps } from '@/test/render-with-deps';

import { InspectionWizardScreen } from './inspection-wizard-screen';

jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
  useLocalSearchParams: jest.fn(),
  Redirect: () => null,
}));

const NOW = new Date('2026-10-05T17:00:00Z');
const router = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
// El diálogo de confirmación se acepta tocando la acción destructiva
const acceptAlerts = () =>
  jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
    buttons?.find((button) => button.style === 'destructive')?.onPress?.();
  });

// Las llamadas directas a los casos de uso disparan el bus de cambios: van dentro de act
const inAct =
  <A extends unknown[], R>(fn: (...args: A) => Promise<R>) =>
  (...args: A) =>
    act(() => fn(...args));

async function setup() {
  const changes = createChangeBus();
  const memory = createMemoryInspections({ changes, now: NOW });
  const opened = await inAct(memory.useCases.open)({
    target: TEST_TARGET,
    inspector: { id: 'user-ana', name: 'Ana Morales' },
  });
  if (!opened.ok) throw new Error(opened.error.type);
  // El gateway simulado usa setTimeout: los timers falsos van después de abrir
  jest.useFakeTimers();
  jest.mocked(useRouter).mockReturnValue(router as never);
  jest.mocked(useLocalSearchParams).mockReturnValue({ inspectionId: opened.value.id });
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  await renderWithDeps(<InspectionWizardScreen />, { changes, inspections: memory.useCases });
  return { user, memory, id: opened.value.id };
}

const advance = () => act(async () => jest.advanceTimersByTime(1500));

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('InspectionWizardScreen', () => {
  it('empieza en la placa: no editable, con check y el aviso del mockup', async () => {
    await setup();

    expect(
      await screen.findByRole('heading', { name: 'Placa del vehículo - Parte delantera' }),
    ).toBeOnTheScreen();
    expect(screen.getByText('Paso 1 de 15')).toBeOnTheScreen();
    expect(screen.getAllByText('ABC-123').length).toBeGreaterThan(0);
    expect(
      screen.getByText(
        'Si la placa no coincide, informa al supervisor y no continúes con la inspección.',
      ),
    ).toBeOnTheScreen();
  });

  it('continuar con la placa lleva a la foto delantera con su imagen referencial', async () => {
    const { user } = await setup();

    await user.press(await screen.findByRole('button', { name: 'Continuar' }));

    expect(
      await screen.findByText(
        'Toma una fotografía del vehículo y su placa de identificación (delantera).',
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText('Imagen referencial')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Tomar foto' }));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/inspection/camera',
      params: { inspectionId: 'insp-1', stepId: 'front-photo' },
    });
  });

  it('Sí/No avanza solo y, con No, avisa la foto que se omite', async () => {
    const { user, memory, id } = await setup();
    await inAct(memory.useCases.answer)(id, 'front-plate', { kind: 'plate', confirmed: true });
    await inAct(memory.useCases.capturePhoto)(id, 'front-photo', {
      uri: 'file:///c.jpg',
      width: 4000,
      height: 3000,
    });
    await advance();

    expect(
      await screen.findByRole('heading', { name: '¿Vehículo cuenta con acoplado?' }),
    ).toBeOnTheScreen();
    await user.press(screen.getByRole('radio', { name: 'No' }));

    expect(await screen.findByText('Se omitirá la fotografía del acoplado.')).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'No' })).toBeChecked();
    await advance();
    expect(
      await screen.findByRole('heading', {
        name: '¿El vehículo cuenta con precinto trasero izquierdo?',
      }),
    ).toBeOnTheScreen();
  });

  it('con la foto tomada muestra "Foto tomada" y permite repetirla o continuar', async () => {
    const { user, memory, id } = await setup();
    acceptAlerts();
    await user.press(await screen.findByRole('button', { name: 'Continuar' }));
    await screen.findByRole('button', { name: 'Tomar foto' });
    await inAct(memory.useCases.capturePhoto)(id, 'front-photo', {
      uri: 'file:///c.jpg',
      width: 4000,
      height: 3000,
    });

    expect(await screen.findByText('Foto tomada')).toBeOnTheScreen();
    expect(screen.getByText('Referencia')).toBeOnTheScreen();
    expect(screen.queryByText('Imagen referencial')).not.toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Repetir foto' }));
    expect(router.push).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: '/inspection/camera' }),
    );
  });

  it('la placa que no coincide registra la observación y muestra el resultado', async () => {
    const { user, memory } = await setup();
    acceptAlerts();

    await user.press(await screen.findByRole('button', { name: 'La placa no coincide' }));

    expect(memory.useCases.reportMismatch).toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/inspection/result/[inspectionId]',
      params: { inspectionId: 'insp-1' },
    });
  });

  it('completo, pasa a la revisión y envía con la observación', async () => {
    const { user, memory, id } = await setup();
    const capture = { uri: 'file:///c.jpg', width: 4000, height: 3000 };
    await inAct(memory.useCases.answer)(id, 'front-plate', { kind: 'plate', confirmed: true });
    await inAct(memory.useCases.capturePhoto)(id, 'front-photo', capture);
    for (const stepId of [
      'has-trailer',
      'has-rear-left-seal',
      'has-rear-right-seal',
      'has-side-door',
      'has-side-seal',
    ]) {
      await inAct(memory.useCases.answer)(id, stepId, { kind: 'yes_no', value: false });
    }
    await inAct(memory.useCases.capturePhoto)(id, 'cabin-photo', capture);
    await inAct(memory.useCases.answer)(id, 'has-waybill', { kind: 'yes_no', value: false });
    await advance();

    expect(await screen.findByRole('heading', { name: 'Revisa la inspección' })).toBeOnTheScreen();
    await user.type(screen.getByLabelText('Observación (opcional)'), 'Sin novedades');
    await user.press(screen.getByRole('button', { name: 'Enviar inspección' }));

    expect(memory.useCases.updateObservation).toHaveBeenCalledWith(id, 'Sin novedades');
    expect(memory.useCases.finish).toHaveBeenCalledWith(id);
    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/inspection/result/[inspectionId]',
      params: { inspectionId: id },
    });
  });

  it('cambiar una respuesta que borra una foto pide confirmación', async () => {
    const { user, memory, id } = await setup();
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    await inAct(memory.useCases.answer)(id, 'front-plate', { kind: 'plate', confirmed: true });
    await inAct(memory.useCases.capturePhoto)(id, 'front-photo', {
      uri: 'file:///c.jpg',
      width: 1,
      height: 1,
    });
    await inAct(memory.useCases.answer)(id, 'has-trailer', { kind: 'yes_no', value: true });
    await inAct(memory.useCases.capturePhoto)(id, 'trailer-photo', {
      uri: 'file:///t.jpg',
      width: 1,
      height: 1,
    });
    await advance();

    // Retrocede hasta la pregunta del acoplado
    await user.press(await screen.findByRole('button', { name: 'Volver' }));
    await user.press(screen.getByRole('button', { name: 'Volver' }));
    await user.press(await screen.findByRole('radio', { name: 'No' }));

    expect(alert).toHaveBeenCalledWith(
      '¿Cambiar la respuesta?',
      'Se borrará la fotografía que ya tomaste para esta pregunta.',
      expect.any(Array),
    );
    expect(memory.useCases.answer).not.toHaveBeenCalledWith(id, 'has-trailer', {
      kind: 'yes_no',
      value: false,
    });
  });
});
