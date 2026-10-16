# Portal Citas · Control de Garita

App móvil (Android 10+ e iOS) para la garita de los almacenes de Ransa.

- **Seguridad:** escanea el QR firmado del vehículo, marca qué visitantes llegaron, agrega visitantes y confirma el ingreso. Si alguien llega tarde, se vuelve a escanear el QR.
- **HSE:** ve los vehículos ingresados del día agrupados por cita y hace la inspección vehicular de 15 pasos con fotos.
- **Sin conexión:** todo se guarda primero en el teléfono (SQLite) y se envía al reconectar. Si el servidor rechaza algo hecho sin red, avisa con una notificación y lo deja en "Requiere atención".

**Stack:** Expo SDK 57, React Native 0.86, TypeScript estricto, Expo Router, Zustand, Zod, expo-sqlite, NetInfo, @noble/curves (QR ES256) y Jest + Testing Library.

## Requisitos (Windows)

| Herramienta                  | Uso                                                              |
| ---------------------------- | ---------------------------------------------------------------- |
| Node.js 22 LTS               | Obligatorio                                                      |
| Git                          | Obligatorio                                                      |
| Expo Go (Android y/o iPhone) | Para probar sin compilar                                         |
| Android Studio + JDK 17      | Solo para emulador o builds locales (`ANDROID_HOME` configurado) |
| Cuenta de Expo               | Solo para builds con EAS                                         |

## Inicio rápido

```bash
npm install
cp .env.example .env          # ajustar valores si hace falta
npm start                     # abre Metro; escanear el QR con Expo Go
```

- **Android:** abre Expo Go y escanea el QR que muestra la terminal.
- **iPhone:** escanea el QR con la cámara del teléfono, que lo abre en Expo Go.
- **Si la red corporativa bloquea la conexión** entre el PC y el teléfono, usa `npx expo start --tunnel`.

## Variables de entorno

| Variable                    | Ejemplo                                           | Descripción                                      |
| --------------------------- | ------------------------------------------------- | ------------------------------------------------ |
| `EXPO_PUBLIC_API_URL`       | `https://citascam.qas.ransaaplicaciones.com/api/` | API de Citas                                     |
| `EXPO_PUBLIC_R360_API_URL`  | `https://api-360v2.qas.ransaaplicaciones.com`     | API de autenticación R360                        |
| `EXPO_PUBLIC_AUTH_PROVIDER` | `r360` / `mock`                                   | `mock` simula el login (prohibido en producción) |
| `EXPO_PUBLIC_TIME_ZONE`     | `America/El_Salvador`                             | Zona horaria de la sede                          |
| `APP_VARIANT`               | `development` / `preview` / `production`          | Nombre, ID y _scheme_ de la app                  |

Las variables `EXPO_PUBLIC_*` quedan dentro del bundle: **nunca pongas secretos en ellas**. La configuración se valida al arrancar; si algo falta o es inválido, la app falla con un mensaje claro.

### Usuarios demo (`EXPO_PUBLIC_AUTH_PROVIDER=mock`)

La contraseña de todos es `demo123`.

| Correo                 | Resultado                                        |
| ---------------------- | ------------------------------------------------ |
| `seguridad@demo.ransa` | Ingresa con rol de seguridad                     |
| `hse@demo.ransa`       | Ingresa con rol HSE (Inspecciones)               |
| `jefe@demo.ransa`      | Ingresa con ambos roles (todas las pestañas)     |
| `soporte@demo.ransa`   | Ingresa con rol de soporte (Mi perfil → Soporte) |
| `cliente@demo.ransa`   | Ingresa sin rol de seguridad (acceso denegado)   |
| `cambio@demo.ransa`    | Debe cambiar la contraseña                       |
| `sinred@demo.ransa`    | Simula un fallo de red                           |

### Datos del turno y QR de prueba

Las **sedes** vienen de la API de Citas (`operation/UserHeadquarter/ListUserHeadquarterByUserId`, el mismo endpoint del portal web). Lo demás aún no tiene endpoint, así que la app usa **adaptadores mock** (ver `docs/CONTRATO-API-INGRESO-INSPECCION.md`, local):

- Al iniciar sesión se elige una de las sedes del usuario y se descarga el **paquete del día** de ejemplo para esa sede. En modo demo (`EXPO_PUBLIC_AUTH_PROVIDER=mock`) se listan "Sede demo 1" y "Sede demo 2". Sus horarios son relativos a la hora de la descarga, así que la demo funciona a cualquier hora. "Mi perfil → Actualizar datos" lo vuelve a generar.
- `npm run qr:generate` genera en `docs/qr-pruebas/` un PNG por caso y un `index.html` para escanearlos desde la pantalla del PC. Incluye los QR firmados del vehículo (casos 08 a 14) para la sede indicada con `npm run qr:generate -- --site <headquarterId>` (sin `--site`, la "Sede demo 1" del modo demo): ingreso normal, llegada tardía, unidad ya ingresada, otra sede, vencido, firma falsa y visitante en lista negra.
- Los QR se firman con una **clave de desarrollo** (`src/shared/infrastructure/demo/dev-qr-keys.ts`). En producción la clave pública llega en el paquete del día y la privada solo existe en el backend.
- Para probar un rechazo del servidor, agrega un visitante con el DUI `07777777-7` sin conexión y luego reconecta: aparece la notificación y el registro en "Requiere atención".

## Scripts

| Script                                                      | Descripción                                               |
| ----------------------------------------------------------- | --------------------------------------------------------- |
| `npm start`                                                 | Servidor de desarrollo                                    |
| `npm run android` / `npm run ios`                           | Abre en emulador o simulador                              |
| `npm test` / `npm run test:watch` / `npm run test:coverage` | Pruebas                                                   |
| `npm run lint`                                              | ESLint, incluidas las reglas de arquitectura              |
| `npm run typecheck`                                         | TypeScript                                                |
| `npm run format` / `npm run format:check`                   | Prettier                                                  |
| `npm run doctor`                                            | Diagnóstico de Expo                                       |
| `npm run assets:crop`                                       | Regenera las imágenes desde los mockups (`docs/mockups/`) |
| `npm run qr:generate`                                       | Genera los QR de prueba                                   |

## Arquitectura

Monolito modular por dominios + Clean/Hexagonal + MVVM. Ver [CONTRIBUTING.md](CONTRIBUTING.md).

```
src/app/                        Rutas (Expo Router), solo re-exportan pantallas
src/modules/auth/               Sesión R360, roles (Seguridad y HSE)
src/modules/sites/              Sede y paquete del día
src/modules/access-control/     QR firmado, validación de la unidad e ingreso de visitantes
src/modules/vehicle-inspection/ Tablero HSE, cuestionario como datos, fotos e inspección
src/modules/history/            Historial del turno y bandeja "Requiere atención"
src/modules/profile/            Mi perfil
src/shared/                     Kernel común: Result, SQLite, outbox y sincronización, design system
src/core/                       Inyección de dependencias y composition root
```

- **Offline:** cada escritura se guarda en SQLite junto con su envío en la outbox (misma transacción). El motor de sincronización respeta el orden de cada registro, reintenta con backoff y se dispara al recuperar la red, al volver a la app y después de cada escritura.
- **Base local sin cifrar:** la app sigue funcionando en Expo Go. Las fotos y los registros se borran al sincronizarse o al cerrar el turno. Ver `docs/adr/0004`.
- **Rutas tipadas:** `npm start` genera `.expo/types`. En un clon nuevo, ejecútalo una vez antes de `npm run typecheck`.

## Builds con EAS (pasos manuales)

1. `npx eas-cli@latest login`
2. `npx eas-cli@latest init` (vincula el proyecto y agrega `extra.eas.projectId`)
3. `npx eas-cli@latest env:create` para las variables de cada ambiente
4. `npx eas-cli@latest build --profile development|preview|production`

Los perfiles definen `APP_VARIANT`, así que las variantes Dev, QA y Producción pueden convivir instaladas en el mismo teléfono.

El mínimo de **Android 10** (`minSdkVersion 29`) solo se aplica al compilar. Para probar el arranque en frío sin red, el modo avión y la cámara en un Android 10/11 real, usa un build `preview`: Expo Go no reproduce esas condiciones igual que la app instalada.
