# Índice — Plan de acción de bugs

Proyecto: events-timer  
Fecha: 2026-05-26  
Base: auditorías en `auditoria comparativa/` y `auditoria 2/`

---

## Tabla resumen de las 4 fases

| ID | Bug | Fase | Prioridad | Archivo principal | Tiempo est. | Estado |
|----|-----|------|-----------|-------------------|-------------|--------|
| C-01 | Bucle de navegación post-login | 1 | BLOQUEANTE | `LoginView.tsx:19` | 15 min | Pendiente |
| C-02 | Token guardado como `[object Object]` | 1 | BLOQUEANTE | `service.ts:82` | 30 min | Pendiente |
| C-03 | DELETE de TES envía ID `undefined` | 1 | BLOQUEANTE | `service.ts:192` | 1 h | Pendiente |
| C-04 | TimerView y HorarioView no refrescan datos | 1 | BLOQUEANTE | `TimerView.tsx:9` / `HorarioView.tsx:13` | 2-3 h | Pendiente |
| A-01 | ProtectedRoute no conectado al router | 2 | ALTO | `router/index.tsx` | 30 min | Pendiente |
| A-02 | 401 destruye estado React con `window.location.href` | 2 | ALTO | `httpClient.ts:24` | 2 h | Pendiente |
| A-03 | Select "Evento" vacío sin asignaciones previas | 2 | ALTO | `EmpresasEventoView.tsx:37` | 1 h | Pendiente |
| A-04 | Sort de timers inestable con misma hora de inicio | 2 | ALTO | `TemporizadoresView.tsx:42` | 15 min | Pendiente |
| A-05 | `useOptimistic` fuera de `startTransition` en 5 vistas | 2 | ALTO | 5 vistas | 1 h | Pendiente |
| A-06 | Capitalización distinta en endpoint `IncreaseTimers` | 2 | ALTO | `service.ts:186` | 30 min | Pendiente |
| M-01 | Sin ErrorBoundary en vistas con Suspense | 3 | MEDIO | Todas las vistas | 2 h | Pendiente |
| M-02 | Efecto de tema borra preferencias en cada navegación | 3 | MEDIO | `Menu.tsx:7` | 15 min | Pendiente |
| M-03 | Sin indicador visible de reconexión de socket | 3 | MEDIO | `socketClient.ts` | 2 h | Pendiente |
| M-04 | Variable de entorno faltante genera pantalla en blanco | 3 | MEDIO | `env.ts:6` | 1 h | Pendiente |
| B-01 | Tipos sin uso: `AuthToken`, `Evento`, `panic` | 4 | BAJO | `types/index.ts:57` | 30 min | Pendiente |
| B-02 | Funciones de servicio sin consumidores en UI | 4 | BAJO | `service.ts:93,212` | 30 min | Pendiente |
| B-03 / M-07 | Borrado en cascada no implementado | 4 | BAJO | `SalasView`, `EmpresasView`, `TemporizadoresView` | 2 h | Pendiente |
| M-04-mig | Endpoints de creación con nombre en URL (no body) | 4 | BAJO | `service.ts:98-130` | 1 h | Pendiente |
| M-05 | Solapamiento de timers no validado | 4 | BAJO | `TemporizadoresView.tsx:47` | 1 h | Pendiente |

**Tiempo total estimado: 17-24 horas**

---

## Dependencias entre fixes

El grafo de dependencias indica qué fix debe completarse antes de empezar otro.

```
C-01 (navigate)
  └── Sin dependencias. Fix inmediato.

C-02 (token formato)
  └── Sin dependencias. Fix inmediato tras diagnóstico con DevTools.

C-03 (mapTES)
  └── Sin dependencias.
  └── B-03 (cascada) REQUIERE C-03 (uniqueId resuelto antes de usarlo en cascada)

C-04 (promesas de módulo)
  └── Sin dependencias.

A-01 (ProtectedRoute)
  └── REQUIERE C-01 completado (si el login está en bucle, ProtectedRoute redirige siempre)

A-02 (401 con router)
  └── Sin dependencias técnicas. Mejora independiente.

A-03 (select Evento vacío)
  └── Sin dependencias técnicas.
  └── Si se implementa Opción B: REQUIERE B-01 (tipo Evento disponible en types/index.ts)

A-04 (sort inestable)
  └── Sin dependencias.

A-05 (startTransition)
  └── Sin dependencias. Cambio repetitivo independiente.

A-06 (capitalización IncreaseTimers)
  └── Sin dependencias. Requiere verificación contra backend.

M-01 (ErrorBoundary)
  └── Sin dependencias. Se puede implementar en paralelo con Fase 1.
  └── Mejora M-04 (env.ts) es complementaria: ErrorBoundary en raíz ayuda aunque el error sea de importación.

M-02 (tema en Menu)
  └── Sin dependencias.

M-03 (indicador socket)
  └── Sin dependencias.

M-04 (env.ts pantalla en blanco)
  └── Sin dependencias.

B-01 (tipos sin uso)
  └── REQUIERE decision sobre A-03 (Opción A vs B):
      - Opción A: eliminar Evento de types/index.ts
      - Opción B: mantener Evento y usarlo

B-02 (funciones sin consumidores)
  └── Sin dependencias. Limpieza independiente.

B-03 / M-07 (cascada)
  └── REQUIERE C-03 (mapTES completado, uniqueId resuelto)
  └── Requiere verificación de CASCADE en backend antes de implementar

M-04-mig (body JSON)
  └── REQUIERE coordinación con el equipo de backend

M-05 (solapamiento timers)
  └── Sin dependencias de código. Requiere entender la lógica de negocio.
```

---

## Criterios de "done" por fase

### Fase 1 — Críticos

- [ ] **C-01 done**: el login con credenciales válidas redirige a `/` y el menú muestra "Salir" + "Temporizadores".
- [ ] **C-02 done**: `localStorage.getItem('token')` devuelve una cadena que empieza por `eyJ` (JWT válido). Las peticiones GET a `/salas` devuelven 200, no 401.
- [ ] **C-03 done**: el botón "Eliminar" en `/empresastimersnew` dispara `DELETE api/TiempoEmpresaSala/<numero>` (nunca `undefined`). La fila eliminada no vuelve al refrescar.
- [ ] **C-04 done**: crear una sala nueva en `/salas`, navegar a `/` y verificar que la nueva sala aparece en el selector sin recargar. Repetir para `/horario`.

Criterio global de Fase 1: el administrador puede hacer login, ver datos actualizados y eliminar asignaciones sin errores visibles.

### Fase 2 — Altos

- [ ] **A-01 done**: un usuario no autenticado que navega directamente a `/salas` es redirigido a `/login`. Las rutas `/` y `/horario` siguen siendo públicas.
- [ ] **A-02 done**: cuando el token expira y el backend devuelve 401, la app navega a `/login` sin recargar la página completa. El socket no se desconecta abruptamente.
- [ ] **A-03 done**: en una BD sin asignaciones, el formulario de "Nueva asignación" tiene el campo "Evento" con al menos una opción disponible.
- [ ] **A-04 done**: dos timers con idéntica hora de inicio mantienen orden estable entre renders y navegadores.
- [ ] **A-05 done**: eliminar un elemento en cualquiera de las 5 vistas no genera warnings de React en consola. La fila desaparece inmediatamente al confirmar.
- [ ] **A-06 done**: los botones `+1 min`, `+5 min`, `-1 min` en `/login` devuelven 200 del backend (o el error de capitalización es documentado como "aceptado" si el servidor es case-insensitive).

Criterio global de Fase 2: todas las rutas admin están protegidas, la expiración de sesión es limpia, y los flujos de CRUD son visualmente correctos.

### Fase 3 — Medios

- [ ] **M-01 done**: detener el backend y navegar a cualquier vista — aparece el mensaje de error con botón "Reintentar" en lugar de pantalla en blanco. Al reiniciar el backend y pulsar "Reintentar", los datos cargan correctamente.
- [ ] **M-02 done**: el atributo `data-theme` del `<html>` no se borra automáticamente al navegar entre rutas. No hay warnings de consola sobre `localStorage`.
- [ ] **M-03 done**: desconectar el backend/socket durante la sesión — aparece el banner de reconexión en `TimerView`. Reconectar — el banner desaparece.
- [ ] **M-04 done**: eliminar el archivo `.env` y arrancar la app — aparece un mensaje de error legible en la pantalla del navegador (no pantalla en blanco).

Criterio global de Fase 3: ninguna situación de error (red caída, configuración incorrecta, sesión expirada) produce una pantalla completamente en blanco sin explicación.

### Fase 4 — Deuda técnica

- [ ] **B-01 done**: `npm run build` completa sin errores tras eliminar los tipos sin uso. No hay referencias rotas.
- [ ] **B-02 done**: `npm run build` completa sin errores tras eliminar las funciones sin consumidores. La funcionalidad de las vistas no cambia.
- [ ] **B-03/M-07 done**: intentar borrar una sala con asignaciones TES existentes — o el backend maneja el CASCADE automáticamente (200), o el frontend borra primero las asignaciones con `Promise.all` y luego el padre (200 en ambos DELETE). Nunca 409/500 al usuario.
- [ ] **M-04-mig done**: crear una sala con nombre especial (`Sala & Main`, `Sala/A`) — la petición llega al backend correctamente y la sala aparece en la lista con el nombre exacto introducido.
- [ ] **M-05 done**: intentar guardar dos timers con el mismo horario y categoría — el sistema muestra el error de solapamiento antes de enviar la petición al backend.

Criterio global de Fase 4: `npm run build` sin errores de TypeScript, sin funciones o tipos muertos en el árbol de exportaciones, y los flujos de datos complejos (borrado en cascada, validación de solapamiento) funcionan correctamente.

---

## Orden de ejecución recomendado

```
Día 1 (sprint 1)
  ├── C-01 — 15 min — fix inmediato, desbloquea todo lo demás
  ├── C-02 — 30 min — diagnóstico + fix según respuesta del backend
  └── C-03 — 1 h   — añadir mapTES en service.ts

Día 2 (sprint 1 cont.)
  ├── C-04 — 3 h   — refactorizar TimerView y HorarioView a useState
  └── A-01 — 30 min — conectar ProtectedRoute en router (prerequisito: C-01 resuelto)

Día 3 (sprint 2)
  ├── A-04 — 15 min — sort con toMillis() (cambio de 1 línea)
  ├── A-05 — 1 h   — startTransition en 5 vistas (cambio repetitivo)
  ├── A-06 — 30 min — verificar capitalización con backend
  └── A-03 — 1 h   — resolver select vacío (Opción A o B)

Día 4 (sprint 2 cont.)
  └── A-02 — 2 h   — refactorizar interceptor 401 para usar router de React

Día 5 (sprint 3)
  ├── M-01 — 2 h   — crear ErrorBoundary y aplicar en 7 vistas
  ├── M-02 — 15 min — eliminar useEffect de tema en Menu
  └── M-04 — 1 h   — error de configuración visible en pantalla

Día 6 (sprint 3 cont.)
  └── M-03 — 2 h   — indicador de reconexión de socket

Día 7-8 (sprint 4)
  ├── B-01 — 30 min — limpiar tipos sin uso
  ├── B-02 — 30 min — limpiar funciones sin consumidores
  ├── B-03/M-07 — 2 h — borrado en cascada (si backend no tiene CASCADE)
  ├── M-05 — 1 h   — validación de solapamiento de timers
  └── M-04-mig — 1 h — coordinación con backend para body JSON
```

---

## Archivos de este plan

| Archivo | Contenido |
|---------|-----------|
| `indice.md` | Este archivo — tabla resumen, dependencias, criterios de done |
| `fase-1-criticos.md` | C-01, C-02, C-03, C-04 — con código exacto del fuente real |
| `fase-2-altos.md` | A-01, A-02, A-03, A-04, A-05, A-06 — con código exacto del fuente real |
| `fase-3-medios.md` | M-01, M-02, M-03, M-04 — con código exacto del fuente real |
| `fase-4-deuda-tecnica.md` | B-01, B-02, B-03, M-04-mig, M-05, M-07 — con código exacto del fuente real |
