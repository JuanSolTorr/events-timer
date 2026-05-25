# Reparto de fases entre 3 desarrolladores — events-timer

> Documento operativo. Cada dev lo usa como su hoja de ruta personal.
> Fecha: 2026-05-25
> Decisiones de estilo que cambian respecto al plan original: **Tailwind CSS 4** reemplaza Bootstrap 5.3 — ver ADR-008 en `decisiones.md`.

---

## 0. Principio de reparto

Las fases 0-1-2-3 son el cuello de botella: son secuenciales y bloquean todo lo demás. Una vez que la Fase 3 está cerrada, las Fases 4, 5 y 6 se pueden paralelizar entre los tres devs.

```
Fase 0 → Fase 1 → Fase 2 → Fase 3 ─┬─ Fase 4  (Dev A)
                                     ├─ Fase 5  (Dev B)
                                     └─ Fase 6  (Dev C, arranca en paralelo con 4 y 5)
```

El tramo 0-3 lo ejecuta **un solo dev** (Dev A) para evitar conflictos en la infra base. Los demás pueden leer la documentación de auditoría (Fase 0) en paralelo mientras Dev A monta la infra.

---

## 1. Asignación por desarrollador

### Dev A — Fundamentos + CRUD

**Fases:** 0, 1, 2, 3, 4

**Rama:** `feature/infra-crud`

**Orden de ejecución:**

| Paso | Fase | Descripción |
|---|---|---|
| 1 | 0 | Leer los 5 docs de `docs auditoria/` y DOCUMENTACION-COMPLETA.md |
| 2 | 1 | Setup Vite + TS strict + Tailwind 4 + React Compiler + ESLint + estructura de carpetas + env |
| 3 | 2 | `src/types/index.ts` + `apiService.ts` + `socketClient.ts` (singleton) |
| 4 | 3 | `AuthContext` + `TimerContext`; Socket instanciado una sola vez en TimerProvider |
| 5 | 4 | 6 vistas CRUD: Login, Salas, Empresas, Categorias, Temporizadores, EmpresasEventoView |

**Qué necesita para empezar:** Nada externo — es el primer dev en arrancar.

**Qué produce para los demás:**

- Tag `v0.3-contextos` mergeado a `main`: señal de salida para Dev B y Dev C.
- `src/types/index.ts` exportado y estable: todos los tipos de dominio (`Sala`, `Empresa`, `Categoria`, `Timer`, `TimerEvento`, `LoginCredentials`, etc.).
- `src/services/socketClient.ts` con `getSocket()` y `disconnectSocket()`.
- `src/services/apiService.ts` con todos los métodos del legacy.
- `useAuth()` y `useTimerState()` disponibles desde cualquier componente.
- `src/config/env.ts` con `config.apiUrl` y `config.socketUrl`.

**Agentes de Claude Code recomendados:**

| Agente | Para qué tarea |
|---|---|
| `senior-architect-agent` | Confirmar la estructura de carpetas y las decisiones de Tailwind 4 en Fase 1 |
| `senior-frontend-agent` | Implementar contextos, hooks y las 6 vistas CRUD con React 19 (useActionState, useFormStatus) |
| `code-quality` | Revisar `src/types/index.ts` y `src/services/` antes del tag `v0.3-contextos` |

**Criterio de salida para pasar el testigo:**

```bash
git tag v0.3-contextos
git push origin feature/infra-crud
# abrir PR → main, pedir review antes de merge
```

Dev B y Dev C no arrancan su trabajo hasta que el PR de `feature/infra-crud` esté mergeado a `main` con el tag `v0.3-contextos`.

---

### Dev B — Vista pública del countdown (TimerView + Horario)

**Fases:** 5

**Rama:** `feature/timer-view`

**Orden de ejecución:**

| Paso | Tarea |
|---|---|
| 1 | Pull de `main` tras merge de `feature/infra-crud` |
| 2 | Crear `src/utils/formatTime.ts` (función pura, testeable) |
| 3 | Crear `src/components/Tiempo.tsx` (display puro, color rojo al minuto) |
| 4 | Implementar `src/views/TimerView.tsx`: escucha `timerID` + `envio`, selector de sala, logo empresa + countdown |
| 5 | Implementar `src/views/HorarioView.tsx`: agenda de timers por sala |
| 6 | Verificar que `secondsRemaining <= 60` activa el color rojo en `Tiempo` |
| 7 | `npm run build` pasa; countdown en tiempo real confirmado manualmente contra el sync server de testing |

**Qué necesita antes de arrancar:**

- `main` con tag `v0.3-contextos` (PR de Dev A mergeado).
- `useTimerState()` disponible y sin errores TypeScript.
- `src/services/apiService.ts` con `getSalas()`, `getTimersEventos()`, `findTimersActualesEmpresa()`.
- `src/utils/timezone.ts` con `parseTimerInicio` y `ahora()` (producido por Dev A en Fase 2).

**Tiempo de espera estimado hasta poder arrancar:** igual a la duración de las Fases 0-3 de Dev A (aprox. 3.5 jornadas según estimaciones del plan).

**Agentes de Claude Code recomendados:**

| Agente | Para qué tarea |
|---|---|
| `senior-frontend-agent` | Implementar TimerView, Tiempo, HorarioView con Socket.IO y React 19 |
| `code-quality` | Revisar que `Tiempo.tsx` es un componente puro y que no hay lógica de negocio en el display |

---

### Dev C — Calidad, tests y producción

**Fases:** 6

**Rama:** `feature/calidad`

**Orden de ejecución:**

| Paso | Tarea |
|---|---|
| 1 | Pull de `main` tras merge de `feature/infra-crud` |
| 2 | Configurar Vitest 3.x + `@testing-library/react` + `jsdom` en `vite.config.ts` |
| 3 | Escribir tests unitarios para `src/utils/formatTime.ts` (casos: 0s, negativo, >3599s, valor normal) |
| 4 | Escribir tests unitarios para `src/utils/timezone.ts` |
| 5 | Escribir tests de integración para `src/services/apiService.ts` (mock axios) |
| 6 | Escribir tests para `src/services/socketClient.ts` (mock `getSocket()`) |
| 7 | Alcanzar cobertura > 60% en `src/utils/` y `src/services/` |
| 8 | Ejecutar Lighthouse en `/` y `/categorias`; resolver issues de A11y hasta > 85 |
| 9 | `npm run lint` sin advertencias; `npm run build` sin warnings de Vite |

**Nota:** Dev C puede empezar la configuración de Vitest (Paso 2) y los tests de utils (Pasos 3-4) en paralelo desde el momento en que `feature/infra-crud` está mergeado, sin esperar a Dev B. Los tests de servicios (Pasos 5-6) solo necesitan `src/services/` que ya viene en el merge de Dev A. Los tests de componentes avanzados (TimerView, Tiempo) se escriben después del merge de Dev B.

**Qué necesita antes de arrancar los pasos 3-6:**

- `main` con tag `v0.3-contextos` (PR de Dev A mergeado).

**Qué necesita para los pasos finales (Lighthouse, tests de TimerView):**

- PR de Dev B mergeado a `main` (`feature/timer-view`).

**Agentes de Claude Code recomendados:**

| Agente | Para qué tarea |
|---|---|
| `code-quality` | Revisar los tests antes de hacer PR: estructura AAA, nombres descriptivos, cobertura real |
| `senior-frontend-agent` | Resolver issues de Lighthouse A11y (atributos ARIA, roles, contraste) |

---

## 2. Diagrama de dependencias y paralelismo

```
Jornada 1-2  Dev A: Fase 0 (auditoría) + Fase 1 (infra Tailwind 4)
             Dev B: Lee docs auditoria/ en paralelo (sin comprometer código)
             Dev C: Lee docs auditoria/ en paralelo (sin comprometer código)

Jornada 2-3  Dev A: Fase 2 (servicios) + Fase 3 (contextos)
             Dev B: espera
             Dev C: espera

Jornada 3    MERGE: feature/infra-crud → main   ← PUNTO DE DESBLOQUEO
             git tag v0.3-contextos

Jornada 3-6  Dev A: Fase 4 (6 vistas CRUD)       rama: feature/infra-crud
             Dev B: Fase 5 (TimerView + Horario)  rama: feature/timer-view
             Dev C: Fase 6 (Vitest + A11y)        rama: feature/calidad

Jornada 6    MERGE: feature/infra-crud → main   (CRUD completo)
             MERGE: feature/timer-view → main    (countdown funcional)
             MERGE: feature/calidad → main       (suite verde, A11y > 85)
             git tag v1.0-produccion
```

---

## 3. Puntos de integración y bloqueos potenciales

### PI-1 — Merge de `feature/infra-crud` a `main` tras Fase 3 (CRÍTICO)

**Cuándo:** Al cerrar Fase 3 (tag `v0.3-contextos`).
**Qué incluye:** Tailwind 4 configurado, `src/types/index.ts`, `src/services/`, `src/contexts/`, `src/hooks/`, router con 8 rutas.
**Bloqueo potencial:** Si Dev A entrega tipos incompletos (faltan interfaces de `TimerEvento` o `EmpresaEvento`), Dev B no puede implementar `TimerView` correctamente. **Mitigación:** Dev C puede auditar `src/types/index.ts` en cuanto esté disponible, antes del merge formal.

### PI-2 — Contrato de `useTimerState()` entre Dev A y Dev B

**Qué es:** `useTimerState()` debe exportar exactamente `{ currentTimerId, secondsRemaining, isRunning, selectedSalaId, setSelectedSalaId }`. Si Dev A cambia los nombres o tipos de estas props después del merge, Dev B tiene una rotura silenciosa.
**Mitigación:** Antes del merge de `feature/infra-crud`, Dev B revisa la firma del hook en el PR y la aprueba explícitamente.

### PI-3 — Tailwind 4 en las clases de componentes CRUD (Dev A) vs. TimerView (Dev B)

**Qué es:** Ambos devs escriben clases Tailwind de forma independiente. Si no hay acuerdo sobre tokens de color y tamaños, la UI será inconsistente.
**Mitigación:** Antes de que Dev B arranque, acordar en 15 minutos: paleta base (colores `brand-*`), tipografías y espaciados. Documentar en un comentario en `src/main.tsx` o en un fichero `src/styles/tokens.css` vacío como referencia.

### PI-4 — Merge de `feature/timer-view` y `feature/calidad` a `main`

**Cuándo:** Cuando ambas ramas estén listas (no tienen dependencia entre sí, pero Dev C necesita el componente `Tiempo.tsx` de Dev B para los tests de A11y en Lighthouse).
**Bloqueo potencial:** Si Dev B termina después de Dev C, los tests de Lighthouse de Dev C no pueden correr en `/`. **Mitigación:** Dev C ejecuta Lighthouse en `/categorias` primero (no depende de Dev B) y deja el Lighthouse de `/` para cuando el PR de Dev B esté mergeado.

### PI-5 — Conflicto en `vite.config.ts`

**Qué es:** Dev A configura Tailwind 4 y React Compiler en `vite.config.ts` (Fase 1). Dev C añade la configuración de Vitest en el mismo archivo (Fase 6). Si ambos tocan `vite.config.ts` en ramas distintas, el merge tendrá conflicto.
**Mitigación:** Dev C basa su rama en el `main` ya mergeado de Dev A. No hay conflicto si se respeta el orden: `feature/infra-crud` se mergea antes de que Dev C haga su primer commit en `vite.config.ts`.

---

## 4. Convención de ramas y tags

| Dev | Rama | Tag al cerrar |
|---|---|---|
| Dev A (Fases 0-3) | `feature/infra-crud` | `v0.3-contextos` (en el merge a main) |
| Dev A (Fase 4) | `feature/infra-crud` | `v0.4-crud` (en el merge a main) |
| Dev B (Fase 5) | `feature/timer-view` | `v0.5-timerview` (en el merge a main) |
| Dev C (Fase 6) | `feature/calidad` | `v1.0-produccion` (merge final) |

Regla: el tag se pone **en `main` después del merge**, no en la rama de feature.

```bash
# Ejemplo al cerrar Fase 3 (Dev A)
git checkout main
git merge --no-ff feature/infra-crud
git tag v0.3-contextos
git push origin main --tags
```

---

## 5. Agentes de Claude Code por fase — resumen consolidado

| Fase | Dev | Agente principal | Agente secundario |
|---|---|---|---|
| 0 | A | — (lectura de docs) | — |
| 1 | A | `senior-architect-agent` | `senior-frontend-agent` |
| 2 | A | `senior-frontend-agent` | `code-quality` |
| 3 | A | `senior-frontend-agent` | `code-quality` |
| 4 | A | `senior-frontend-agent` | `code-quality` |
| 5 | B | `senior-frontend-agent` | `code-quality` |
| 6 | C | `code-quality` | `senior-frontend-agent` |

**Nota sobre el `senior-architect-agent`:** Solo se invoca en Fase 1 para confirmar la estructura de carpetas definitiva y la decisión de Tailwind 4 (ADR-008). No vuelve a ser necesario salvo que surja una decisión de topología no prevista.

---

## 6. Checklist de sign-off antes de `v1.0-produccion`

- [ ] `npm run build` produce `dist/` sin errores ni warnings en la rama `main`
- [ ] `npm run lint` pasa sin errores en `main`
- [ ] `npm run test` pasa con cobertura > 60% en `src/utils/` y `src/services/`
- [ ] Countdown en tiempo real funciona contra el sync server de testing
- [ ] Cambio de color a rojo cuando `secondsRemaining <= 60` confirmado manualmente
- [ ] Las 6 vistas CRUD funcionan contra `https://apitimerstesting.azurewebsites.net/`
- [ ] Lighthouse Accessibility > 85 en `/` y en `/categorias`
- [ ] No hay `console.error` en ninguna vista
- [ ] Socket instanciado una sola vez (verificar en logs del sync server con dos pestañas abiertas)
- [ ] ADR-001 marcado como "Supersedido por ADR-008" en `decisiones.md`
- [ ] ADR-008 (Tailwind CSS 4) registrado en `decisiones.md`
- [ ] `Bootstrap 5.3` eliminado de `package.json` y de los imports
