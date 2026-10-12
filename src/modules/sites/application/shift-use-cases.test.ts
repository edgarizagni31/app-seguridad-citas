import type { ShiftStore, Site } from '../domain';
import { err, ok, type ShiftSnapshot } from '@/shared/domain';

import { changeSite, endShift, listSites, shiftStatus, startShift } from './shift-use-cases';

const SITE: Site = { id: 'site-central', name: 'Almacén Central' };
const snapshot = (overrides: Partial<ShiftSnapshot> = {}) =>
  ({ siteId: SITE.id, siteName: SITE.name, date: '2026-10-12', ...overrides }) as ShiftSnapshot;

function createMemoryStore(initial: { site?: Site; snapshot?: ShiftSnapshot } = {}) {
  let site = initial.site ?? null;
  let current = initial.snapshot ?? null;
  return {
    selectedSite: jest.fn(async () => site),
    saveSelectedSite: jest.fn(async (next: Site) => {
      site = next;
    }),
    snapshot: jest.fn(async () => current),
    saveSnapshot: jest.fn(async (next: ShiftSnapshot) => {
      current = next;
    }),
    clear: jest.fn(async () => {
      current = null;
    }),
    clearSelectedSite: jest.fn(async () => {
      site = null;
    }),
  } satisfies ShiftStore;
}

const today = () => '2026-10-12';

describe('listSites', () => {
  it('devuelve las sedes del usuario', async () => {
    const sitesGateway = { listMySites: async () => ok([SITE]) };

    expect(await listSites({ sitesGateway })()).toEqual(ok([SITE]));
  });

  it('sin sedes asignadas es un error explícito', async () => {
    const sitesGateway = { listMySites: async () => ok([]) };

    expect(await listSites({ sitesGateway })()).toEqual(err({ type: 'no-sites' }));
  });
});

describe('shiftStatus', () => {
  it('sin sede elegida', async () => {
    expect(await shiftStatus({ store: createMemoryStore(), today })()).toEqual(
      ok({ type: 'no-site' }),
    );
  });

  it('con sede pero sin paquete pide descargar', async () => {
    const store = createMemoryStore({ site: SITE });

    expect(await shiftStatus({ store, today })()).toEqual(
      ok({ type: 'needs-download', site: SITE }),
    );
  });

  it('un paquete de otro día o de otra sede pide descargar', async () => {
    const yesterday = createMemoryStore({ site: SITE, snapshot: snapshot({ date: '2026-10-11' }) });
    const otherSite = createMemoryStore({
      site: SITE,
      snapshot: snapshot({ siteId: 'site-norte' }),
    });

    expect(await shiftStatus({ store: yesterday, today })()).toMatchObject(
      ok({ type: 'needs-download' }),
    );
    expect(await shiftStatus({ store: otherSite, today })()).toMatchObject(
      ok({ type: 'needs-download' }),
    );
  });

  it('con paquete vigente está listo', async () => {
    const store = createMemoryStore({ site: SITE, snapshot: snapshot() });

    expect(await shiftStatus({ store, today })()).toEqual(
      ok({ type: 'ready', site: SITE, snapshot: snapshot() }),
    );
  });

  it('un fallo del almacenamiento es un error de storage', async () => {
    const store = createMemoryStore();
    store.selectedSite.mockRejectedValueOnce(new Error('db'));

    expect(await shiftStatus({ store, today })()).toMatchObject(err({ type: 'storage' }));
  });
});

describe('startShift / endShift', () => {
  it('descarga el paquete del día y recuerda la sede', async () => {
    const store = createMemoryStore();
    const shiftGateway = { downloadSnapshot: jest.fn(async () => ok(snapshot())) };

    const result = await startShift({ shiftGateway, store, today })(SITE);

    expect(shiftGateway.downloadSnapshot).toHaveBeenCalledWith('site-central', '2026-10-12');
    expect(result).toEqual(ok(snapshot()));
    expect(await store.selectedSite()).toEqual(SITE);
  });

  it('sin red no cambia nada', async () => {
    const store = createMemoryStore();
    const shiftGateway = { downloadSnapshot: async () => err({ type: 'network' as const }) };

    expect(await startShift({ shiftGateway, store, today })(SITE)).toEqual(
      err({ type: 'network' }),
    );
    expect(store.saveSelectedSite).not.toHaveBeenCalled();
  });

  it('un fallo al guardar devuelve error de storage', async () => {
    const store = createMemoryStore();
    store.saveSnapshot.mockRejectedValueOnce(new Error('db'));
    const shiftGateway = { downloadSnapshot: async () => ok(snapshot()) };

    expect(await startShift({ shiftGateway, store, today })(SITE)).toMatchObject(
      err({ type: 'storage' }),
    );
  });

  it('cerrar turno descarta el paquete', async () => {
    const store = createMemoryStore({ site: SITE, snapshot: snapshot() });

    await endShift({ store })();

    expect(await store.snapshot()).toBeNull();
    expect(await store.selectedSite()).toEqual(SITE);
  });

  it('cambiar sede descarta el paquete y la sede elegida', async () => {
    const store = createMemoryStore({ site: SITE, snapshot: snapshot() });

    await changeSite({ store })();

    expect(await store.snapshot()).toBeNull();
    expect(await store.selectedSite()).toBeNull();
  });
});
