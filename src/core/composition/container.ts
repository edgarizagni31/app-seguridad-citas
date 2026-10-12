import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

import type { Dependencies } from '@/core/di';
import {
  confirmEntry,
  createEntrySyncHandler,
  entryHistoryFrom,
  entryLogFrom,
  identifyVehicle,
  readQr,
  validateUnit,
  validateVisitor,
} from '@/modules/access-control/application';
import {
  ACCESS_MIGRATIONS,
  createMockAccessGateway,
  createSqliteEntryRepository,
  es256VehicleQrVerifier,
} from '@/modules/access-control/infrastructure';
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
import {
  answerInspection,
  capturePhoto,
  createInspectionSyncHandler,
  finishInspection,
  inspectionHistoryFrom,
  openInspection,
  reportMismatch,
  updateObservation,
} from '@/modules/vehicle-inspection/application';
import { STANDARD_DEFINITION_V1 } from '@/modules/vehicle-inspection/domain';
import {
  createExpoPhotoStore,
  createMockInspectionGateway,
  createSqliteInspectionRepository,
  INSPECTION_MIGRATIONS,
} from '@/modules/vehicle-inspection/infrastructure';
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
    [...SYNC_MIGRATIONS, ...SITES_MIGRATIONS, ...ACCESS_MIGRATIONS, ...INSPECTION_MIGRATIONS],
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

  // Backend sin estos endpoints todavía: mock hasta implementar el contrato (docs/CONTRATO-API-*)
  const accessGateway = createMockAccessGateway({ isOnline: connectivity.isOnline });
  const entryRepo = createSqliteEntryRepository({
    db,
    changes,
    clock,
    createId: Crypto.randomUUID,
  });

  const inspectionRepo = createSqliteInspectionRepository({
    db,
    changes,
    clock,
    createId: Crypto.randomUUID,
  });
  const photoStore = createExpoPhotoStore({ createId: Crypto.randomUUID });
  const inspectionGateway = createMockInspectionGateway({ isOnline: connectivity.isOnline });

  const sync = createSyncEngine({
    store: createOutboxStore(db),
    handlers: [
      createEntrySyncHandler({ gateway: accessGateway, repo: entryRepo }),
      createInspectionSyncHandler({
        gateway: inspectionGateway,
        repo: inspectionRepo,
        photos: photoStore,
      }),
    ],
    clock,
    logger,
    changes,
    isOnline: connectivity.isOnline,
    createId: Crypto.randomUUID,
  });

  const shiftStore = createSqliteShiftStore(db, changes);
  const sitesDeps = {
    ...createMockSitesGateways({ clock, isOnline: connectivity.isOnline }),
    store: shiftStore,
    today,
  };
  const validationDeps = {
    shift: shiftStore,
    entries: entryLogFrom(entryRepo),
    verifier: es256VehicleQrVerifier,
    gateway: accessGateway,
    isOnline: connectivity.isOnline,
    clock,
  };
  // Al cerrar el turno se descartan el paquete y los registros ya sincronizados
  const inspectionDeps = {
    repo: inspectionRepo,
    photos: photoStore,
    shift: shiftStore,
    entries: entryLogFrom(entryRepo),
    definition: STANDARD_DEFINITION_V1,
    clock,
    createId: Crypto.randomUUID,
    requestSync: sync.requestSync,
    logger,
  };
  const clearShiftData = async () => {
    await entryRepo.clearSynced();
    await inspectionRepo.clearSynced();
  };
  const withCleanup =
    <T>(task: () => Promise<T>) =>
    async () => {
      const result = await task();
      await clearShiftData().catch((error: unknown) =>
        logger.error('No se pudieron limpiar los registros del turno', { error: String(error) }),
      );
      return result;
    };
  const closeShift = withCleanup(endShift(sitesDeps));
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
    history: mergeHistory([entryHistoryFrom(entryRepo), inspectionHistoryFrom(inspectionRepo)]),
    inspections: {
      open: openInspection(inspectionDeps),
      answer: answerInspection(inspectionDeps),
      capturePhoto: capturePhoto(inspectionDeps),
      updateObservation: updateObservation(inspectionDeps),
      finish: finishInspection(inspectionDeps),
      reportMismatch: reportMismatch(inspectionDeps),
    },
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
      validateUnit: validateUnit(validationDeps),
      identifyVehicle: identifyVehicle(validationDeps),
      validateVisitor: validateVisitor(validationDeps),
      confirmEntry: confirmEntry({
        repo: entryRepo,
        clock,
        createId: Crypto.randomUUID,
        requestSync: sync.requestSync,
        logger,
      }),
    },
    sites: {
      listSites: listSites(sitesDeps),
      shiftStatus: shiftStatus(sitesDeps),
      startShift: startShift(sitesDeps),
      endShift: closeShift,
      changeSite: withCleanup(changeSite(sitesDeps)),
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
