# Plan de Accion — events-timer

> Indice operativo de la implementacion desde cero en React 19 (Vite + TypeScript).
> La especificacion de referencia es `DOCUMENTACION-COMPLETA.md` y los archivos en `docs/`.
> Cada archivo de esta carpeta es autosuficiente: puedes abrirlo sin leer los demás.

---

## Estado de progreso

| Fase | Archivo | Estado | Criterio de salida |
|---|---|---|---|
| 0 — Auditoría | `fase-0-auditoria.md` | Completada | 5 docs de `docs auditoria/` leídos; endpoints, modelos y eventos conocidos |
| 1 — Infraestructura | `fase-1-infraestructura.md` | Completada | `npm run build` y `npm run lint` sin errores |
| 2 — Servicios | `fase-2-servicios.md` | Completada | `npm run build` sin `any` en `src/services/` |
| 3 — Contextos | `fase-3-contextos.md` | Completada | Socket instanciado una sola vez; `useAuth` y `useTimerState` disponibles |
| 4 — Vistas CRUD | `fase-4-vistas-crud.md` | Completada | 6 vistas funcionales contra API de testing |
| 5 — TimerView | `fase-5-timer-view.md` | Pendiente | Countdown en tiempo real; cambio de color al minuto |
| 6 — Calidad | `fase-6-calidad.md` | Pendiente | Cobertura > 60% en utils/ y services/; Lighthouse A11y > 85 |

Marca cada fase como **En progreso** o **Completada** editando esta tabla directamente.

---

## Reglas del juego

### Como usar este plan

1. Lee el archivo de fase antes de escribir codigo. Cada archivo explica el criterio de entrada (que debe estar listo antes) y el de salida (como saber que terminaste).
2. Ejecuta el criterio de salida antes de avanzar a la siguiente fase. Sin criterio cumplido, la fase no esta cerrada.
3. Si encuentras una decision no cubierta, añadela a `decisiones.md` con el formato ADR.
4. Si encuentras una deuda tecnica no listada, añadela a `tech-debt.md` antes de seguir.

### Como marcar tareas completadas

Cambia `- [ ]` a `- [x]` en el checklist de la fase correspondiente. Haz commit del cambio con el mismo mensaje del hito.

### Convenciones de rama git

```
main              → producción estable
diego             → rama de trabajo actual
feature/<nombre>  → features individuales (opcional en equipo de 1)
```

### Tags de hito (obligatorios al cerrar cada fase)

```
git tag v0.0-auditoria   # Fase 0 completada
git tag v0.1-infra       # Fase 1 completada
git tag v0.2-servicios   # Fase 2 completada
git tag v0.3-contextos   # Fase 3 completada
git tag v0.4-crud        # Fase 4 completada
git tag v0.5-timerview   # Fase 5 completada
git tag v1.0-produccion  # Fase 6 completada
```

### Estrategia de rollback

Si una fase introduce una regresion grave, revierte al tag del hito anterior:

```bash
git reset --hard v0.2-servicios   # ejemplo: volver al estado post-servicios
```

La especificacion de referencia es `DOCUMENTACION-COMPLETA.md`. No hay codigo legacy que consultar: la app se construye desde cero.

---

## Documentacion de soporte

| Archivo | Proposito |
|---|---|
| `docs/migration-plan.md` | Plan de fases con estimaciones de esfuerzo |
| `docs/architecture-target.md` | Arquitectura objetivo: carpetas, componentes, estado, enrutamiento |
| `docs/react19-improvements.md` | Que hooks de React 19 usar y en que vista |
| `DOCUMENTACION-COMPLETA.md` | Sistema legacy: endpoints, eventos Socket.IO, modelos de datos |
| `docs auditoria/` | Auditoría completa: endpoints exactos, modelos BD, componentes, eventos Socket.IO |
| `docs/action-plan/decisiones.md` | ADRs de decisiones ya tomadas |
| `docs/action-plan/tech-debt.md` | Inventario de deudas tecnicas conocidas |

---

## Stack objetivo de referencia rapida

| Tech | Version |
|---|---|
| React | 19.2.6 |
| Vite | 8 |
| TypeScript | 5.x strict |
| React Router | 7 |
| Axios | 1.x |
| Socket.IO Client | 4.x |
| Luxon | 3.x |
| SweetAlert2 | 11 |
| Tailwind CSS | 4 |
| Vitest | 3.x |
| ESLint | 10 |

## Variables de entorno de referencia rapida

| Variable | Dev | Prod |
|---|---|---|
| `VITE_API_URL` | `https://apitimerstesting.azurewebsites.net/` | `https://apitimers.azurewebsites.net/` |
| `VITE_SOCKET_URL` | `https://timertajamarback.azurewebsites.net/` | `https://timertajamarback.azurewebsites.net/` |
