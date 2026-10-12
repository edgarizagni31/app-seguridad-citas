import { useEffect, useEffectEvent, useRef, useState } from 'react';

import type { ShiftStatus, Site, SitesError } from '../../domain';
import { useDependencies } from '@/core/di';
import { SHIFT_TABLES, type Result } from '@/shared/domain';

export type ShiftGatePhase =
  | { readonly type: 'checking' }
  | { readonly type: 'choosing'; readonly sites: readonly Site[] }
  | { readonly type: 'downloading'; readonly site: Site }
  | { readonly type: 'offline'; readonly site: Site }
  | { readonly type: 'error'; readonly site: Site | null }
  | { readonly type: 'no-sites' }
  | { readonly type: 'ready' };

export function useShiftGate() {
  const { sites, changes, logger } = useDependencies();
  const [phase, setPhase] = useState<ShiftGatePhase>({ type: 'checking' });
  // Mientras descarga se ignoran los avisos de cambio que produce la propia descarga
  const downloading = useRef(false);

  const failed = (error: SitesError, site: Site | null) => {
    if (error.type === 'network' && site) return setPhase({ type: 'offline', site });
    if (error.type === 'no-sites') return setPhase({ type: 'no-sites' });
    logger.error('No se pudo preparar el turno', { error: error.type });
    setPhase({ type: 'error', site });
  };

  const download = async (site: Site) => {
    setPhase({ type: 'downloading', site });
    downloading.current = true;
    const result = await sites.startShift(site);
    downloading.current = false;
    if (result.ok) setPhase({ type: 'ready' });
    else failed(result.error, site);
  };

  const choose = async () => {
    setPhase({ type: 'checking' });
    const result = await sites.listSites();
    if (!result.ok) return failed(result.error, null);
    const [only] = result.value;
    // Con una sola sede no hay nada que elegir
    if (result.value.length === 1 && only) return download(only);
    setPhase({ type: 'choosing', sites: result.value });
  };

  const handle = (status: Result<ShiftStatus, SitesError>) => {
    if (!status.ok) return failed(status.error, null);
    if (status.value.type === 'ready') return setPhase({ type: 'ready' });
    if (status.value.type === 'needs-download') return void download(status.value.site);
    return void choose();
  };
  const apply = useEffectEvent(handle);

  useEffect(() => {
    void sites.shiftStatus().then(apply);
    // Al cambiar de sede desde el perfil, el estado se vuelve a evaluar
    return changes.subscribe(SHIFT_TABLES, () => {
      if (!downloading.current) void sites.shiftStatus().then(apply);
    });
  }, [changes, sites]);

  return {
    phase,
    selectSite: (site: Site) => void download(site),
    retry: () => void sites.shiftStatus().then(handle),
    changeSite: () => void choose(),
  };
}
