# Guía de contribución

## Arquitectura

**Monolito modular por dominios + Clean/Hexagonal + MVVM.** Las reglas de dependencias las verifica ESLint (`eslint-plugin-boundaries`).

```
src/
├── app/                 Rutas de Expo Router. Solo re-exportan pantallas de los módulos.
├── modules/<dominio>/
│   ├── domain/          TS puro: entidades, value objects, puertos, errores, políticas.
│   ├── application/     Casos de uso (funciones con dependencias inyectadas). Devuelven Result.
│   ├── infrastructure/  Adaptadores que implementan los puertos (HTTP, SecureStore, SQLite).
│   ├── presentation/    Pantallas, componentes, view-models (hooks) y stores.
│   └── index.ts         API pública del módulo.
├── shared/              Kernel común: domain, lib, infrastructure, ui (design system).
├── core/di/             Tipo Dependencies + contexto y useDependencies().
├── core/composition/    Composition root: arma los adaptadores según el entorno.
└── test/                Fakes, factories y utilidades de test.
```

| Capa             | Puede importar                                                                                 |
| ---------------- | ---------------------------------------------------------------------------------------------- |
| `domain`         | `domain` del mismo módulo, `shared/domain`, `shared/lib`                                       |
| `application`    | lo anterior + `application` del mismo módulo                                                   |
| `infrastructure` | `domain` del mismo módulo, `shared/*` excepto `ui`                                             |
| `presentation`   | `application` y `domain` del mismo módulo, `index.ts` de otros módulos, `core/di`, `shared/ui` |
| `app/`           | `index.ts` de los módulos, `core`, `shared/ui`                                                 |

- `domain`, `application`, `shared/domain` y `shared/lib` no importan React, React Native, Expo, Zustand ni TanStack.
- Un módulo nunca importa archivos internos de otro: solo su `index.ts`.

## Convenciones

- **Idiomas:** código en inglés; textos de UI en español, centralizados en `shared/lib/strings.ts`.
- **Nombres:** archivos en `kebab-case`; componentes y tipos en `PascalCase`; hooks `use…`; casos de uso con un verbo (`login`); puertos sin prefijo `I` (`AuthGateway`).
- **Exports:** con nombre. `default` solo en las rutas de `src/app`.
- **Errores:**
  - en dominio y aplicación se devuelve `Result<T, E>` con `E` como unión discriminada; no se lanzan excepciones;
  - todo dato externo (API, QR, JWT, env) se valida con Zod en `infrastructure`.
- **Estilos:** `StyleSheet.create` + tokens del tema. Sin colores ni tamaños sueltos.
- **Accesibilidad:** props ARIA (`role`, `aria-label`) y áreas táctiles de 48 px o más.
- **React Compiler activo:** sin `useMemo`, `useCallback` ni `memo` manuales salvo que una medición lo justifique.
- **Comentarios:** solo el porqué y como máximo una línea.
- **Dependencias:** las de Expo y React Native se instalan con `npx expo install`.

## Tests

- Junto al archivo (`login.ts` → `login.test.ts`).
- Fakes antes que mocks para los puertos.
- Testing Library v14: `render`, `fireEvent` y `userEvent` son async, así que siempre se usa `await`.
- Las consultas van por rol o texto (`getByRole`, `getByText`).
- Cobertura mínima del 90% en `domain` y `application`.

## Git

- **Trunk-based:** `main` siempre estable. Ramas cortas: `feat/F5.4-r360-gateway`, `fix/…`.
- **Commits:** Conventional Commits con el ID de la tarea como scope: `feat(F5.4): adaptador r360`. Uno por tarea, con un mensaje corto y sin línea de coautor.
- **Hooks:**
  - `pre-commit`: lint, formato y tests relacionados (lint-staged) + typecheck;
  - `commit-msg`: commitlint.

## Definition of Done

- [ ] Respeta la arquitectura (`npm run lint` en verde).
- [ ] `npm run typecheck` y `npm test` en verde. El código nuevo de `domain` y `application` tiene tests.
- [ ] Sin `any`, sin `console.log`, sin código comentado, sin textos ni colores sueltos.
- [ ] Comentarios de una línea como máximo.
- [ ] Estados vacío, cargando, error y sin conexión cubiertos (si hay UI).
- [ ] Accesibilidad básica (rol, label, área táctil).
- [ ] Sin datos sensibles en logs (tokens, contraseñas, QR completos).
- [ ] README actualizado si cambió el uso.
