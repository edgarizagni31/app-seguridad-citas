import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

import type { Dependencies } from '@/core/di';
import {
  confirmEntry,
  confirmPedestrianEntry,
  confirmVehicleEntry,
  lookupAppointment,
  presentPerson,
  presentUnit,
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
  createCitasGateGateway,
  createMockAccessGateway,
  createMockGateGateway,
  createSqliteEntryRepository,
  es256VehicleQrVerifier,
} from '@/modules/access-control/infrastructure';
import { useSessionStore } from '@/modules/auth';
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
  createCitasSitesGateway,
  createMockShiftGateway,
  createMockSitesGateway,
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
  createLocalDataInspector,
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
  discardCapture,
  finishInspection,
  inspectionHistoryFrom,
  openInspection,
  reportMismatch,
  updateObservation,
} from '@/modules/vehicle-inspection/application';
import {
  createCitasInspectionGateway,
  createExpoPhotoStore,
  createMockInspectionGateway,
  createSqliteInspectionRepository,
  INSPECTION_MIGRATIONS,
} from '@/modules/vehicle-inspection/infrastructure';
import { mergeHistory } from '@/shared/domain';
import { createExpoNotificationsService } from '@/shared/infrastructure/notifications';
import { STRINGS, toIsoDate } from '@/shared/lib';

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

  // API de Citas: usa el idToken de la sesión y, ante un 401, renueva una vez y reintenta
  const citasHttp = createHttpClient({
    baseUrl: env.apiUrl,
    appVersion: env.appVersion,
    platform: Platform.OS,
    createCorrelationId: Crypto.randomUUID,
    getAccessToken: async () => useSessionStore.getState().session?.tokens.idToken ?? null,
    onUnauthorized: async () => {
      const session = useSessionStore.getState().session;
      if (!session) return false;
      const renewed = await refreshSession(authDeps)(session);
      if (renewed.ok) useSessionStore.getState().setSession(renewed.value);
      return renewed.ok;
    },
  });

  // Backend sin estos endpoints todavía: mock hasta implementar el contrato (docs/CONTRATO-API-*)
  const accessGateway = createMockAccessGateway({ isOnline: connectivity.isOnline });
  const gateDeps = {
    gateway:
      env.authProvider === 'mock'
        ? createMockGateGateway({ clock, isOnline: connectivity.isOnline })
        : createCitasGateGateway(citasHttp),
    isOnline: connectivity.isOnline,
  };
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
  const inspectionGateway =
    env.authProvider === 'mock'
      ? createMockInspectionGateway({ isOnline: connectivity.isOnline })
      : createCitasInspectionGateway(citasHttp);

  const notifications = createExpoNotificationsService({
    logger,
    channelName: STRINGS.attention.channel,
  });

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
    // RF-H3: un rechazo del servidor avisa al instante, sin datos personales en el texto
    onAttention: (item) =>
      void notifications.notify({
        title: STRINGS.attention.notificationTitle,
        body: STRINGS.attention.notificationBody(item.title),
        target: 'attention',
      }),
  });

  const shiftStore = createSqliteShiftStore(db, changes);
  const sitesDeps = {
    sitesGateway:
      env.authProvider === 'mock'
        ? createMockSitesGateway({ isOnline: connectivity.isOnline })
        : createCitasSitesGateway(citasHttp),
    // El paquete del día sigue simulado hasta que exista el endpoint (docs/CONTRATO-API-*)
    shiftGateway: createMockShiftGateway({ clock, isOnline: connectivity.isOnline }),
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
    gateway: inspectionGateway,
    isOnline: connectivity.isOnline,
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
  const leaveSite = withCleanup(changeSite(sitesDeps));
  const downloadShift = startShift(sitesDeps);
  // Al cambiar de día se descartan los registros ya sincronizados del turno anterior
  const startShiftWithRetention: Dependencies['sites']['startShift'] = async (site) => {
    const previous = await shiftStore.snapshot();
    const result = await downloadShift(site);
    if (!result.ok) return result;
    try {
      if (previous && previous.date !== result.value.date) await clearShiftData();
    } catch (error) {
      logger.error('No se pudo aplicar la retención del turno', { error: String(error) });
    }
    return result;
  };
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
    gate: {
      lookup: lookupAppointment(gateDeps),
      presentUnit: presentUnit(gateDeps),
      presentPerson: presentPerson(gateDeps),
      confirmVehicle: confirmVehicleEntry(gateDeps),
      confirmPedestrian: confirmPedestrianEntry(gateDeps),
    },
    localData: createLocalDataInspector(db),
    notifications,
    history: mergeHistory([entryHistoryFrom(entryRepo), inspectionHistoryFrom(inspectionRepo)]),
    inspections: {
      list: inspectionRepo.list,
      get: inspectionRepo.findById,
      tables: inspectionRepo.tables,
      open: openInspection(inspectionDeps),
      answer: answerInspection(inspectionDeps),
      capturePhoto: capturePhoto(inspectionDeps),
      discardCapture: discardCapture(inspectionDeps),
      updateObservation: updateObservation(inspectionDeps),
      finish: finishInspection(inspectionDeps),
      reportMismatch: reportMismatch(inspectionDeps),
    },
    auth: {
      login: login(authDeps),
      restoreSession: restoreSession(authDeps),
      refreshSession: refreshSession(authDeps),
      // Cerrar sesión descarta el paquete del día y la sede: cada usuario tiene las suyas
      logout: async () => {
        const cleared = await leaveSite();
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
      startShift: startShiftWithRetention,
      endShift: closeShift,
      changeSite: leaveSite,
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
