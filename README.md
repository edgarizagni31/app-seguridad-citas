# Portal Citas · Control de Garita

App móvil (Android e iOS) para el personal de seguridad en la garita de los almacenes de Ransa. Permite iniciar sesión con la cuenta de Ransa 360 y escanear los códigos QR de las unidades de transporte, los vouchers y los pases de visitante.

**Stack:** Expo SDK 57, React Native 0.86, TypeScript estricto, Expo Router, Zustand, Zod y Jest + Testing Library.

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

| Correo                 | Resultado                                      |
| ---------------------- | ---------------------------------------------- |
| `seguridad@demo.ransa` | Ingresa con rol de seguridad                   |
| `cliente@demo.ransa`   | Ingresa sin rol de seguridad (acceso denegado) |
| `cambio@demo.ransa`    | Debe cambiar la contraseña                     |
| `sinred@demo.ransa`    | Simula un fallo de red                         |

### QR de prueba

`npm run qr:generate` genera en `docs/qr-pruebas/` un PNG por caso y un `index.html` para escanearlos desde la pantalla del PC.

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
src/app/            Rutas (Expo Router), solo re-exportan pantallas
src/modules/auth/   Sesión R360: dominio, casos de uso, adaptadores, pantallas
src/modules/access-control/   Lectura e interpretación de QR en garita
src/shared/         Kernel común: Result, logger, cliente HTTP, design system
src/core/           Inyección de dependencias y composition root
```

## Builds con EAS (pasos manuales)

1. `npx eas-cli@latest login`
2. `npx eas-cli@latest init` (vincula el proyecto y agrega `extra.eas.projectId`)
3. `npx eas-cli@latest env:create` para las variables de cada ambiente
4. `npx eas-cli@latest build --profile development|preview|production`

Los perfiles definen `APP_VARIANT`, así que las variantes Dev, QA y Producción pueden convivir instaladas en el mismo teléfono.
