# Auditoría Comparativa — events-timer

Fecha: 2026-05-26  
Comparación: app original (CRA + JavaScript) vs app actual (Vite + TypeScript + React 19)

---

## Veredicto general

La migración arquitectural fue **bien ejecutada** (token en headers, singleton de socket, async/await, variables de entorno) pero introdujo **4 regresiones críticas** que bloquean el flujo del administrador y corrompen datos silenciosamente.

**El usuario admin no puede usar la app ahora mismo** por C-01 + posiblemente C-02.

---

## Lo que está bien (ver `lo-que-esta-bien.md`)

- Token JWT adjunto automáticamente en todas las peticiones REST
- Socket WebSocket como singleton — sin conexiones duplicadas
- Async/await sin antipatrones de promesas
- SweetAlert2 desacoplado del servicio
- Variables de entorno correctamente configuradas
- Componentes funcionales con hooks
- Modelos de datos expandidos correctamente (`TimerEvento`)
- Mapeo defensivo con fallback para `Sala` y `Empresa`
- 27 de 29 endpoints sin cambios de ruta

---

## Lo que está mal — priorizado (ver `lo-que-esta-mal.md`)

### CRÍTICOS (rompen la app ahora)

| ID | Bug | Archivo | Fix |
|----|-----|---------|-----|
| C-01 | Login no redirige — bucle infinito en `/login` | `LoginView.tsx:19` | `navigate('/')` en lugar de `navigate('/login')` |
| C-02 | Token puede guardarse como `[object Object]` | `service.ts:82` | Verificar formato respuesta del backend |
| C-03 | DELETE de TES envía ID `undefined` | `service.ts` + `EmpresasEventoView.tsx:71` | Añadir `mapTES` con fallback `uniqueId ?? id` |
| C-04 | Datos de TimerView/HorarioView nunca se refrescan | `TimerView.tsx:9-10` | Mover promesas a `useState` + refresco |

### ALTOS (degradación seria)

| ID | Bug | Archivo |
|----|-----|---------|
| A-01 | `ProtectedRoute` existe pero no está conectado al router | `router/index.tsx` |
| A-02 | 401 hace `window.location.href` → destruye estado React | `httpClient.ts:23-24` |
| A-03 | Select "Evento" vacío si no hay asignaciones previas | `EmpresasEventoView.tsx:37` |
| A-04 | Sort de timers inestable con misma hora de inicio | `TemporizadoresView.tsx:42` |
| A-05 | `useOptimistic` fuera de `startTransition` en 5 vistas | Múltiples vistas |
| A-06 | Capitalización diferente en endpoint `IncreaseTimers` | `service.ts:186` |

---

## Archivos en esta carpeta

| Archivo | Contenido |
|---------|-----------|
| `resumen.md` | Este archivo — visión general |
| `lo-que-esta-bien.md` | Detalle de qué fue bien migrado |
| `lo-que-esta-mal.md` | Detalle de bugs con código, causa raíz y fix |
