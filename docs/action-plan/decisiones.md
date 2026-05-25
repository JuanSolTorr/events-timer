# Decisiones de arquitectura (ADRs)

> Architecture Decision Records de las decisiones ya tomadas en esta migracion.
> Formato: Titulo, Estado, Contexto, Decision, Consecuencias.
> Una vez registrado, un ADR solo puede ser supersedido por otro ADR (no eliminado).

---

## ADR-001 — Bootstrap 5.3 en lugar de Tailwind CSS 4

**Estado:** Aceptado

**Fecha:** 2026-05-25

**Contexto:**

El legacy usa Bootstrap 5.2 para todos los estilos. La migracion es una reescritura del frontend; el backend y la base de datos no cambian. La prioridad es mantener la paridad funcional con el legacy lo antes posible.

Tailwind CSS 4 es la opcion recomendada para proyectos nuevos con Vite: mejor rendimiento de bundle (solo CSS usado), mejor soporte para temas oscuros y menor acoplamiento a una libreria de componentes. Sin embargo, requiere:
1. Aprender la configuracion de Tailwind 4 (arquitectura CSS nativa, sin config JS).
2. Reescribir todos los estilos del legacy desde cero (no hay equivalencia 1:1 entre clases Bootstrap y clases Tailwind).
3. Mayor tiempo de desarrollo en las vistas CRUD.

**Decision:**

Usar Bootstrap 5.3 para esta migracion. Se instala como paquete npm (`bootstrap@5.3`) y se importa en `main.tsx`. Las clases se migran directamente desde el legacy. Se usa el sistema de `<dialog>` nativo en lugar de los modales de Bootstrap JS para evitar la dependencia del bundle de JavaScript de Bootstrap.

**Consecuencias:**

- Positivas: migracion mas rapida, menor riesgo de divergencia visual con el legacy.
- Negativas: bundle de CSS mas pesado (~20KB gzip), menor flexibilidad para el tema de `TimerView`.
- Deuda creada: migracion a Tailwind en v2 documentada en `tech-debt.md` (Deuda 7).

---

## ADR-002 — React Router 7 con Data API (createBrowserRouter)

**Estado:** Aceptado

**Fecha:** 2026-05-25

**Contexto:**

El legacy usa React Router 6.4 con la API de componentes (`<Routes>`, `<Route>`). React Router 7 introduce mejoras en la Data API (`createBrowserRouter`, `loader`, `action`) que permiten cargar datos antes de renderizar la vista y definir acciones de formulario directamente en la configuracion de la ruta.

El proyecto es una SPA cliente (no SSR), por lo que React Router 7 es compatible con Vite sin modificaciones de infraestructura.

**Decision:**

Usar `createBrowserRouter` de React Router 7 para toda la configuracion de rutas. En la v1 de la migracion, los `loader` y `action` de la Data API son opcionales: la carga de datos se hace con `use(Promise)` + Suspense dentro de los componentes. Los `loader` de React Router se pueden adoptar en v2 si se decide.

`<RouterProvider>` envuelve la app en `main.tsx` despues de `AuthProvider` y `TimerProvider`.

**Consecuencias:**

- Positivas: ruta de actualizacion a funcionalidades avanzadas de React Router 7 (loaders, pending UI) sin cambio de libreria.
- Negativas: la configuracion de rutas con `createBrowserRouter` es mas verbosa que `<Routes>`.

---

## ADR-003 — Sin react-query en v1

**Estado:** Aceptado

**Fecha:** 2026-05-25

**Contexto:**

La app necesita cargar datos del servidor (listas de salas, empresas, categorias, timers) y actualizarlos tras mutaciones (POST, PUT, DELETE). `@tanstack/react-query` resolveria esto con cache automatico, invalidacion tras mutaciones y reintento de peticiones fallidas.

Sin embargo, react-query es una dependencia significativa que introduce su propio modelo mental (QueryClient, QueryClientProvider, useQuery, useMutation) que puede complicar la migracion si el equipo no lo conoce.

**Decision:**

No usar react-query en la v1 de la migracion. Se usa `use(Promise)` + Suspense para la carga inicial. Las mutaciones invalidan los datos forzando un re-montaje del componente (via cambio de `key`) o recargando la promesa manualmente.

La decision se revisara en v2. La deuda esta documentada en `tech-debt.md` (Deuda 6).

**Consecuencias:**

- Positivas: menor complejidad inicial, menos dependencias, migracion mas rapida.
- Negativas: experiencia de usuario degradada cuando hay mutaciones seguidas de vuelta a la lista (datos desactualizados hasta recargar).

---

## ADR-004 — Eliminar la ruta EmpresasEventoTimers (version antigua)

**Estado:** Aceptado

**Fecha:** 2026-05-25

**Contexto:**

El legacy tenia dos componentes para la gestion de asignaciones empresa-sala-timer:
- `EmpresasEventoTimers.js` (ruta `/empresaseventotimers`) — version original, en desuso.
- `EmpresasEventoTimersNew.js` (ruta `/empresastimersnew`) — version activa.

Solo la version `New` estaba vinculada al `Menu` y era accesible desde la UI. La version antigua existia solo en el codigo.

**Decision:**

En la nueva app, solo existe la ruta `/empresastimersnew` con el componente `EmpresasEventoView.tsx`. La ruta antigua no se crea. Cualquier acceso a `/empresaseventotimers` redirige a `/` via el catch-all del router.

**Consecuencias:**

- Positivas: menos codigo que mantener, interfaz mas limpia.
- Negativas: bookmarks o enlaces externos a la ruta antigua dejan de funcionar (impacto minimo, era una ruta de administracion interna).

---

## ADR-005 — React Compiler activado desde el inicio

**Estado:** Aceptado

**Fecha:** 2026-05-25

**Contexto:**

El React Compiler (babel-plugin-react-compiler) analiza el codigo en tiempo de compilacion y anade memoizacion automatica. Esto es especialmente relevante para `TimerView`: el socket emite `timerID` y `envio` cada segundo, lo que causa re-renders. Sin el compilador, todos los componentes hijo de `TimerView` se re-renderizan cada segundo aunque sus props no hayan cambiado.

El compilador exige que el codigo siga las reglas de React (sin mutaciones directas del estado, sin efectos secundarios fuera de hooks). Un proyecto que empieza desde cero con TypeScript strict cumple estas reglas por diseño.

**Decision:**

Activar `babel-plugin-react-compiler` en `vite.config.ts` desde la Fase 1. No usar `useMemo` ni `useCallback` manualmente salvo en casos donde el compilador no pueda inferirlo.

**Consecuencias:**

- Positivas: rendimiento optimo en `TimerView` sin escribir memoizacion manual, codigo mas limpio.
- Negativas: dependencia adicional en dev (`babel-plugin-react-compiler`), posibles mensajes de advertencia del compilador si se violan las reglas de React (actuan como detectores tempranos de bugs, lo cual es positivo).

---

## ADR-006 — No usar React Server Components (SPA cliente en Azure)

**Estado:** Aceptado

**Fecha:** 2026-05-25

**Contexto:**

React 19 estabiliza los React Server Components (RSC). Los RSC permiten renderizar componentes en el servidor, reducir el bundle JS del cliente y hacer fetch de datos sin exponer la capa de servicios al cliente.

Sin embargo:
1. El despliegue es en Azure App Service como SPA estatica (Vite genera `dist/` con archivos estaticos). Los RSC requieren un servidor Node.js que gestione el render (Next.js, Remix, etc.).
2. La funcionalidad critica de la app (countdown en tiempo real via Socket.IO) es inherentemente cliente: los listeners de Socket.IO no pueden vivir en un Server Component.
3. El volumen de datos es pequeno (maximo 48 empresas, 7 salas, ~100 timers). Los beneficios de RSC en rendimiento de carga son marginales.

**Decision:**

No usar RSC. Toda la app es cliente (SPA). Usar `use(Promise)` + Suspense en el cliente para obtener UX similar (estado de carga declarativo) sin necesitar SSR.

**Consecuencias:**

- Positivas: infraestructura simple (archivos estaticos en Azure), sin servidor Node.js adicional, Socket.IO sin restricciones.
- Negativas: el bundle JS del cliente incluye toda la logica de la app (aunque el React Compiler reduce el impacto en runtime).

---

## ADR-007 — Singleton para Socket.IO client

**Estado:** Aceptado

**Fecha:** 2026-05-25

**Contexto:**

El legacy instanciaba el socket en `service.js` de forma que multiples componentes podian crear instancias separadas o suscribir listeners que no se limpiaban correctamente al desmontarse el componente. Esto generaba listeners duplicados y fugas de memoria.

**Decision:**

El socket se instancia una sola vez en `src/services/socketClient.ts` via el patron singleton (`getSocket()` devuelve siempre la misma instancia). Los listeners se montan exclusivamente en `TimerProvider` (en el `useEffect` con cleanup) y en ningun otro lugar de la app.

**Consecuencias:**

- Positivas: sin listeners duplicados, sin fugas de memoria, comportamiento predecible del countdown.
- Negativas: el singleton hace el testing del socket mas complejo (hay que mockear `getSocket()` en los tests).
