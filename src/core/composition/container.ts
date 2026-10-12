import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

import type { Dependencies } from '@/core/di';
import { readQr } from '@/modules/access-control/application';
import { login, logout, refreshSession, restoreSession } from '@/modules/auth/application';
import {
  createMockAuthGateway,
  createR360AuthGateway,
  jwtTokenDecoder,
  secureStoreSessionStorage,
} from '@/modules/auth/infrastructure';
import {
  changeSite,
  endShift,
  listSites,
  shiftStatus,
  startShift,
} from '@/modules/sites/application';
import {
  createMockSitesGateways,
  createSqliteShiftStore,
  SITES_MIGRATIONS,
} from '@/modules/sites/infrastructure';
import {
  createHttpClient,
  createLogger,
  netInfoConnectivity,
  systemClock,
  type Env,
} from '@/shared/infrastructure';
import {
  createChangeBus,
  createLazyDatabase,
  openExpoSqliteDatabase,
} from '@/shared/infrastructure/db';
import {
  createOutboxStore,
  createSyncEngine,
  startSyncTriggers,
  SYNC_MIGRATIONS,
} from '@/shared/infrastructure/sync';
import { mergeHistory } from '@/shared/domain';
import { toIsoDate } from '@/shared/lib';

export type AppContainer = {
  readonly dependencies: Dependencies;
  // Arranca los procesos en segundo plano (sincronización) y devuelve cómo detenerlos
  readonly start: () => () => void;
};

export function createContainer(env: Env): AppContainer {
  const logger = createLogger({ minLevel: env.appVariant === 'production' ? 'warn' : 'debug' });
  const clock = systemClock;
  const connectivity = netInfoConnectivity;
  const changes = createChangeBus();
  const db = createLazyDatabase(
    () => openExpoSqliteDatabase(),
    [...SYNC_MIGRATIONS, ...SITES_MIGRATIONS],
  );
  const today = () => toIsoDate(clock.now(), env.timeZone);

  const r360Http = createHttpClient({
    baseUrl: env.r360ApiUrl,
    appVersion: env.appVersion,
    platform: Platform.OS,
    createCorrelationId: Crypto.randomUUID,
  });

  const authDeps = {
    authGateway:
      env.authProvider === 'mock'
        ? createMockAuthGateway({ clock })
        : createR360AuthGateway(r360Http),
    tokenDecoder: jwtTokenDecoder,
    sessionStorage: secureStoreSessionStorage,
    clock,
  };

  const sync = createSyncEngine({
    store: createOutboxStore(db),
    handlers: [],
    clock,
    logger,
    changes,
    isOnline: connectivity.isOnline,
    createId: Crypto.randomUUID,
  });

  // Backend sin estos endpoints todavía: mock hasta implementar el contrato (docs/CONTRATO-API-*)
  const shiftStore = createSqliteShiftStore(db, changes);
  const sitesDeps = {
    ...createMockSitesGateways({ clock, isOnline: connectivity.isOnline }),
    store: shiftStore,
    today,
  };
  const closeShift = endShift(sitesDeps);
  const signOut = logout(authDeps);

  const dependencies: Dependencies = {
    config: {
      appVersion: env.appVersion,
      timeZone: env.timeZone,
      isDemoAuth: env.authProvider === 'mock',
    },
    logger,
    clock,
    connectivity,
    changes,
    sync,
    // Los módulos de ingreso e inspección registran aquí sus fuentes
    history: mergeHistory([]),
    auth: {
      login: login(authDeps),
      restoreSession: restoreSession(authDeps),
      refreshSession: refreshSession(authDeps),
      // Cerrar sesión también descarta el paquete del día (datos locales del turno)
      logout: async () => {
        const cleared = await closeShift();
        if (!cleared.ok) logger.error('No se pudo limpiar el turno', { error: cleared.error.type });
        return signOut();
      },
    },
    accessControl: {
      readQr: readQr({ clock }),
    },
    sites: {
      listSites: listSites(sitesDeps),
      shiftStatus: shiftStatus(sitesDeps),
      startShift: startShift(sitesDeps),
      endShift: closeShift,
      changeSite: changeSite(sitesDeps),
    },
  };

  return {
    dependencies,
    start: () => {
      let stopTriggers = () => undefined as void;
      let stopped = false;
      sync
        .start()
        .then(() => {
          if (!stopped)
            stopTriggers = startSyncTriggers({ connectivity, requestSync: sync.requestSync });
        })
        .catch((error: unknown) => logger.error('No se pudo iniciar la sincronización', { error }));
      return () => {
        stopped = true;
        stopTriggers();
      };
    },
  };
}
