import { createChangeBus } from './change-bus';

describe('createChangeBus', () => {
  it('notifica solo a los suscriptores de las tablas afectadas', () => {
    const bus = createChangeBus();
    const onEntries = jest.fn();
    const onPhotos = jest.fn();
    bus.subscribe(['entries'], onEntries);
    bus.subscribe(['photos'], onPhotos);

    bus.emit(['entries', 'outbox']);

    expect(onEntries).toHaveBeenCalledTimes(1);
    expect(onPhotos).not.toHaveBeenCalled();
  });

  it('deja de notificar al cancelar la suscripción', () => {
    const bus = createChangeBus();
    const listener = jest.fn();
    const unsubscribe = bus.subscribe(['entries'], listener);

    unsubscribe();
    bus.emit(['entries']);

    expect(listener).not.toHaveBeenCalled();
  });
});
