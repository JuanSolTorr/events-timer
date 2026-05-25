# CHECKLIST — Lista de entrega para proyectos React

> Marca antes de dar por terminado un proyecto, una feature o una PR significativa. Si algo no aplica, justifícalo por escrito; no lo saltes en silencio.

---

## 1. Arquitectura y decisiones

- [ ] Elegido el *shape* del proyecto siguiendo `DECISIONS.md` (Vite SPA / Next / RR7 / Astro) y documentado el porqué.
- [ ] Stack alineado con `STACK.md`. Cualquier desviación tiene su ADR (`docs/adr/NNNN-*.md`).
- [ ] React 19 estable. Sin canary/experimental salvo justificación explícita.
- [ ] TypeScript con `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` (si TS).
- [ ] Estructura de carpetas clara (features / domains / shared, no archivos huérfanos).

## 2. Datos y estado

- [ ] **Server state** no se gestiona con `useEffect` + `useState`. Usa TanStack Query, RSC, o loaders del router.
- [ ] **Client state** local primero (`useState`/`useReducer`); global solo si hace falta (Zustand/Jotai).
- [ ] Validación runtime de respuestas del servidor con Zod (o equivalente).
- [ ] Sin race conditions: cambios rápidos de input usan abort o cliente con dedupe.
- [ ] Estado derivado se calcula en el render, no se duplica en `useState`.

## 3. Componentes y código

- [ ] Sin `forwardRef` (React 19 ya pasa `ref` como prop).
- [ ] Sin memoización prematura (`useMemo`/`useCallback`/`React.memo` solo donde el perfilado lo justifica).
- [ ] Composición sobre props de configuración para componentes con muchas variantes.
- [ ] Sin mutación directa de estado o props.
- [ ] `key` estables en listas (id del dato, no índice salvo lista inmutable).
- [ ] Sin lógica que cambia estado durante el render.
- [ ] Sin `dangerouslySetInnerHTML` con contenido no sanitizado.
- [ ] Sin `any` en TS sin comentario justificándolo.

## 4. Formularios

- [ ] React Hook Form + Zod (o Server Action + `useActionState` en Next).
- [ ] Schema único compartido cliente/servidor.
- [ ] Validación tanto en cliente (UX) como en servidor (seguridad).
- [ ] Mensajes de error claros, asociados al input con `aria-describedby`.
- [ ] Estados `pending`/`error`/`success` visibles al usuario.

## 5. Accesibilidad (WCAG 2.2 AA)

- [ ] Cada `<input>` tiene un `<label>` asociado (`htmlFor`/`id` o `useId`).
- [ ] Contraste de texto ≥ 4.5:1 (≥ 3:1 para texto grande). Comprobado.
- [ ] Todo navegable por teclado: `Tab` recorre, `Esc` cierra modales, `Enter`/`Space` activan.
- [ ] Focus visible en todos los elementos interactivos.
- [ ] Roles ARIA correctos (usar primitivas de Radix/Ark/React Aria reduce este riesgo casi a cero).
- [ ] Touch targets ≥ 24×24 px (WCAG 2.2).
- [ ] Anuncios `aria-live` para cambios dinámicos importantes (notificaciones, errores, navegación SPA).
- [ ] Imágenes con `alt` (vacío si decorativas).
- [ ] Auditoría con axe DevTools o lighthouse sin errores críticos.

## 6. Rendimiento (Core Web Vitals)

- [ ] **LCP** ≤ 2.5 s en p75 móvil.
- [ ] **INP** ≤ 200 ms en p75.
- [ ] **CLS** ≤ 0.1.
- [ ] Imágenes con `width`/`height` o `aspect-ratio`.
- [ ] Imágenes optimizadas (formato moderno: AVIF/WebP, `loading="lazy"` debajo del fold).
- [ ] Code splitting por ruta. Bundles del entry < 200 KB gzip (objetivo, no dogma).
- [ ] Listas largas virtualizadas (TanStack Virtual) si > 100 items visibles.
- [ ] Sin librerías pesadas innecesarias (no moment, no lodash entero, no CSS-in-JS runtime salvo justificado).
- [ ] Streaming SSR con Suspense en meta-frameworks cuando hay datos lentos.

## 7. Seguridad cliente

- [ ] Tokens de auth en cookies `HttpOnly; Secure; SameSite=Lax`, no en `localStorage`.
- [ ] Sanitización de HTML externo (markdown, CMS) antes de renderizar.
- [ ] CSP configurada en el backend (la cumple el cliente; sin `unsafe-inline` si se puede evitar).
- [ ] Sin secrets/claves API en el código cliente.
- [ ] Validación de inputs siempre también en servidor.
- [ ] Dependencias auditadas (`npm audit`, `pnpm audit`).

## 8. Internacionalización

- [ ] Strings extraídos a archivos de mensajes si la app es multi-locale.
- [ ] Fechas/números con `Intl.*` nativos (no librerías pesadas para esto).
- [ ] RTL probado si los idiomas objetivo lo requieren.
- [ ] Pluralización correcta (no `${n} item${n === 1 ? '' : 's'}`).

## 9. Testing

- [ ] Tests unit/component con Vitest + Testing Library + user-event.
- [ ] HTTP mockeado con MSW (mismos handlers en tests y dev).
- [ ] Tests centrados en comportamiento observable (queries por rol, label, texto), no en HTML interno.
- [ ] Tests críticos E2E con Playwright (login, flujo principal, pago).
- [ ] Sin tests flakies en CI (objetivo: 0). Si los hay, marcados y arreglados, no skipped.
- [ ] Cobertura informada (no como objetivo en sí, pero medida).

## 10. Calidad y CI

- [ ] ESLint 9 flat config con `react-hooks` y `jsx-a11y` activos. CI bloquea si falla.
- [ ] Prettier o Biome con regla compartida. CI bloquea si falla.
- [ ] `tsc --noEmit` en CI.
- [ ] Tests obligatorios en CI antes de merge.
- [ ] Pre-commit hook (Husky/simple-git-hooks) bloqueando commits sin lint/formato.

## 11. Observabilidad

- [ ] Errores capturados con Sentry (o equivalente) y source maps subidos.
- [ ] Web Vitals enviados a backend o servicio (`web-vitals` lib).
- [ ] Logs cliente sin datos personales sensibles.

## 12. Despliegue

- [ ] Variables de entorno separadas por entorno (dev/staging/prod).
- [ ] Sin `console.log` ni código de debug en build de producción.
- [ ] Build reproducible (lockfile commiteado).
- [ ] Pipeline CI/CD: install → lint → typecheck → test → build → deploy.
- [ ] Rollback documentado y probado al menos una vez.

## 13. Documentación

- [ ] README con: cómo arrancar, scripts disponibles, estructura, decisiones clave.
- [ ] ADRs para decisiones no triviales.
- [ ] Componentes de UI documentados (Storybook o equivalente) si hay sistema de diseño.
- [ ] Onboarding posible en < 1 hora para un dev nuevo del equipo.

## 14. Gobernanza y mantenimiento

- [ ] Dependencias en versiones soportadas (no React < 18, no librerías abandonadas).
- [ ] Plan de actualización: quién, cuándo, con qué frecuencia se revisan deps.
- [ ] CODEOWNERS configurado si el repo tiene múltiples áreas.
- [ ] Política de soporte de navegadores explícita en el README.

---

## Cierre

Cuando los 14 bloques están marcados o justificados, la entrega está en condiciones. Si alguno no aplica, escríbelo (no lo escondas): la trazabilidad de decisiones vale tanto como las decisiones mismas.
