# STACK — Pila por defecto para proyectos React (2026)

> Esta es la pila por defecto cuando no hay restricciones explícitas del usuario. Cada elección está justificada con criterios concretos. No es la única válida — es la más defendible por defecto. Si el usuario impone otra librería, se respeta y se documenta el porqué.

---

## 0. Principio general

- **React 19 estable.** Nada de canary salvo petición explícita.
- **Cero dependencias decorativas.** Cada librería debe justificar su existencia en bundle, mantenimiento y curva.
- **Headless > opinated.** Para UI, primero accesibilidad y composición; el estilo se aplica encima.
- **Estándar web > polyfill.** Si la plataforma ya lo hace (fetch, dialog, popover, view-transitions), no se reemplaza con una librería.
- **Documentación oficial > tutoriales de terceros.** Si la doc oficial dice "haz X", se hace X.

---

## 1. Build / runtime

| Capa | Elección | Justificación |
|---|---|---|
| **Build tool (SPA)** | **Vite 5+** | Estándar de facto para SPA React fuera de meta-frameworks. Dev server con HMR < 50 ms, build con Rollup, plugin ecosystem maduro. Reemplazó a CRA (deprecado por React). |
| **Meta-framework SSR/SSG** | **Next.js (App Router)** o **React Router 7 (framework mode)** | Ver `DECISIONS.md`. Next para SEO/RSC/caching; RR7 para SSR sin la complejidad del caching de Next. |
| **Sitios mayormente estáticos** | **Astro** con islas React | Cero JS por defecto, islas solo donde hay interacción. |
| **Runtime objetivo** | Navegadores evergreen (últimas 2 versiones de Chrome, Firefox, Safari, Edge) | Cubre >95% de tráfico real. Sin IE, sin polyfills heredados. |
| **Node / package manager** | **Node 22 LTS**, **pnpm** (o npm) | pnpm por velocidad, ahorro de disco y workspaces. npm si el equipo prefiere lo de fábrica. **Yarn 1 está EOL** — no se usa en proyecto nuevo. |

---

## 2. Lenguaje

| Capa | Elección | Justificación |
|---|---|---|
| **TypeScript o JavaScript** | TS por defecto en proyectos nuevos | TS captura clases enteras de bugs en compile-time. JS es válido si el usuario lo pide explícitamente (prototipos, equipo sin TS). Esta skill funciona en los dos. |
| **TS config** | `"strict": true`, `"noUncheckedIndexedAccess": true`, `"exactOptionalPropertyTypes": true` | Sin estos flags, TS deja huecos que se sienten como tener tipos pero no tenerlos. |
| **Sin `any` salvo justificado** | Lint rule activa | `unknown` + narrowing es siempre preferible. |

---

## 3. Estado del servidor (data fetching, cache)

| Capa | Elección | Justificación |
|---|---|---|
| **Server state (SPA)** | **TanStack Query v5** | El estándar para cache, retries, dedupe, invalidación, optimistic updates en SPA. Reemplaza el 90% de los usos de Redux para datos del servidor. |
| **Server state (Next.js)** | **Server Components + Server Actions** primero; TanStack Query solo donde haya interactividad cliente real | RSC ya hace fetch + cache de fábrica. Meter TanStack Query encima de RSC suele ser sobreingeniería. |
| **Server state (RR7)** | **`loader` + `action` del framework** | RR7 ya hace el data fetching como parte del routing; no se reemplaza con Query salvo en pantallas muy interactivas. |
| **HTTP client** | **`fetch` nativo** envuelto en helper tipado, o **ky** si quieres ergonomía | Axios no aporta nada que `fetch` no haga ya en evergreen. Ky pesa < 4 KB y tiene retries y hooks. |
| **Validación de respuestas** | **Zod** | Valida lo que entra del servidor en runtime; sin esto, los tipos TS mienten en cuanto el backend cambie. |

---

## 4. Estado del cliente (UI state, forms, navegación)

| Capa | Elección | Justificación |
|---|---|---|
| **Estado local** | `useState`, `useReducer` | Por defecto. El 80% del estado UI vive aquí. |
| **Estado compartido entre pocos componentes** | `useContext` con un proveedor pequeño | Adecuado para tema, locale, usuario actual. **No para datos del servidor.** |
| **Estado global cliente complejo** | **Zustand** (preferido) o **Jotai** | Zustand: API simple, sin boilerplate, < 1 KB. Jotai: para atomic state si el modelo encaja. **Redux Toolkit solo si el equipo ya lo domina y el dominio lo justifica.** |
| **Formularios** | **React Hook Form + Zod** | RHF: rendimiento (re-renders mínimos), API clara. Zod: schema único compartido entre cliente y servidor. |
| **Router (SPA sin meta-framework)** | **React Router 7 (data router)** o **TanStack Router** | RR7 es el camino más documentado. TanStack Router si necesitas type-safe routing extremo. |

---

## 5. UI / accesibilidad

| Capa | Elección | Justificación |
|---|---|---|
| **Primitivas accesibles** | **Radix UI** o **Ark UI** o **React Aria Components** | Headless, accesibles por defecto (WAI-ARIA Authoring Practices), sin estilos. Tú pones el CSS. Radix: más maduro. Ark: agnóstico de framework. React Aria: del equipo de Adobe, rigor de a11y extremo. |
| **Sistema de diseño completo** | **shadcn/ui** (Radix + Tailwind, copiado al repo) o **Mantine** o **Chakra v3** | shadcn si quieres control total del código. Mantine/Chakra si quieres librería instalada con API estable. |
| **Iconos** | **lucide-react** (preferido) o **@radix-ui/react-icons** | Lucide: 1500+ iconos, tree-shakeable, mantenido. |
| **Tablas complejas** | **TanStack Table v8** | Headless table. Sorting, paginación, virtualización, filtros, todo encima de tu markup. |
| **Listas largas** | **TanStack Virtual** | Para listas/grids con > 100 elementos visibles. Sin esto, el DOM se hincha y INP se degrada. |
| **Drag & drop** | **dnd-kit** | Accesible (teclado, screen reader), modular. **react-dnd está prácticamente sin mantenimiento.** |
| **Date pickers** | **react-day-picker** (sobre date-fns) | Headless, a11y. Evita librerías que importan moment o luxon entero. |
| **Charting** | **Recharts** (simple) o **visx** (compositional) o **ECharts** (potente) | Recharts para casos comunes. visx si quieres construir gráficos custom encima de D3. |

---

## 6. Estilado

| Capa | Elección | Justificación |
|---|---|---|
| **Sistema** | **Tailwind CSS v4** (preferido) o **CSS Modules** o **vanilla-extract** | Tailwind: velocidad de iteración, design tokens en el config, purga el CSS no usado. CSS Modules: si el equipo prefiere CSS clásico. vanilla-extract: type-safe CSS-in-TS sin coste runtime. |
| **Animaciones** | **`view-transitions` API** (cuando aplique) + **Motion** (`motion/react`, antes Framer Motion) | View transitions para transiciones entre rutas/estados con CSS. Motion para animaciones declarativas complejas. |
| **NO usar** | styled-components / Emotion (runtime CSS-in-JS) en proyecto nuevo | Coste runtime, hidratación complicada con RSC. Si el equipo viene de ahí, mantener; si empieza de cero, evitar. |

---

## 7. Testing

| Capa | Elección | Justificación |
|---|---|---|
| **Test runner unit/component** | **Vitest** | Compatible con Jest API, integrado con Vite, mucho más rápido. Soporta TS y JSX de fábrica. |
| **Testing library** | **@testing-library/react** | Tests centrados en comportamiento observable (queries por rol, label, texto). El estándar. |
| **User interactions** | **@testing-library/user-event** | Simula eventos reales (clicks, teclado) más fielmente que `fireEvent`. |
| **HTTP mocking** | **MSW (Mock Service Worker)** | Intercepta a nivel de red, mismos handlers para tests y dev. Reemplaza nock/jest.mock para fetch. |
| **E2E** | **Playwright** | Estable, multi-browser, traces y video integrados, autowait. **Cypress es válido**, pero Playwright tiene mejor DX moderno. |
| **Visual regression** | **Playwright** screenshots + **Chromatic** (si usas Storybook) | Chromatic detecta cambios visuales con review humano. |
| **Component sandbox** | **Storybook 8+** | Documentación viva de componentes. A11y addon, interaction tests. |

---

## 8. Linting, formato, calidad

| Capa | Elección | Justificación |
|---|---|---|
| **Linter** | **ESLint 9 (flat config)** con `eslint-plugin-react`, `eslint-plugin-react-hooks`, `@typescript-eslint`, `eslint-plugin-jsx-a11y` | Flat config es el futuro (legacy `.eslintrc` deprecado). `jsx-a11y` captura faltas de accesibilidad básicas. |
| **Formatter** | **Prettier** o **Biome** | Prettier: estándar de facto. Biome: más rápido, formato + lint en una herramienta; aún no tan completo en plugins. |
| **Pre-commit** | **Husky + lint-staged** o **simple-git-hooks** | Bloquea commits con código sin lint/formato. |
| **Type checking en CI** | `tsc --noEmit` en pipeline | Sin esto, los errores TS escapan al runtime. |

---

## 9. Internacionalización (i18n)

| Capa | Elección | Justificación |
|---|---|---|
| **Librería** | **react-i18next** (preferido) o **FormatJS / react-intl** | i18next: ecosistema enorme, plugin-based. FormatJS: estándar ICU, mejor para pluralización compleja. |
| **Fechas/números** | **`Intl.DateTimeFormat`, `Intl.NumberFormat`, `Intl.RelativeTimeFormat`** nativos | Sin moment, sin luxon. La plataforma ya lo hace. **date-fns** solo si necesitas manipulación (add, diff, parse). |

---

## 10. Autenticación

| Capa | Elección | Justificación |
|---|---|---|
| **Next.js** | **Auth.js (NextAuth) v5**, **Clerk**, **Lucia**, **Better Auth** | Auth.js: open source, providers múltiples. Clerk: managed, UI lista. Lucia/Better Auth: si quieres ownership total del flow. |
| **SPA Vite** | **OIDC client genérico** + backend que emita tokens | El backend manda; el cliente solo orquesta login/refresh. |
| **Reglas comunes** | Tokens en cookies `HttpOnly; Secure; SameSite=Lax`, **no** en `localStorage` | localStorage es accesible a JS — vulnerable a XSS. |

---

## 11. Observabilidad cliente

| Capa | Elección | Justificación |
|---|---|---|
| **Errores** | **Sentry** o equivalente | Stack traces source-mapped, breadcrumbs, release tagging. |
| **Web Vitals** | **`web-vitals` library** + envío a tu backend o a Vercel Analytics / SpeedCurve | Sin medir LCP/INP/CLS en producción, optimizar es a ciegas. |
| **Logs estructurados cliente** | JSON con `level`, `event`, contexto mínimo necesario | Sin datos personales en logs cliente. |

---

## 12. Tabla rápida de elecciones por defecto

| Necesidad | Por defecto |
|---|---|
| Build SPA | **Vite + React 19 + TS** |
| Meta-framework | **Next.js App Router** o **RR7 framework** (según `DECISIONS.md`) |
| Sitio estático | **Astro + islas React** |
| Server state | **TanStack Query** (SPA) / **RSC** (Next) / **loaders** (RR7) |
| Client state | **useState/useReducer** → **Zustand** si se necesita global |
| Forms | **React Hook Form + Zod** |
| UI primitives | **Radix / Ark / React Aria** |
| Estilado | **Tailwind v4** |
| Iconos | **lucide-react** |
| Tablas | **TanStack Table** |
| Virtualización | **TanStack Virtual** |
| Tests unit/component | **Vitest + RTL + user-event** |
| HTTP mocking | **MSW** |
| E2E | **Playwright** |
| Linter | **ESLint 9 flat + a11y plugin** |
| Formatter | **Prettier** o **Biome** |
| i18n | **react-i18next** + **Intl.*** nativos |
| Auth (Next) | **Auth.js v5** |
| Errores | **Sentry** |
| Web Vitals | **web-vitals** lib |

---

## 13. Cuándo desviarse del default

Te puedes desviar **solo** si:

1. El usuario lo pide explícitamente.
2. Hay un requisito técnico que el default no cubre (regulación, infra, perf).
3. El equipo ya domina otra herramienta y migrar tiene coste claro sin beneficio.

En cualquiera de los tres casos, **documenta la decisión** en un ADR (`docs/adr/NNNN-elección.md`) con: contexto, alternativas, decisión, consecuencias.

---

## 14. Referencias oficiales

- React: https://react.dev
- Vite: https://vite.dev
- Next.js: https://nextjs.org/docs
- React Router: https://reactrouter.com
- Astro: https://docs.astro.build
- TanStack Query / Table / Router / Virtual: https://tanstack.com
- React Hook Form: https://react-hook-form.com
- Zod: https://zod.dev
- Radix UI: https://www.radix-ui.com
- Ark UI: https://ark-ui.com
- React Aria: https://react-spectrum.adobe.com/react-aria
- Tailwind CSS: https://tailwindcss.com
- Vitest: https://vitest.dev
- Testing Library: https://testing-library.com
- Playwright: https://playwright.dev
- MSW: https://mswjs.io
- Sentry: https://docs.sentry.io
- web-vitals: https://github.com/GoogleChrome/web-vitals
- WCAG 2.2: https://www.w3.org/TR/WCAG22/
