---
name: react
description: "Use this skill whenever the user asks to build, scaffold, structure, refactor, or review a React project, component, hook, or feature. Triggers include any mention of 'React', 'React 19', '.jsx', '.tsx', 'Next.js', 'Remix', 'React Router 7', 'Astro with React', 'Vite + React', 'Server Components', 'React Server Actions', 'use client', 'use server', React hooks (useState, useEffect, useTransition, useOptimistic, useActionState, useFormStatus, use, useDeferredValue, useId, useSyncExternalStore), Suspense in React, React form actions, React error boundaries, React performance (memo, useMemo, useCallback, React Compiler), or any request to 'make this in React', 'create a React component', 'set up a React app', 'add React to', or migrate code into React. Use it both for JavaScript (.jsx) and TypeScript (.tsx) React projects — the language preference is independent. Pair with the Senior Frontend Engineer system prompt: this skill provides the React-specific playbook (latest stable React 19, modern patterns, official docs, anti-patterns, decision trees for meta-framework choice, default stack, and quality checklist). Do NOT use this skill for React Native (mobile), Preact, Solid, Vue, Angular, Svelte, or generic JavaScript/TypeScript questions unrelated to React."
license: MIT
---

# React 19 — Engineering Playbook

> Skill complementaria del agente **Senior Frontend Engineer**. Cuando el usuario pide algo en React, este es el manual de cabecera: arquitectura, decisiones, patrones modernos (React 19 estable), stack por defecto, anti-modas y checklist de calidad. Idioma agnóstico: aplica igual a `.jsx` y `.tsx`; la elección JS vs TS la decide la skill de lenguajes o el contexto del proyecto.

---

## 1. Cómo usar esta skill

Cuando el usuario pida algo en React, sigue **siempre** este orden:

1. **Lee primero el bloque de inicio del agente Frontend** (audiencia, tarea, datos, plataforma, restricciones, a11y, performance budget). Si falta, declara supuestos por escrito antes de codear.
2. **Decide el *shape* del proyecto** con `reference/DECISIONS.md` (Vite SPA vs Next.js App Router vs React Router 7 vs Astro). No empieces a teclear sin esto.
3. **Aplica los patrones de React 19** desde `reference/PATTERNS.md`. Si una alternativa moderna resuelve mejor el problema (Server Components, Actions, `use`, `useOptimistic`), úsala con criterio — no por moda.
4. **Usa el stack por defecto** de `reference/STACK.md` salvo que el proyecto ya tenga uno consolidado.
5. **Rechaza los anti-patrones** de `reference/ANTIPATTERNS.md` con la justificación que ahí se da.
6. **Antes de entregar**, valida contra `reference/CHECKLIST.md`.

> **Regla dura de versión:** todo lo que entregues asume **React 19 estable** salvo que el usuario declare explícitamente otra versión. Si el usuario tiene React 18, marca claramente qué piezas requieren upgrade y por qué.

---

## 2. Principios rectores (React-específicos)

Los principios generales (a11y, performance, Clean Code, sistema de diseño) los pone el agente Frontend. Lo que añade React 19:

1. **Server Components por defecto en meta-frameworks.** En Next.js App Router, React Router 7 framework mode, Astro con React: los componentes son **servidor por defecto**. Solo se marca `"use client"` cuando hace falta interactividad o APIs de navegador. Es la decisión más cara de revertir si la equivocas.
2. **Actions y `useActionState` para mutaciones.** Los formularios y mutaciones se modelan con **Server Actions** (`"use server"`) o Client Actions. Reemplaza casi todo el `useState + onSubmit + fetch + setState + handleError` manual.
3. **`use()` para promesas y contexto.** Lee promesas y contextos dentro de render, sin `useEffect`. Combinado con Suspense, simplifica radicalmente la carga de datos en cliente.
4. **Suspense para todo lo asíncrono.** Cargas de datos, *lazy* de componentes, *streaming* SSR — todo pasa por Suspense con *fallbacks* que pertenecen al diseño, no a una excepción.
5. **`useOptimistic` para latencia percibida cero.** Mutaciones que muestran el resultado antes de la confirmación del servidor.
6. **`ref` como prop (sin `forwardRef`).** Componentes funcionales aceptan `ref` directamente en React 19. `forwardRef` queda en código legacy.
7. **Document metadata nativa** (`<title>`, `<meta>`, `<link>`) en cualquier componente. Adiós a `react-helmet` salvo casos avanzados.
8. **Inmutabilidad de estado.** Nunca mutas; siempre devuelves nuevo valor. El render se decide por identidad de referencia.
9. **Estado del servidor en una caché especializada** (TanStack Query / SWR) — *no* en `useState` ni en estado global ad-hoc, *no* en `useEffect` con `fetch`.
10. **Estado de URL en la URL.** Filtros, tabs navegables, paginación: `useSearchParams` o equivalentes. La URL es estado serializable y compartible.
11. **Estados imposibles, imposibles.** Modela con uniones discriminadas (`{ status: 'idle' } | { status: 'loading' } | { status: 'error', error } | { status: 'success', data }`), no con tres booleanos sueltos.
12. **JS o TS, da igual a esta skill.** La calidad estructural se aplica igual. La elección del lenguaje la marca la skill de lenguajes o el contexto.

---

## 3. Flujo de decisión rápido

Cuando llega una petición, responde mentalmente a estas preguntas antes de codear:

1. **¿Es un proyecto nuevo o trabajamos sobre uno existente?** Si existe, respeta sus convenciones aunque no sean tus favoritas; solo propones cambio si hay dolor medible.
2. **¿SPA o necesita SSR/SSG?** SEO crítico, *time-to-content* importante, contenido dinámico cacheable → meta-framework. App detrás de login sin SEO → Vite SPA está perfecto.
3. **¿Cuántos consumidores y qué experiencia?** Producto consumer público → Next.js o Astro. Dashboard interno B2B → Vite SPA o React Router 7. Sitio mayormente estático con islas interactivas → Astro.
4. **¿Estado del servidor presente?** Si hay API/BD detrás (lo normal), TanStack Query desde el día 1. Si es totalmente estático, nada.
5. **¿Formularios complejos?** React Hook Form + Zod. Si son Server Actions de Next, `useActionState` puede bastar para los simples.
6. **¿Sistema de diseño?** Si ya hay, respétalo. Si hay que partir de cero, *headless* (Radix UI, Ark UI, Headless UI, React Aria Components) + tokens propios > librería pesada.

Detalle expandido y árbol con criterios en `references/DECISIONS.md`.

---

## 4. Lo que SÍ usar (React 19 estable)

| Necesidad | Solución React 19 | Notas |
|---|---|---|
| Componente que solo renderiza (sin estado/efectos cliente) en meta-framework | **Server Component** (por defecto en App Router / RR7 framework mode / Astro) | Cero JS al cliente. La opción más barata. |
| Componente con interacción de usuario | Client Component con `"use client"` arriba del archivo | Solo lo necesario; mantén el árbol *server* lo más amplio posible. |
| Mutación (formulario, botón "borrar", etc.) | **Server Action** (`"use server"`) + `<form action={fn}>` + `useActionState` + `useFormStatus` | Funciona con JS desactivado en meta-frameworks que lo soporten. |
| Mutación cliente sin servidor | Client Action con `useTransition` + `useOptimistic` | UI optimista, *pending state* nativo. |
| Cargar datos en Server Component | `await fetch(...)` directo (o cliente de BD/ORM) | Sin librería extra. Caché del framework. |
| Cargar datos en Client Component | **TanStack Query** | Caché, revalidación, *retries*, *invalidation*, *prefetch*. |
| Leer promesa o contexto en render | `use(promise)` o `use(context)` | Sirve dentro de condicionales (a diferencia de `useContext`). |
| Forms con validación | **React Hook Form + Zod** (o **Valibot**) | Resolver de zod incluido; valida cliente y servidor con el mismo schema. |
| Suspense para datos / lazy | `<Suspense fallback={...}>` envolviendo Server Component o `use()` cliente | Acompañar con `<ErrorBoundary>`. |
| Errores en árbol | `<ErrorBoundary>` (de `react-error-boundary` o nativo de framework) | En cliente. En servidor, los frameworks tienen sus *error files*. |
| Concurrencia y prioridad | `useTransition` para actualizaciones no urgentes, `useDeferredValue` para inputs caros | Mantén INP ≤ 200 ms. |
| Pasar `ref` a componente funcional | `ref` como prop directamente (sin `forwardRef`) | React 19 deprecia `forwardRef` para nuevos componentes. |
| Metadata de documento | `<title>`, `<meta>`, `<link>` en cualquier componente | Reemplaza `react-helmet` en casi todo. |
| Stylesheets con prioridad | `<link rel="stylesheet" href=... precedence=... />` | React 19 ordena por `precedence`. |
| Scripts externos | `<script async src=... />` con dedup automática | React 19 deduplica por `src`. |
| Estado UI compartido | **Zustand** (ligero) o Context (con cuidado) | Redux solo si ya está; nada nuevo en 2026 lo justifica salvo equipo masivo. |
| Routing en SPA | **React Router 7** (data mode o framework mode) o **TanStack Router** | TanStack Router brilla con TS estricto. |
| Routing en meta-framework | El del meta-framework (Next App Router, RR7 framework, etc.) | No mezcles. |
| Componentes accesibles base | **Radix UI**, **Ark UI**, **Headless UI**, **React Aria Components** | Headless + tu CSS > librería visual pesada. |
| Testing unitario / componente | **Vitest** + **React Testing Library** + **MSW** | Query por rol/label, no por clase. |
| E2E | **Playwright** | Auto-waiting, paralelización, traces. |
| A11y automatizada | `@axe-core/playwright`, `eslint-plugin-jsx-a11y` | Complementa con test manual con lector de pantalla. |

Detalle de patrones con ejemplos en `references/PATTERNS.md`. Stack completo con justificación en `references/STACK.md`.

---

## 5. Lo que NO usar (y por qué)

Resumen — detalle con justificación en `references/ANTIPATTERNS.md`:

- **`useEffect` para *fetch* de datos al montar.** Es el anti-patrón documentado por el equipo de React. Usa TanStack Query, `use()` con Suspense, o Server Components con `await`.
- **Redux para casi todo.** Estado servidor a TanStack Query, estado UI a Zustand o Context acotado. Redux solo si ya está en el proyecto.
- **`forwardRef` en componentes nuevos.** `ref` es prop normal en React 19.
- **`useMemo` / `useCallback` profilácticos** sin haber medido. Más coste que beneficio en la mayoría de casos. **React Compiler** (cuando estabilice) los hace innecesarios.
- **Class components** salvo `ErrorBoundary` nativo (y existe alternativa funcional vía librería).
- **`"use client"` en la raíz del árbol.** Pierdes toda la ventaja de Server Components. Marca solo las hojas interactivas.
- **`fetch` en cliente sin caché.** TanStack Query existe por una razón.
- **`document.querySelector` y manipulación directa del DOM.** Eso es React mal usado.
- **`dangerouslySetInnerHTML`** con input no saneado (XSS).
- **CSS-in-JS de runtime pesado** (styled-components, Emotion classic) en proyectos nuevos. Tailwind, CSS Modules, vanilla-extract, Panda CSS o CSS plano rinden mejor.
- **Iconos sin etiqueta accesible.** Si es decorativo, `aria-hidden="true"`; si es funcional, `aria-label` o texto adyacente.
- **Selectores `data-testid` por defecto.** Primero rol/label/text accesible; `data-testid` solo cuando el contenido es dinámico o frágil.
- **`localStorage` para tokens de sesión.** Riesgo XSS. Cookies `HttpOnly` + `Secure` + `SameSite`.
- **Carruseles automáticos en hero.** Métricas conocidas: el usuario solo ve la primera slide.
- **Hidratación completa de páginas casi estáticas.** Considera Astro o RSC.
- **Mezclar router de meta-framework con React Router en el mismo árbol.** Confusión garantizada.

---

## 6. Calidad de código (React-específico)

Las reglas generales de Clean Code las pone el agente Frontend. Lo que añade React:

- **Componentes pequeños y enfocados.** Un componente, una responsabilidad. Si el archivo pasa de ~200 líneas, sospecha.
- **Props mínimas y tipadas.** Si usas TypeScript, sin `any` salvo justificación. Sin booleanos crípticos (`isOpen` sí; `flag` no).
- **Composición sobre configuración.** `children`, `slots` y *render props* antes que un componente con 30 props.
- **Separa lógica de UI con hooks.** Si un componente tiene 80 líneas de hooks y 20 de JSX, extrae a hook propio (`useX`).
- **Hooks personalizados siguen las reglas de React.** Empiezan por `use`, llaman a otros hooks en el top-level, no en condicionales.
- **Dependencias de hooks completas.** No silencies `react-hooks/exhaustive-deps` salvo casos justificados y documentados.
- **Side effects sólo en `useEffect` cuando hay sincronización real con un sistema externo.** No para "ejecutar cosas al montar"; eso lo decide el padre con props.
- **Keys estables y únicas** en listas (NO el índice salvo lista verdaderamente estática).
- **Eventos: `onSomething` en consumidor, `handleSomething` en handler.** Convención uniforme.
- **Boolean props sin defaults peligrosos** (`disabled={true}` mejor que un default oculto).
- **Errores explícitos.** *ErrorBoundary* obligatorio en raíces de feature. Manejo de error en queries y actions, sin tragar excepciones.
- **Carpeta por feature/dominio**, no por tipo (`components/`, `hooks/`, `utils/`) en proyectos > 30 archivos. Reduce *navegación lateral*.
- **`React Compiler`** (cuando esté GA): elimina la necesidad de `memo`/`useMemo`/`useCallback` profilácticos. Hasta entonces, mide antes de optimizar.

---

## 7. Performance — números, no opiniones

Hereda los objetivos del agente Frontend (LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1). Lo que añade React 19:

- **Mueve trabajo a servidor** cuando puedas (RSC). Cada KB de JS que no envías al cliente es una victoria.
- **`useTransition`** para actualizaciones que pueden esperar (filtros, búsquedas mientras escribes).
- **`useDeferredValue`** para no bloquear la entrada del usuario por cálculos derivados caros.
- **Suspense + streaming SSR** en meta-frameworks para que el LCP no espere al endpoint más lento.
- **Code splitting**: `React.lazy` + Suspense en cliente; en meta-frameworks suele ser automático por ruta.
- **Imágenes**: `next/image` (Next), `<Image>` (Astro/RR7 framework) o `<picture>` con `srcset/sizes`, `width`/`height` siempre, `loading="lazy"` debajo del pliegue.
- **Fuentes**: `next/font` en Next, o `font-display: swap` + `preload` con `crossorigin`. Máximo 2 familias, 4 weights reales.
- **Evita re-renders innecesarios** con composición correcta (mover estado al hijo que lo usa) antes de meter `memo`.
- **No optimices a ciegas.** Mide con React DevTools Profiler, Lighthouse CI, web-vitals RUM. Sin medida, no hay optimización.

---

## 8. Accesibilidad (WCAG 2.2 AA mínimo)

Hereda checklist completo del agente Frontend. En React específicamente:

- **HTML semántico real**: `<button>` para acciones, `<a href>` para navegación, `<form>` con `<label for>`. Nada de `<div onClick>`.
- **Foco visible siempre** (`:focus-visible`), nunca `outline: none` sin reemplazo accesible.
- **`useId`** para asociar `<label htmlFor>` con `<input id>` cuando el id se genera dinámicamente.
- **Componentes ARIA**: usa **Radix UI**, **React Aria Components** o **Ark UI** en lugar de reinventar combobox/dialog/menu. Cumplen WAI-ARIA APG.
- **Suspense fallbacks** son visibles para screen readers: usa `aria-busy` o `role="status"` con texto, no solo un spinner mudo.
- **Form Actions y pending state**: `useFormStatus` da `pending` — anúncialo con `aria-live="polite"` o `aria-busy` para usuarios de lectores.
- **Errores de validación** con `aria-describedby` y `aria-invalid` en el input, no solo borde rojo.
- **Skip links** en cabeceras complejas.
- **`prefers-reduced-motion`** respetado en animaciones y transiciones.
- **Tests automatizados con `@axe-core/playwright`** + revisión manual con NVDA/VoiceOver de flujos críticos.
- **Lint**: `eslint-plugin-jsx-a11y` activado en CI.

---

## 9. Seguridad mínima (apoya al agente Security)

- **Output encoding** lo hace React por defecto. **Nunca** uses `dangerouslySetInnerHTML` con input no saneado. Si necesitas HTML controlado, sanea con **DOMPurify**.
- **`target="_blank"` con `rel="noopener noreferrer"` siempre.**
- **CSP estricta** desde el meta-framework (`next.config.js`, headers, etc.). Sin `unsafe-inline` ni `unsafe-eval`.
- **Tokens y secretos JAMÁS en cliente.** Server Actions y endpoints de servidor llevan la sesión. Si necesitas autenticación cliente, cookies `HttpOnly` + `Secure` + `SameSite`.
- **Variables de entorno cliente** (`NEXT_PUBLIC_*`, `VITE_*`) son **públicas**. Nunca metas claves de API privadas ahí.
- **Validación con Zod en frontera servidor** — el cliente miente. Las Server Actions y los route handlers validan input siempre.
- **CSRF**: en Server Actions de Next, el framework protege. En endpoints custom, tokens o `SameSite=Lax/Strict`.
- **CSP nonces** vía meta-framework cuando uses scripts dinámicos.
- **Dependencias auditadas**: `npm audit`, `pnpm audit`, Snyk, Dependabot. Lockfile commited.

---

## 10. Idioma del código (JS o TS)

Esta skill es **agnóstica del lenguaje**. Aplica igual a `.jsx` y `.tsx`. Reglas mínimas si TypeScript está activo:

- `"strict": true` en `tsconfig.json` (incluye `strictNullChecks`, `noImplicitAny`).
- Tipa props explícitamente. Para componentes con `children`: `{ children: React.ReactNode }`.
- `as const` y uniones discriminadas para modelar estados.
- Evita `any`. Si lo usas, comenta por qué.
- Evita `React.FC` (no aporta y rompe `children` implícito en versiones antiguas).
- Si la skill de lenguajes está activa, ella manda en convenciones, naming y configuración fina. Si no, sigue estas mínimas.

---

## 11. Estructura de archivos por defecto

### Vite SPA (interno / dashboard B2B)

```
src/
  main.{jsx,tsx}              # entry
  app/
    routes.{jsx,tsx}          # React Router 7 (data mode) o TanStack Router
    providers.{jsx,tsx}       # QueryClientProvider, theme, i18n
  features/                   # carpeta por dominio
    orders/
      OrdersPage.{jsx,tsx}
      OrdersTable.{jsx,tsx}
      useOrders.{js,ts}       # hook que envuelve queries
      api.{js,ts}
      types.ts (si TS)
  shared/
    ui/                       # componentes del sistema de diseño
    lib/                      # utilidades genéricas
    hooks/                    # hooks compartidos
  styles/
    tokens.css
    global.css
```

### Next.js App Router (consumer / SEO crítico)

```
app/
  layout.tsx                  # root layout (RSC)
  page.tsx                    # home (RSC)
  (marketing)/                # route group
    pricing/page.tsx
  (app)/                      # área autenticada
    layout.tsx                # protege con auth
    dashboard/
      page.tsx                # RSC
      OrdersList.tsx          # RSC que carga datos
      OrdersClient.tsx        # "use client" — interactivo
  api/                        # route handlers (cuando hace falta)
components/                   # shared UI
lib/                          # server-only utilities
```

### React Router 7 (framework mode)

```
app/
  root.tsx
  routes/
    _index.tsx                # /
    orders.tsx                # loader + action + componente
    orders.$id.tsx
  components/
  lib/
```

### Astro con islas React

```
src/
  pages/
    index.astro               # estático
    dashboard.astro           # contiene <ReactIsland client:idle />
  components/
    ReactIsland.tsx           # solo se hidrata cuando el directive lo dice
  layouts/
```

---

## 12. Checklist de entrega — antes de cerrar cualquier trabajo en React

- [ ] **Decisión de meta-framework justificada** (no por moda).
- [ ] **Server Components donde tiene sentido**; `"use client"` solo en hojas interactivas.
- [ ] **Server Actions** o Client Actions con `useActionState` para mutaciones; cero fetches manuales con `useState` + `useEffect` para datos.
- [ ] **TanStack Query** (o `use()`/RSC) para todos los datos servidor.
- [ ] **Estado UI** local o Zustand; **estado URL** en URL.
- [ ] **Suspense + ErrorBoundary** envolviendo cargas asíncronas.
- [ ] **Forms** con React Hook Form + Zod, o `useActionState` con validación servidor.
- [ ] **Componentes accesibles**: foco visible, etiquetas, roles, `useId`, lectores probados.
- [ ] **Lint** con `eslint-plugin-react-hooks` y `eslint-plugin-jsx-a11y` en CI.
- [ ] **Tests**: Vitest + RTL para componentes; Playwright para flujos críticos; axe en CI.
- [ ] **Performance**: bundle por ruta dentro del presupuesto (200 KB JS comprimido por defecto), imágenes optimizadas, fuentes con `font-display: swap`, sin layout shifts.
- [ ] **A11y**: WCAG 2.2 AA verificado (automatizado + manual del flujo crítico).
- [ ] **Seguridad**: sin secretos en cliente, output encoding por defecto, CSP estricta, deps auditadas.
- [ ] **Estructura por feature**, nombres consistentes, README de la feature si es no trivial.
- [ ] **Documentación**: README con quick start, scripts npm declarados, decisiones relevantes como ADR breve.

---

## 13. Documentación oficial y referencias canónicas — cita la fuente

Cuando hagas una recomendación, **cita la fuente**. Prioriza:

1. **react.dev** — documentación oficial de React 19. Es la verdad.
2. **nextjs.org/docs** — Next.js (App Router + Server Components + Actions).
3. **reactrouter.com** — React Router 7 (data y framework mode).
4. **docs.astro.build** — Astro (integración React + islas).
5. **vitejs.dev** — Vite.
6. **tanstack.com** — TanStack Query, TanStack Router.
7. **react-hook-form.com** + **zod.dev** — forms y validación.
8. **radix-ui.com** / **ark-ui.com** / **react-spectrum.adobe.com/react-aria** — componentes accesibles.
9. **MDN Web Docs** — HTML, CSS, Web APIs, DOM, accesibilidad.
10. **WAI-ARIA APG** — patrones de componentes accesibles.
11. **web.dev** — Core Web Vitals, performance, accesibilidad.
12. **WCAG 2.2** — accesibilidad.
13. **TypeScript Handbook** (typescriptlang.org/docs/handbook) si TS está activo.
14. **vitest.dev**, **testing-library.com**, **playwright.dev** — testing.

**No inventes URLs.** Si dudas, escribe la ruta: *"react.dev → Reference → Hooks → useActionState"*, *"Next.js Docs → App Router → Data Fetching → Caching"*.

---

## 14. Cierre

Cada propuesta o entrega en React termina con tres preguntas (las hereda el agente Frontend, esta skill solo afina):

1. **¿La elección de meta-framework (o Vite) encaja con tu SEO, time-to-content y equipo?**
2. **¿Prefieres profundizar en Server Components, Server Actions, estrategia de testing, sistema de componentes accesibles o performance budget?**
3. **¿La estructura de carpetas propuesta funciona con vuestras convenciones, o adapto?**

---

## 15. Mantenimiento de esta skill

- **Versión React objetivo:** 19 estable. Cuando React 20 sea estable y mayoritario, actualizar.
- **React Compiler:** mover a "lo que SÍ usar" cuando esté GA.
- **Revisión recomendada:** semestral, o ante release mayor de React, Next.js, React Router o cambio de prácticas oficiales en react.dev.
- **Cambios en references/*.md** no requieren tocar este SKILL.md salvo que cambie el propósito o el trigger.
