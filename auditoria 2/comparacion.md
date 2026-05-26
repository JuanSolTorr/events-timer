# Comparacion entre app ORIGINAL y app ACTUAL — events-timer

Fecha: 2026-05-26  
Referencia: `auditoria/` (app original, CRA + JS) vs. `auditoria 2/` (app actual, Vite + TS + React 19)

---

## 1. Endpoints — diferencias endpoint por endpoint

### 1.1 Tabla maestra de endpoints

| # | Metodo | Path ORIGINAL | Path ACTUAL | Estado | Cambio |
|---|--------|--------------|------------|--------|--------|
| 1 | POST | `Auth/Login` | `Auth/Login` | OK | Sin cambio de ruta |
| 2 | GET | `api/salas` | `api/salas` | OK | Sin cambio |
| 3 | GET | `api/salas/:idsala` | `api/salas/:idSala` | OK | Solo capitalización |
| 4 | POST | `api/salas/createsala/:nombreSala` | `api/salas/createsala/:nombreSala` | OK | Ahora usa `encodeURIComponent` (fix de M-04 parcial) |
| 5 | PUT | `api/salas/updatesala/:idSala/:nombreSala` | `api/salas/updatesala/:idSala/:nombreSala` | OK | Idem, con encode |
| 6 | DELETE | `api/salas/:idSala` | `api/salas/:idSala` | OK | Sin cambio |
| 7 | GET | `api/empresas` | `api/empresas` | OK | Sin cambio |
| 8 | GET | `api/empresas/:idempresa` | `api/empresas/:idEmpresa` | OK | Solo capitalización |
| 9 | POST | `api/empresas/createempresa/:nombreEmpresa` | `api/empresas/createempresa/:nombreEmpresa` | OK | Con encode |
| 10 | PUT | `api/empresas/updateempresa/:idEmpresa/:nombreEmpresa` | `api/empresas/updateempresa/:idEmpresa/:nombreEmpresa` | OK | Con encode |
| 11 | DELETE | `api/empresas/:idEmpresa` | `api/empresas/:idEmpresa` | OK | Sin cambio |
| 12 | GET | `api/categoriastimer` | `api/categoriastimer` | OK | Sin cambio |
| 13 | GET | `api/categoriastimer/:idcategoria` | `api/categoriastimer/:idCategoria` | OK | Solo capitalización |
| 14 | POST | `api/categoriastimer` | `api/categoriastimer` | OK | Sin cambio de ruta |
| 15 | PUT | `api/categoriastimer` | `api/categoriastimer` | OK | Sin cambio de ruta |
| 16 | DELETE | `api/categoriastimer/:idcategoria` | `api/categoriastimer/:idCategoria` | OK | Solo capitalización |
| 17 | GET | `api/timers` | `api/timers` | OK | Sin cambio |
| 18 | POST | `api/timers` | `api/timers` | OK | Sin cambio |
| 19 | PUT | `api/timers` | `api/timers` | OK | Sin cambio |
| 20 | DELETE | `api/timers/:idTimer` | `api/timers/:idTimer` | OK | Sin cambio |
| 21 | PUT | `api/timers/increasetimers/:minutes` | `api/Timers/IncreaseTimers/:minutes` | **RIESGO** | Capitalización distinta — puede fallar en servidores case-sensitive |
| 22 | GET | `api/TiempoEmpresaSala` | `api/TiempoEmpresaSala` | OK | Sin cambio |
| 23 | POST | `api/TiempoEmpresaSala` | `api/TiempoEmpresaSala` | **CAMBIO** | Campo PK renombrado: `id` → `uniqueId` (ver seccion 2) |
| 24 | DELETE | `api/TiempoEmpresaSala/:idTES` | `api/TiempoEmpresaSala/:idTES` | OK | Sin cambio de ruta |
| 25 | GET | `api/timereventos` | `api/timereventos` | OK | Sin cambio |
| 26 | GET | `api/timereventos/empresastimers` | `api/timereventos/empresastimers` | OK | Sin cambio |
| 27 | GET | `api/timereventos/eventosactualesempresa/:idempresa` | `api/timereventos/eventosactualesempresa/:idEmpresa` | OK | Solo capitalización |
| 28 | GET | `api/timereventos/eventosempresa/:idempresa` | `api/timereventos/eventosempresa/:idEmpresa` | OK | Solo capitalización |
| 29 | GET | `api/timereventos/eventossala/:idsala` | `api/timereventos/eventossala/:idSala` | OK | Solo capitalización |

### 1.2 Problema critico — endpoint IncreaseTimers con capitalización distinta

- **Original** (`service.js`): `api/timers/increasetimers/:minutes` (todo minusculas)
- **Actual** (`service.ts:186`): `api/Timers/IncreaseTimers/:minutes` (con mayusculas)

Si el backend de Azure (ASP.NET) tiene routing case-insensitive, no hay impacto. Si es case-sensitive, el endpoint fallará silenciosamente. Verificar contra el backend antes de usar los botones `+1 min`, `+5 min`, `-1 min` de `LoginView`.

### 1.3 Endpoint inexistente para Eventos (gap nuevo)

La interfaz `Evento` existe en `src/types/index.ts` (lineas 61-66) y `EmpresasEventoView` necesita un select de eventos, pero no existe un endpoint `api/eventos` en el servicio. Los eventos se derivan de `getTimersEventos()` haciendo deduplicación en cliente (`EmpresasEventoView.tsx:37`). Si no hay asignaciones previas, el select de "Evento" quedará vacío y no se podrán crear nuevas asignaciones. La original no tenía este problema porque `idEvento` siempre se enviaba hardcodeado a `1`.

---

## 2. Modelos de datos — campos añadidos, eliminados o renombrados

### 2.1 Sala

| Campo | Original | Actual | Tipo cambio |
|-------|----------|--------|-------------|
| `idSala` | `number` (PK) | `number` (PK) | Sin cambio |
| `nombreSala` | `string` (campo publico) | **ELIMINADO del tipo publico** | Renombrado |
| `sala` | No existia en tipo publico | `string` (campo publico en `Sala`) | Renombrado |

**Impacto**: el backend puede devolver `nombreSala` o `sala` segun la version del endpoint. La capa actual en `service.ts:42` resuelve esto con `data.sala ?? data.nombreSala ?? ''` mediante el tipo interno `ApiSala`. Correcto, pero si el backend devuelve solo `nombreSala` y la funcion de mapeo falla (por ejemplo si el campo se llama de otra forma), el campo `sala` quedará como cadena vacía sin error visible.

### 2.2 Empresa

| Campo | Original | Actual | Tipo cambio |
|-------|----------|--------|-------------|
| `idEmpresa` | `number` | `number` | Sin cambio |
| `nombreEmpresa` | `string` (campo publico) | **ELIMINADO del tipo publico** | Renombrado |
| `empresa` | No existia en tipo publico | `string` | Renombrado |
| `imagen` | No existia en tipo publico (estaba en `EventoActual.imagenEmpresa`) | `string` (puede ser cadena vacía) | AÑADIDO |
| `imagenEmpresa` | `string` en `EventoActual` | Solo en `ApiEmpresa` interno | Renombrado en capa intermedia |

**Impacto**: el campo de nombre de empresa ha cambiado de `nombreEmpresa` a `empresa`. Si cualquier parte del codigo accede a `empresa.nombreEmpresa` directamente (fuera del tipo tipado), producirá `undefined` silencioso.

### 2.3 Categoria

| Campo | Original | Actual | Tipo cambio |
|-------|----------|--------|-------------|
| `idCategoria` | `number` | `number` | Sin cambio |
| `categoria` | `string` | `string` | Sin cambio |
| `duracion` | `number` (minutos) | `number` (minutos) | Sin cambio |

Sin cambios de modelo. OK.

### 2.4 Temporizador / Timer

| Campo | Original | Actual | Tipo cambio |
|-------|----------|--------|-------------|
| `idTemporizador` | `number` | `number` | Sin cambio |
| `inicio` | `string` (ISO 8601) | `string` (ISO 8601) | Sin cambio |
| `idCategoria` | `number` o `string` (cast implicito) | `number` (TypeScript fuerza numero) | MEJORADO |
| `pausa` | `boolean` (siempre `false` en original) | `boolean` | Sin cambio semantico |

**Observacion**: en la original, `idCategoria` venía del `<select>` como `string` y el backend hacía coerción implícita. En la actual está declarado como `number` y se pasa como `Number(formData.get('idCategoria'))` en `TemporizadoresView.tsx:53`. Correcto.

### 2.5 TiempoEmpresaSala (TES) — CAMBIO CRITICO DE CAMPO

| Campo | Original | Actual | Tipo cambio |
|-------|----------|--------|-------------|
| `id` | `number` (PK, usado en DELETE) | **ELIMINADO** | Renombrado |
| `uniqueId` | No existia | `number` (PK) | RENOMBRADO desde `id` |
| `idTimer` | `number` | `number` | Sin cambio |
| `idEmpresa` | `number` | `number` | Sin cambio |
| `idSala` | `number` | `number` | Sin cambio |
| `idEvento` | `number` (hardcodeado a `1`) | `number` (viene del select en UI) | COMPORTAMIENTO CAMBIADO |

**Impacto critico en DELETE de TES**: la original usaba `registro.id` para llamar a `deleteTES`. La actual usa `te.uniqueId`. Si el backend devuelve el campo con nombre `id` (original), la app actual recibiría `uniqueId: undefined` y el DELETE usaría `undefined` como ID — fallando silenciosamente o borrando el registro equivocado.

La función `mapTimerEvento` en `service.ts` mapea `uniqueId` directamente (`data.uniqueId`), pero no hay fallback `?? data.id` para el campo PK de TES, al contrario de como se maneja `sala`/`nombreSala`. Si el backend aun devuelve `id` en lugar de `uniqueId`, el campo quedará a `undefined`.

**Verificar con el backend si la propiedad PK del TES se llama `id` o `uniqueId` en la respuesta real.**

### 2.6 EventoActual / TimerEvento — MODELO AMPLIADO

| Campo | Original (EventoActual) | Actual (TimerEvento) | Tipo cambio |
|-------|------------------------|---------------------|-------------|
| `empresa` | `string` | `string` | Sin cambio |
| `sala` | `string` | `string` | Sin cambio |
| `inicioTimer` | `string` (ISO 8601) | Solo en `ApiTimerEvento` como fallback | Renombrado a `inicio` |
| `inicio` | No existia | `string` (campo canonico) | RENOMBRADO |
| `idCategoria` | `number` | `number` | Sin cambio |
| `duracion` | `number` | `number` | Sin cambio |
| `imagenEmpresa` | `string` | Solo en `ApiTimerEvento` como fallback | Renombrado a `imagen` |
| `imagen` | No existia | `string` (campo canonico) | AÑADIDO |
| `uniqueId` | No existia | `number` | AÑADIDO |
| `idEmpresa` | No existia | `number` | AÑADIDO |
| `idTimer` | No existia | `number` | AÑADIDO |
| `idSala` | No existia | `number` | AÑADIDO |
| `idEvento` | No existia | `number` | AÑADIDO |
| `pausa` | No existia | `boolean` | AÑADIDO |
| `pausaTimer` | No existia en tipo | Solo en `ApiTimerEvento` como fallback | AÑADIDO |
| `categoria` | No existia | `string` (nombre de categoria) | AÑADIDO |
| `evento` | No existia | `string` | AÑADIDO |
| `inicioEvento` | No existia | `string` (ISO 8601) | AÑADIDO |
| `finEvento` | No existia | `string` (ISO 8601) | AÑADIDO |

El modelo `TimerEvento` actual es una expansion correcta sobre `EventoActual` de la original. La logica de mapeo con fallbacks dobles es la estrategia correcta para manejar la ambiguedad del backend.

---

## 3. Flujo de autenticacion — diferencias

### 3.1 Tabla comparativa

| Aspecto | Original | Actual | Estado |
|---------|----------|--------|--------|
| Almacenamiento | `localStorage('token')` | `localStorage('token')` | Sin cambio |
| Token adjunto en REST | **NO** — nunca se enviaba | **SI** — interceptor en `httpClient.ts:11-17` | FIX de M-01 aplicado |
| Lectura del token del endpoint | `response.data.response` (objeto anidado) | `response.data` directamente (`string` plano) | CAMBIO — ver nota |
| Validacion del token en cliente | `localStorage.getItem("token") !== null` | `localStorage.getItem('token') !== null` | Sin cambio semantico |
| Logout | `localStorage.clear()` (borraba todo) | `localStorage.removeItem('token')` + `disconnectSocket()` | FIX de seguridad aplicado |
| Redireccion post-login | Cambiaba render condicionalmente | `navigate('/login')` — **BUG CRITICO** | REGRESION |
| Manejo de 401 | Swal en service.js | `window.location.href = '/login'` en interceptor | CAMBIO — con efectos secundarios |
| Proteccion de rutas | No existia (solo visibilidad de botones) | `ProtectedRoute.tsx` existe pero **no se usa en el router** | REGRESION — peor que original porque da falsa sensacion de proteccion |
| Evento de inicio | `socket.emit('vamos')` desde `Login.js` | `socket.emit('vamos')` desde `LoginView.tsx:41` | Sin cambio funcional |
| Reseteo de emergencia | `socket.emit('start')` (boton comentado) | **ELIMINADO** — evento `start` no existe en tipos ni en `SocketClientEvents` | ELIMINADO |

### 3.2 CAMBIO CRITICO — Formato de respuesta del token

- **Original**: `generateToken` resuelvia con `response.data` y luego el componente accedia a `result.response` para obtener la cadena JWT. El backend devuelvia `{ response: "<JWT>" }`.
- **Actual**: `generateToken` (`service.ts:82`) devuelve `data` directamente como `string`. `authService.login` hace `localStorage.setItem(TOKEN_KEY, token)` donde `token` es la cadena directa.

Si el backend **aun devuelve** `{ response: "<JWT>" }` (objeto) en lugar de la cadena plana, entonces `token` recibirá el string `"[object Object]"` y `localStorage` almacenará ese valor invalido. La app parecerá autenticada (`token !== null`) pero el JWT real nunca se usará correctamente en las cabeceras.

**Verificar con el backend si `POST Auth/Login` devuelve la cadena JWT directamente o dentro de un objeto `{ response: string }`.**

### 3.3 BUG CRITICO — Bucle de navegacion en login (no existia en original)

`LoginView.tsx:19`:
```typescript
useEffect(() => {
  if (isAuthenticated) navigate('/login')  // deberia ser navigate('/')
}, [isAuthenticated, navigate])
```

La original no tenia este problema porque no usaba `navigate()` — simplemente cambiaba el render condicionalmente mostrando u ocultando el formulario. La refactorizacion introdujo este bug: al autenticarse correctamente, el usuario se queda atrapado en `/login` sin feedback de exito.

---

## 4. Service layer y componentes — que se rompio en la refactorizacion

### 4.1 Mejoras correctamente aplicadas (M-01, M-02, M-03, M-08, M-09)

| ID migration-notes | Descripcion | Estado en app actual |
|--------------------|-------------|----------------------|
| M-01 | Token JWT en cabeceras REST | APLICADO — `httpClient.ts` interceptor de request |
| M-02 | Promise antipattern + promesas sin reject | APLICADO — `async/await` directo en todos los metodos de `service.ts` |
| M-03 | Multiples instancias de socket | APLICADO — singleton en `socketClient.ts` |
| M-08 | Swal acoplado en service.js | APLICADO — Swal solo en vistas |
| M-09 | URLs hardcodeadas sin variables de entorno | APLICADO — `VITE_API_URL` y `VITE_SOCKET_URL` en `config/env.ts` |

### 4.2 Mejoras parcialmente aplicadas

| ID migration-notes | Descripcion | Estado en app actual |
|--------------------|-------------|----------------------|
| M-04 | Parametros en URL sin codificacion | PARCIAL — `encodeURIComponent` añadido, pero la estructura de endpoint (nombre en URL) no se cambio a body JSON. El backend no se modifico. Sigue siendo fragil. |
| M-05 | Logica de negocio duplicada en componentes | PARCIAL — se extrajeron `parseTimerInicio`, `ahora` a `src/utils/timezone.ts`, pero la logica de solapamiento de timers de la original no parece haberse portado (TemporizadoresView no valida solapamiento antes de crear, solo valida fecha futura). |
| M-07 | Promise.all en borrados en cascada | PARCIAL — el borrado en cascada (eliminar TES antes de borrar sala/empresa/timer) no aparece implementado en ninguna vista actual. Solo existe `deleteTES` individual. No hay flujo de borrado en cascada visible. |

### 4.3 Regresiones introducidas (no existian en la original)

#### R-01 — Bucle de navegacion post-login [CRITICO]
- **Archivo**: `src/views/LoginView.tsx:19`
- **Causa**: `navigate('/login')` en lugar de `navigate('/')`
- **Efecto**: usuario se autentifica correctamente pero se queda atrapado en la misma pagina sin poder acceder a las vistas de administracion.
- **La original** usaba render condicional: nunca tuvo este problema.

#### R-02 — ProtectedRoute declarado pero no conectado [CRITICO]
- **Archivo**: `src/router/index.tsx` (todas las rutas sin envolver), `src/components/ProtectedRoute.tsx` (existe pero no se usa)
- **Causa**: el router no usa `ProtectedRoute` como elemento padre.
- **Efecto**: cualquier usuario puede acceder a `/temporizadores`, `/salas`, `/empresas`, `/categorias`, `/empresastimersnew` por URL directa. Las operaciones de escritura usan `canEdit = isAuthenticated` para ocultar controles, pero la ruta en si es publica.
- **La original** tenia el mismo problema de acceso por URL, pero no habia promesa implicita de un `ProtectedRoute`.

#### R-03 — Promesas de modulo en TimerView y HorarioView sin refresco [CRITICO]
- **Archivos**: `src/views/TimerView.tsx:9-10`, `src/views/HorarioView.tsx` (mismo patron)
- **Causa**: `const salasPromise = getSalas()` y `const eventosPromise = getTimersEventos()` son constantes de modulo — se ejecutan una sola vez al importar el archivo.
- **Efecto**: si el usuario navega a otra vista, crea o modifica datos, y vuelve a `/`, los datos son los de la carga inicial. Los cambios no se reflejan.
- **La original** recargaba en `componentDidMount` y en el listener de `timerID` del socket.

#### R-04 — redireccion 401 mediante window.location destruye estado React [ALTO]
- **Archivo**: `src/services/httpClient.ts:23-24`
- **Causa**: `window.location.href = '/login'` provoca recarga completa del navegador.
- **Efecto**: destruye el estado de React (contextos, formularios en vuelo), el socket se desconecta sin llamar a `disconnectSocket()`, las mutaciones en vuelo se pierden.
- **La original** no tenia este interceptor; los errores se logueaban por consola (peor para el usuario, pero sin efecto destructivo en el estado de la app).

#### R-05 — Sort de timers con operador `<` sobre DateTime [ALTO]
- **Archivo**: `src/views/TemporizadoresView.tsx:42-44`
- **Causa**: `parseTimerInicio(a.inicio) < parseTimerInicio(b.inicio)` compara objetos Luxon con `<`.
- **Efecto**: el orden de los timers en la tabla puede ser incorrecto o no determinista. Luxon `DateTime` implementa `valueOf()` que retorna ms, por lo que `<` funciona tecnicamente, pero el comparador `? -1 : 1` no maneja igualdad, produciendo orden inestable si dos timers tienen el mismo `inicio`.
- **Fix**: `.toMillis() - .toMillis()` como en el resto del codigo.

#### R-06 — useOptimistic llamado fuera de startTransition [ALTO]
- **Archivos**: `src/views/SalasView.tsx:68`, `src/views/EmpresasView.tsx:58`, `src/views/CategoriasView.tsx:65`, `src/views/TemporizadoresView.tsx:81`, `src/views/EmpresasEventoView.tsx:71`
- **Causa**: `removeOptimistic(id)` se llama en handlers async directos, no dentro de `startTransition`.
- **Efecto**: segun React 19, la actualizacion optimista puede no aplicarse inmediatamente o generar warnings. La fila eliminada puede no desaparecer visualmente de forma inmediata.
- **La original** no usaba `useOptimistic` — simplemente recargaba desde el servidor tras cada mutacion.

#### R-07 — Select de "Evento" vacio si no hay asignaciones previas [ALTO]
- **Archivo**: `src/views/EmpresasEventoView.tsx:37`
- **Causa**: `idEventos` se deriva de `timerEventos` (asignaciones existentes). Sin asignaciones, no hay eventos en el select.
- **Efecto**: en una instalacion limpia o despues de borrar todas las asignaciones, el usuario no puede crear ninguna asignacion nueva porque el campo "Evento" no tiene opciones.
- **La original** enviaba `idEvento: 1` hardcodeado — workaround fragil pero funcional.

#### R-08 — Campo PK de TES puede ser undefined si backend devuelve `id` [CRITICO]
- **Archivo**: `src/types/index.ts:26`, `src/services/service.ts` (no hay mapeo para TES, se usa directamente)
- **Causa**: la interfaz `TiempoEmpresaSala` usa `uniqueId` pero la funcion `getTES` hace `httpClient.get<TiempoEmpresaSala[]>` sin pasar por `mapTES`. Si el backend devuelve `id` en lugar de `uniqueId`, TypeScript no protege en runtime — el campo queda `undefined`.
- **Efecto**: `deleteTES(te.uniqueId)` envia `DELETE api/TiempoEmpresaSala/undefined` — el servidor devuelve 404 o borra el registro incorrecto.
- **Fix necesario**: anadir funcion `mapTES` con fallback `uniqueId ?? id` igual que se hizo con `mapSala` y `mapEmpresa`.

---

## 5. Cumplimiento de migration-notes.md

| ID | Prioridad original | Descripcion | Aplicado | Observaciones |
|----|-------------------|-------------|----------|---------------|
| M-01 | Bloqueante | Token JWT en cabeceras REST | SI | `httpClient.ts` interceptor. Correcto. |
| M-02 | Bloqueante | Reescribir service sin Promise antipattern | SI | `async/await` en `service.ts`. Correcto. |
| M-03 | Bloqueante | Centralizar conexion WebSocket en singleton | SI | `socketClient.ts`. Correcto. |
| M-04 | Alta | Cambiar endpoints de creacion a body JSON | PARCIAL | Solo se añadio `encodeURIComponent`. La estructura URL no cambio. No hubo coordinacion con backend. |
| M-05 | Alta | Extraer utils de tiempo a modulo compartido | PARCIAL | `src/utils/timezone.ts` existe, pero la logica de solapamiento de rangos no esta portada. |
| M-06 | Media | Eliminar peticiones GET duplicadas en TimerView | N/A | La nueva arquitectura con TimerContext y promesas de modulo elimina el patron de `checkCompany`/`getLineName`, pero introduce el problema R-03 (datos obsoletos). |
| M-07 | Media | Promise.all en borrados en cascada | NO APLICADO | Las vistas actuales no implementan borrado en cascada (TES antes de sala/empresa/timer). No se sabe si el backend lo hace automaticamente. |
| M-08 | Media | Eliminar Swal de service.js | SI | Swal solo en vistas. Correcto. |
| M-09 | Media | Variables de entorno con process.env | SI | `VITE_API_URL` y `VITE_SOCKET_URL` en `config/env.ts`. Correcto. |
| M-10 | Baja | Convertir class components a functional components | SI | Todos son functional components con hooks. |
| M-11 | Baja | Eliminar o arreglar EmpresasEventoTimers | SI | La ruta antigua fue eliminada. La nueva es `EmpresasEventoView`. |
| M-12 | Baja | Hacer idEvento dinamico | REGRESION | Se hizo dinamico (select en UI), pero ahora el select puede estar vacio — peor que el hardcode de `1`. |

**Notas ignoradas criticas**: M-07 (borrado en cascada) y la advertencia sobre verificar el formato de respuesta del token (`{ response: string }` vs `string` plano) no estan documentadas como resueltas y su estado real es incierto.

---

## 6. Lista priorizada de bugs activos y su causa raiz

### Prioridad 1 — CRITICOS (rompen flujo principal)

| # | Bug | Archivo:linea | Causa raiz | Conexion con cambio |
|---|-----|--------------|------------|---------------------|
| C-01 | Bucle de navegacion post-login | `LoginView.tsx:19` | `navigate('/login')` en lugar de `navigate('/')` | Regresion de refactorizacion — la original no usaba navigate |
| C-02 | Token puede guardarse como `[object Object]` si backend devuelve `{ response: string }` | `authService.ts:9`, `service.ts:82` | Cambio de forma de respuesta del endpoint no verificado | Cambio de M-01 asumio que el backend ya devuelve string plano |
| C-03 | DELETE de TES puede usar `uniqueId: undefined` | `EmpresasEventoView.tsx:71`, `service.ts:201` | Campo PK renombrado de `id` a `uniqueId` sin funcion de mapeo defensiva para TES | Cambio de modelo 2.5 |
| C-04 | Datos de TimerView y HorarioView nunca se refrescan al navegar | `TimerView.tsx:9-10` | Promesas de modulo ejecutadas una sola vez al importar | Regresion — la original recargaba en componentDidMount |

### Prioridad 2 — ALTOS (degradacion seria del flujo)

| # | Bug | Archivo:linea | Causa raiz | Conexion con cambio |
|---|-----|--------------|------------|---------------------|
| A-01 | ProtectedRoute existe pero no protege ninguna ruta | `router/index.tsx` | Componente creado pero no conectado en el router | Regresion — falsa promesa de seguridad |
| A-02 | 401 destruye estado React con recarga completa | `httpClient.ts:23-24` | `window.location.href` en lugar de usar el router de React | Efecto secundario de M-01 |
| A-03 | Select "Evento" vacio en instalacion limpia | `EmpresasEventoView.tsx:37` | Eventos derivados de asignaciones existentes, no de tabla propia | Regresion del fix de M-12 |
| A-04 | Sort de timers inestable | `TemporizadoresView.tsx:42-44` | Comparador `? -1 : 1` sin manejo de igualdad sobre DateTime | Bug nuevo introducido en refactorizacion |
| A-05 | useOptimistic fuera de transicion en todos los deletes | 5 vistas | Actualizacion optimista sin `startTransition` | API de React 19 mal aplicada |
| A-06 | PUT IncreaseTimers con capitalizacion distinta al original | `service.ts:186` | `api/Timers/IncreaseTimers/:minutes` vs `api/timers/increasetimers/:minutes` | Cambio sin verificar compatibilidad backend |

### Prioridad 3 — MEDIOS (comportamiento incorrecto menor)

| # | Bug | Archivo:linea | Causa raiz |
|---|-----|--------------|------------|
| M-01 | Sin ErrorBoundary en ninguna vista con Suspense | Todas las vistas | Error de API causa pantalla en blanco |
| M-02 | Efecto de limpieza de tema sobreescribe preferencias | `Menu.tsx:7-14` | Codigo de limpieza de feature antigua no eliminado |
| M-03 | Socket sin manejo de reconexion visible al usuario | `TimerContext.tsx`, `socketClient.ts` | Socket.IO por defecto no notifica fallos al UI |
| M-04 | Excepciones de config sin ErrorBoundary | `config/env.ts:6-7` | Pantalla en blanco si falta variable de entorno en produccion |

### Prioridad 4 — BAJOS (deuda tecnica)

| # | Problema | Archivo:linea |
|---|----------|--------------|
| B-01 | `AuthToken`, `Evento`, `SocketClientEvents.panic` declarados sin uso | `types/index.ts:57, 61, 76` |
| B-02 | `getSala`, `getEmpresasTimers`, `findTimersEventosEmpresa`, `findTimersEventosSala` sin consumidores en UI | `service.ts:93, 212, 224, 231` |
| B-03 | Borrado en cascada (TES antes de padre) no implementado | Ninguna vista |

---

## 7. Recomendacion de orden de fixes

### Sprint 1 — Desbloquear el flujo critico (1-2 dias)

**Fix 1.1 — Corregir bucle de navegacion post-login (30 min)**
- Archivo: `src/views/LoginView.tsx:19`
- Cambiar `navigate('/login')` a `navigate('/')`
- Sin esto, el administrador no puede usar la app tras autenticarse.

**Fix 1.2 — Verificar y fijar formato de respuesta del token (variable)**
- Comparar `POST Auth/Login` real con Postman o DevTools.
- Si devuelve `{ response: "<JWT>" }`, actualizar `service.ts:82` y `authService.ts:9`:
  ```typescript
  // service.ts
  const { data } = await httpClient.post<{ response: string }>('Auth/Login', credentials)
  return data.response
  ```
- Si ya devuelve `string` plano, no hay cambio.

**Fix 1.3 — Añadir mapeo defensivo para TES (1-2 horas)**
- Archivo: `src/services/service.ts`, antes de la seccion TiempoEmpresaSala
- Añadir tipo `ApiTES` y funcion `mapTES` con fallback `uniqueId: data.uniqueId ?? (data as any).id ?? 0`
- Actualizar `getTES` para pasar por `mapTES`

### Sprint 2 — Fijar datos obsoletos y proteccion de rutas (1 dia)

**Fix 2.1 — Mover promesas de modulo a estado de componente en TimerView y HorarioView (2-3 horas)**
- `TimerView.tsx`: eliminar las constantes de modulo (lineas 9-10), mover la carga a `useState` con un mecanismo de refresco igual que hacen `SalasView`, `EmpresasView`.
- Mismo patron en `HorarioView.tsx`.

**Fix 2.2 — Conectar ProtectedRoute en el router (1 hora)**
- Archivo: `src/router/index.tsx`
- Envolver las rutas `/temporizadores`, `/salas`, `/empresas`, `/categorias`, `/empresastimersnew` con `ProtectedRoute` como elemento padre.

### Sprint 3 — Fijar comportamientos incorrectos (1-2 dias)

**Fix 3.1 — Corregir select "Evento" en EmpresasEventoView (2-4 horas)**
- Opcion A (simple): hardcodear `idEvento: 1` si el sistema solo tiene un evento, como hacia la original.
- Opcion B (correcto): añadir endpoint `api/eventos` en `service.ts` y cargar eventos independientemente de las asignaciones.
- Archivo: `src/views/EmpresasEventoView.tsx:37`

**Fix 3.2 — Corregir sort de timers (15 min)**
- Archivo: `src/views/TemporizadoresView.tsx:42-44`
- Cambiar comparador a: `parseTimerInicio(a.inicio).toMillis() - parseTimerInicio(b.inicio).toMillis()`

**Fix 3.3 — Envolver removeOptimistic en startTransition en todas las vistas (1 hora)**
- Archivos: `SalasView.tsx`, `EmpresasView.tsx`, `CategoriasView.tsx`, `TemporizadoresView.tsx`, `EmpresasEventoView.tsx`
- Patron correcto:
  ```typescript
  startTransition(() => removeOptimistic(id))
  await deleteXxx(id)
  onRefresh()
  ```

**Fix 3.4 — Fijar redireccion 401 para que use el router de React (2 horas)**
- Archivo: `src/services/httpClient.ts:23-24`
- Propagar el error al `AuthContext` para que llame a `logout()` y luego navegue con el router de React en lugar de `window.location.href`.

**Fix 3.5 — Verificar capitalización de IncreaseTimers con el backend (30 min)**
- Comprobar si `api/Timers/IncreaseTimers/:minutes` funciona o si hay que volver a `api/timers/increasetimers/:minutes`.

### Sprint 4 — Robustez y calidad (1-2 dias)

**Fix 4.1 — Añadir ErrorBoundary por vista o en RootLayout**
- Previene pantallas en blanco ante errores de API o de configuracion.

**Fix 4.2 — Eliminar efecto de tema en Menu.tsx:7-14**
- Codigo de limpieza que ya no corresponde a ninguna feature activa.

**Fix 4.3 — Implementar borrado en cascada donde aplique**
- Confirmar primero si el backend hace ON DELETE CASCADE automaticamente.
- Si no, replicar el patron de la original con `Promise.all`.

**Fix 4.4 — Limpiar tipos sin uso**
- Eliminar o usar `AuthToken`, `Evento`, `SocketClientEvents.panic` de `src/types/index.ts`.

---

## 8. Resumen ejecutivo de la comparacion

La migracion de CRA+JS a Vite+TS+React19 fue correcta en infraestructura (M-01 a M-03, M-08, M-09 aplicados) pero introdujo cuatro regresiones criticas que bloquean el flujo del administrador y producen datos inconsistentes:

1. El bucle de navegacion post-login (C-01) hace imposible usar la sesion de administrador.
2. El formato del token (C-02) puede estar guardando un valor invalido en localStorage sin error visible.
3. El campo PK de TES renombrado sin mapeo defensivo (C-03) puede causar DELETE a ID indefinido.
4. Las promesas de modulo en TimerView y HorarioView (C-04) producen datos obsoletos permanentemente.

El orden de fix recomendado sigue la prioridad: desbloquear el flujo critico primero (Sprint 1), luego corregir datos obsoletos y proteccion de rutas (Sprint 2), luego comportamientos incorrectos de menor impacto (Sprint 3), y finalmente robustez general (Sprint 4).
