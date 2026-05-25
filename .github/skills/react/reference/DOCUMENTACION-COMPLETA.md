# Timers Tajamar — Documentación Completa

Sistema de gestión de temporizadores para el **Foro de Empleo de Tajamar**. Controla el tiempo de turno de cada empresa por sala en tiempo real, sincronizando todos los clientes mediante WebSockets.

---

## Tabla de contenidos

1. [Arquitectura general](#1-arquitectura-general)
2. [Flujo principal de uso](#2-flujo-principal-de-uso)
3. [Estructura del repositorio](#3-estructura-del-repositorio)
4. [Stack tecnológico](#4-stack-tecnológico)
5. [Rutas del frontend](#5-rutas-del-frontend)
6. [Endpoints REST](#6-endpoints-rest)
7. [Eventos Socket.IO](#7-eventos-socketio)
8. [Modelos de datos](#8-modelos-de-datos)
9. [Componentes React](#9-componentes-react)

---

## 1. Arquitectura general

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENTE                              │
│           React SPA (AppTimersFinal-master)                 │
│        https://apitimerstesting.azurewebsites.net           │
└───────────────────┬──────────────────┬──────────────────────┘
                    │ REST (axios)      │ Socket.IO
                    ▼                  ▼
┌───────────────────────┐   ┌──────────────────────────────┐
│   API REST (.NET)     │   │  Sync Server (Node.js)       │
│ apitimers.azurewebsi- │   │ timertajamarback.azurewebsi- │
│ tes.net               │   │ tes.net  (puerto 3002)       │
└───────────┬───────────┘   └──────────────┬───────────────┘
            │                              │ también llama
            ▼                              │ a la API REST
    ┌──────────────┐                       │
    │  SQL Server  │◄──────────────────────┘
    │  (Azure)     │
    └──────────────┘
```

| Componente | Tecnología | URL (producción) |
|---|---|---|
| Frontend SPA | React 18 + Bootstrap 5 | `apitimerstesting.azurewebsites.net` |
| API REST | .NET (no está en este repo) | `apitimers.azurewebsites.net` |
| Sync Server | Node.js + Express + Socket.IO | `timertajamarback.azurewebsites.net` |
| Base de datos | SQL Server (Azure) | — |

> El backend .NET (`apitimers`) **no está en este repositorio**. Solo existe el cliente React y el servidor de sincronización Node.js.

---

## 2. Flujo principal de uso

1. El administrador entra en `/login` y se autentica.
2. Crea/configura **categorías** (duración en minutos), **empresas**, **salas** y **temporizadores** con fecha/hora de inicio.
3. En la vista `/` (TimerView) el operador pulsa **"Vamos"** → el cliente emite el evento Socket.IO `vamos`.
4. El sync server ajusta los tiempos de todos los temporizadores al instante actual (via `PUT /api/timers/IncreaseTimers/{diff}`), luego inicia el countdown interno.
5. Cada segundo el servidor hace `broadcast` de `timerID` + `envio` (segundos restantes) a **todos** los clientes conectados.
6. Los clientes muestran la cuenta atrás en pantalla. Al terminar un timer, el servidor pasa automáticamente al siguiente.

---

## 3. Estructura del repositorio

```
PRUEBAS/
├── AppTimersFinal-master/   React SPA (frontend)
│   └── src/
│       ├── components/      Vistas y componentes UI
│       ├── services/
│       │   └── service.js   Capa de acceso a API REST + Socket.IO
│       ├── Global.js        URLs de entorno
│       └── Router.js        Definición de rutas
├── syncServerTimers-master/ Servidor de sincronización
│   └── index.js             Express + Socket.IO server
├── Script_Timers.txt        DDL/DML completo de la base de datos
└── docs/                    Documentación
```

---

## 4. Stack tecnológico

**Frontend**
- React 18.2 · React Router 6.4 · Bootstrap 5.2
- Socket.IO Client 4.5 · Axios 1.2 · Luxon 3.7 · SweetAlert2 11

**Sync Server**
- Node.js ≥20 · Express 4.18 · Socket.IO 4.5 · Axios 1.2 · Luxon 3.7

**Infraestructura**
- Azure App Service (API .NET + Sync Server) · SQL Server (Azure)
- Vercel (configurado como alternativa para el sync server)

---

## 5. Rutas del frontend

| Ruta | Componente | Descripción |
|---|---|---|
| `/` | `TimerView` | Vista pública del countdown en tiempo real |
| `/login` | `Login` | Autenticación de administrador |
| `/horario` | `Horario` | Calendario/horario de timers |
| `/salas` | `Salas` | CRUD de salas |
| `/empresas` | `Empresas` | CRUD de empresas |
| `/categorias` | `Categorias` | CRUD de categorías de timer |
| `/temporizadores` | `Temporizadores` | CRUD de temporizadores |
| `/empresastimersnew` | `EmpresasEventoTimersNew` | Eventos por empresa |

---

## 6. Endpoints REST

**Base URL (producción):** `https://apitimers.azurewebsites.net/`  
**Base URL (testing / frontend apunta a):** `https://apitimerstesting.azurewebsites.net/`

Configurado en `AppTimersFinal-master/src/Global.js`. El sync server usa directamente `https://apitimers.azurewebsites.net/`.

### Autenticación

| Método | Endpoint | Body | Respuesta | Descripción |
|---|---|---|---|---|
| `POST` | `Auth/Login` | `{ userName, password }` | JWT token | Login de administrador |

El token se almacena en `localStorage`. Las llamadas posteriores lo incluyen en el header `Authorization: Bearer <token>`.

### Salas (`SALASTIMERS`)

| Método | Endpoint | Params | Descripción |
|---|---|---|---|
| `GET` | `api/salas` | — | Lista todas las salas |
| `GET` | `api/salas/{idsala}` | `idsala: int` | Obtiene una sala por ID |
| `POST` | `api/salas/createsala/{nombreSala}` | `nombreSala: string` | Crea una nueva sala |
| `PUT` | `api/salas/updatesala/{idSala}/{nombreSala}` | `idSala: int, nombreSala: string` | Renombra una sala |
| `DELETE` | `api/salas/{idSala}` | `idSala: int` | Elimina una sala |

### Empresas (`EMPRESASTIMERS`)

| Método | Endpoint | Params | Descripción |
|---|---|---|---|
| `GET` | `api/empresas` | — | Lista todas las empresas |
| `GET` | `api/empresas/{idempresa}` | `idempresa: int` | Obtiene una empresa por ID |
| `POST` | `api/empresas/createempresa/{nombreEmpresa}` | `nombreEmpresa: string` | Crea una empresa |
| `PUT` | `api/empresas/updateempresa/{idEmpresa}/{nombreEmpresa}` | `idEmpresa: int, nombreEmpresa: string` | Renombra una empresa |
| `DELETE` | `api/empresas/{idEmpresa}` | `idEmpresa: int` | Elimina una empresa |

### Categorías de timer (`CATEGORIAS_TIMER`)

| Método | Endpoint | Body | Descripción |
|---|---|---|---|
| `GET` | `api/categoriastimer` | — | Lista todas las categorías |
| `GET` | `api/categoriastimer/{idcategoria}` | — | Obtiene una categoría |
| `POST` | `api/categoriastimer` | `{ idCategoria, categoria, duracion }` | Crea una categoría |
| `PUT` | `api/categoriastimer` | `{ idCategoria, categoria, duracion }` | Actualiza una categoría |
| `DELETE` | `api/categoriastimer/{idcategoria}` | — | Elimina una categoría |

> Tras POST/PUT/DELETE de categorías se emite el evento Socket.IO `syncData` para que el sync server recargue su caché.

### Temporizadores (`TEMPORIZADORES`)

| Método | Endpoint | Body | Descripción |
|---|---|---|---|
| `GET` | `api/timers` | — | Lista todos los timers |
| `POST` | `api/timers` | `{ idTemporizador, inicio, idCategoria, pausa }` | Crea un timer |
| `PUT` | `api/timers` | `{ idTemporizador, inicio, idCategoria, pausa }` | Actualiza un timer |
| `DELETE` | `api/timers/{idTimer}` | — | Elimina un timer |
| `PUT` | `api/timers/increasetimers/{minutes}` | — | Desplaza **todos** los timers `n` minutos (positivo o negativo) |

> Tras POST/PUT/DELETE de timers se emite `syncData`. El endpoint `increasetimers` es el usado por el sync server al arrancar en modo manual para alinear los timers al tiempo real.

### Tiempos Empresas Salas (`TIEMPOS_EMPRESAS_SALAS`)

Tabla de relación N:N entre timers, empresas, salas y eventos.

| Método | Endpoint | Body | Descripción |
|---|---|---|---|
| `GET` | `api/TiempoEmpresaSala` | — | Lista todas las asignaciones |
| `POST` | `api/TiempoEmpresaSala` | `{ uniqueId, idTimer, idEmpresa, idSala, idEvento }` | Crea una asignación |
| `DELETE` | `api/TiempoEmpresaSala/{idTES}` | — | Elimina una asignación |

### Timer Eventos (vista `TIEMPOS_EVENTOSTIMERS`)

Endpoints que consumen la **vista SQL** que cruza todas las tablas.

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `api/timereventos` | Lista completa de timer-eventos (vista JOIN) |
| `GET` | `api/timereventos/empresastimers` | Lista empresas que tienen timers asignados |
| `GET` | `api/timereventos/eventosactualesempresa/{idempresa}` | Timers actuales (en curso o próximos) de una empresa |
| `GET` | `api/timereventos/eventosempresa/{idempresa}` | Todos los eventos de una empresa |
| `GET` | `api/timereventos/eventossala/{idsala}` | Todos los eventos de una sala |

### Resumen de recursos

| Recurso | GET lista | GET por ID | POST | PUT | DELETE |
|---|---|---|---|---|---|
| Salas | ✅ | ✅ | ✅ | ✅ | ✅ |
| Empresas | ✅ | ✅ | ✅ | ✅ | ✅ |
| Categorías | ✅ | ✅ | ✅ | ✅ | ✅ |
| Timers | ✅ | — | ✅ | ✅ | ✅ |
| Timers (bulk update) | — | — | — | ✅ (`increasetimers`) | — |
| TiempoEmpresaSala | ✅ | — | ✅ | — | ✅ |
| TimerEventos (vistas) | ✅ (5 variantes) | — | — | — | — |

---

## 7. Eventos Socket.IO

**URL del servidor:** `https://timertajamarback.azurewebsites.net/`  
**Puerto local:** 3002  
**Librería:** Socket.IO 4.5 (cliente y servidor)  
**CORS:** abierto a todos los orígenes (`origin: true`)

Conexión gestionada en `AppTimersFinal-master/src/services/service.js` y servidor en `syncServerTimers-master/index.js`.

### Diagrama de flujo

```
Cliente (React)                    Sync Server (Node.js)              API REST (.NET)
      │                                    │                                │
      │──── emit("vamos") ────────────────►│                                │
      │                                    │── PUT /api/timers/             │
      │                                    │   IncreaseTimers/{diff} ──────►│
      │                                    │◄── 200 OK ─────────────────────│
      │                                    │── GET /api/CategoriasTimer ───►│
      │                                    │── GET /api/timers ────────────►│
      │                                    │◄── [timers ordenados] ─────────│
      │                                    │                                │
      │                          [cada segundo]                             │
      │◄─── broadcast("timerID", idTimer) ─│                                │
      │◄─── broadcast("envio", segundos) ──│                                │
      │                                    │                                │
      │──── emit("syncData") ─────────────►│                                │
      │                                    │── GET /api/CategoriasTimer ───►│
      │                                    │── GET /api/timers ────────────►│
      │                                    │                                │
      │──── emit("panic") ────────────────►│  [reset estado interno]        │
```

### Eventos CLIENTE → servidor

#### `vamos`
Inicia los timers usando el método nuevo (Luxon, zona `Europe/Madrid`).

- Calcula la diferencia en minutos entre `ahora` y el primer timer.
- Llama a `PUT /api/timers/IncreaseTimers/{diff}` para alinear todos los timers al tiempo real.
- Inicia el countdown interno del servidor.
- **Usado desde:** botón "Vamos" en `Login.js`.

#### `start`
Inicia los timers usando el método antiguo (Date nativo, sin timezone explícita).

- Mismo comportamiento que `vamos` pero con `startTimersManul()` (typo heredado).
- **Deprecated de facto** — `vamos` es el método activo.

#### `syncData`
Solicita al servidor que recargue categorías y timers desde la API REST.

- No reinicia el countdown si hay uno en curso.
- Se emite automáticamente desde `service.js` tras cada POST/PUT/DELETE de timers, categorías.
- **Usado desde:** `postTemporizador`, `putTemporizador`, `deleteTemporizador`, `postCategoria`, `putCategoria`, `deleteCategoria`, `updateIncreaseTimers`.

#### `panic`
Reset de emergencia del estado interno del servidor.

- Limpia `timersOrdenados`, `corriendo`, `intervaloComprovarHora`.
- **Ningún botón activo emite este evento.** En `Login.js`, `socket.emit("panic")` está comentado dentro de `resetEmergency()`, y el botón que llama a esa función también está comentado en el render.

> **Advertencia:** El listener en el servidor (`socket.on("panic", () => { panic(); })`) llama a `panic()` que **no está definida** — lanzaría `ReferenceError` en runtime si el evento llegase al servidor.

### Eventos SERVIDOR → clientes (broadcast)

#### `timerID`
**Payload:** `idTimer` (int)

Emitido cada segundo durante el countdown. Indica qué timer está corriendo actualmente. Los clientes usan este ID para saber qué empresa/sala mostrar.

#### `envio`
**Payload:** `tiempoRestante` (int, segundos)

Emitido cada segundo. Segundos que quedan del timer actual. Cuando llega a `0` el servidor pasa al siguiente timer automáticamente.

### Estado interno del servidor

El sync server mantiene estado en memoria (no persiste entre reinicios):

| Variable | Tipo | Descripción |
|---|---|---|
| `timersOrdenados` | `Array` | Lista de timers ordenada por `inicio`, cargada desde la API |
| `categoriasTimer` | `Array` | Lista de categorías con duración, usada para calcular segundos |
| `corriendo` | `boolean` | `true` si hay un countdown activo |
| `intervaloComprovarHora` | `Interval \| false` | Interval que comprueba si ha llegado la hora del primer timer |

### Lógica de encadenamiento de timers

```
timerStart()
  └─► broadcast cada segundo: timerID + envio
  └─► cuando tiempoRestante <= 0:
        timersOrdenados.shift()  // elimina el timer completado
        si quedan timers → continuarTimers()
                              └─► inicioTimer() → setInterval 1s comprobando hora
                                      └─► cuando llega la hora → timerStart()
        si no quedan  → syncData(null) // recarga desde API
```

> **Advertencia — inconsistencia de timezone:** `vamos` usa **Luxon** con zona `Europe/Madrid` para calcular el diff del primer timer. `continuarTimers()` → `inicioTimer()` usa **`addUnaHora(new Date())`** (suma 60 min al reloj UTC del servidor) para todos los timers posteriores. Son dos mecanismos distintos: si el servidor cambia de zona horaria o en periodos de cambio de hora (horario de verano/invierno), los timers del segundo en adelante pueden desfasarse respecto al primero.

---

## 8. Modelos de datos

Base de datos SQL Server (Azure). DDL completo en `Script_Timers.txt`.

### Diagrama entidad-relación

```
USUARIOSTIMERS          EVENTOSTIMERS
──────────────          ─────────────────────
IDUSUARIO (PK)          IDEVENTO (PK)
USERNAME                EVENTO
PASS                    INICIOEVENTO  datetime
                        FINEVENTO     datetime
                              │
                              │ FK_TIEMPOS_EMPRESAS_SALAS_EVENTOS
                              ▼
CATEGORIAS_TIMER ──FK──► TEMPORIZADORES ──────────────────────────────────────┐
─────────────────        ──────────────                                        │
IDCATEGORIA (PK)         IDTIMER (PK)                                          │
CATEGORIA                INICIO    datetime                                    │
DURACION  int (min)      IDCATEGORIA  int  FK→CATEGORIAS_TIMER                │
                         PAUSA     bit                                         │
                              │                                                │
                              │ FK_TIEMPOS_EMPRESAS_SALAS_TEMPORIZADORES      │
                              ▼                                                │
                    TIEMPOS_EMPRESAS_SALAS ◄────────────────────────────────────┘
                    ──────────────────────
                    UNIQUEID (PK)
                    IDTIMER   int  FK→TEMPORIZADORES
                    IDEMPRESA int  FK→EMPRESASTIMERS
                    IDSALA    int  FK→SALASTIMERS
                    IDEVENTO  int  FK→EVENTOSTIMERS
                         ▲            ▲
                         │            │
              EMPRESASTIMERS      SALASTIMERS
              ─────────────────   ───────────
              IDEMPRESA (PK)      IDSALA (PK)
              EMPRESA             SALA
              IMAGEN  nvarchar(550)
```

### Tablas

#### `CATEGORIAS_TIMER`
Define los tipos de turno y su duración.

| Columna | Tipo | Descripción |
|---|---|---|
| `IDCATEGORIA` | `int` PK | Identificador |
| `CATEGORIA` | `nvarchar(50)` | Nombre (ej: "TRABAJO", "MINI DESCANSO") |
| `DURACION` | `int` | Duración en **minutos** |

Datos de ejemplo:
```
1 → TRABAJO        → 15 min
2 → MINI DESCANSO  →  5 min
3 → DESCANSO LARGO → 60 min
```

#### `TEMPORIZADORES`
Cada fila es una ocurrencia concreta de un timer (fecha + hora de inicio + categoría).

| Columna | Tipo | Descripción |
|---|---|---|
| `IDTIMER` | `int` PK | Identificador |
| `INICIO` | `datetime` | Fecha y hora de inicio del turno |
| `IDCATEGORIA` | `int` FK | Referencia a `CATEGORIAS_TIMER` |
| `PAUSA` | `bit` | Si el timer está pausado (0/1) |

#### `EMPRESASTIMERS`
Empresas participantes en el foro.

| Columna | Tipo | Descripción |
|---|---|---|
| `IDEMPRESA` | `int` PK | Identificador |
| `EMPRESA` | `nvarchar(250)` | Nombre de la empresa |
| `IMAGEN` | `nvarchar(550)` | URL del logotipo |

Empresas registradas (48 en total): AVANADE, ENCAMINA, SOGETI, CAPGEMINI, BANKINTER, BBVA IT, ACCENTURE, EY, KPMG, AIRBUS, etc.

#### `SALASTIMERS`
Salas físicas donde se realizan las entrevistas.

| Columna | Tipo | Descripción |
|---|---|---|
| `IDSALA` | `int` PK | Identificador |
| `SALA` | `nvarchar(250)` | Nombre de la sala |

Salas registradas:
```
1 → FP SISTEMAS
2 → FP DESARROLLO
3 → MASTER SISTEMAS
4 → UNIVERSIDAD
5 → MASTER DESARROLLO
6 → MASTER CIBERSEGURIDAD
7 → BIG DATA
```

#### `EVENTOSTIMERS`
Eventos del foro (sesión de mañana / tarde).

| Columna | Tipo | Descripción |
|---|---|---|
| `IDEVENTO` | `int` PK | Identificador |
| `EVENTO` | `nvarchar(150)` | Nombre del evento |
| `INICIOEVENTO` | `datetime` | Inicio del evento |
| `FINEVENTO` | `datetime` | Fin del evento |

#### `TIEMPOS_EMPRESAS_SALAS`
Tabla de relación: asigna qué empresa ocupa qué sala en qué timer (turno) dentro de qué evento.

| Columna | Tipo | Descripción |
|---|---|---|
| `UNIQUEID` | `int` PK | Identificador único |
| `IDTIMER` | `int` FK | Referencia a `TEMPORIZADORES` |
| `IDEMPRESA` | `int` FK | Referencia a `EMPRESASTIMERS` |
| `IDSALA` | `int` FK | Referencia a `SALASTIMERS` |
| `IDEVENTO` | `int` FK | Referencia a `EVENTOSTIMERS` |

#### `USUARIOSTIMERS`
Usuarios del sistema de administración.

| Columna | Tipo | Descripción |
|---|---|---|
| `IDUSUARIO` | `int` PK | Identificador |
| `USERNAME` | `nvarchar(50)` | Nombre de usuario |
| `PASS` | `nvarchar(50)` | Contraseña en texto plano ⚠️ |

> **Alerta de seguridad:** contraseñas almacenadas en texto plano. Sin hash, sin salt.

### Vista SQL: `TIEMPOS_EVENTOSTIMERS`

JOIN de todas las tablas. Consumida por el endpoint `api/timereventos`.

Columnas que expone:
```
UniqueId, IDEMPRESA, IDTIMER, IDSALA, IDEVENTO,
IDCATEGORIA, INICIO, PAUSA, CATEGORIA, DURACION,
SALA, EVENTO, INICIOEVENTO, FINEVENTO, EMPRESA, IMAGEN
```

### Stored Procedures

| Procedimiento | Parámetros | Descripción |
|---|---|---|
| `SP_INCREASETIMERS` | `@INCREASE int` | Desplaza todos los `INICIO` de `TEMPORIZADORES` en `n` minutos. Lógica especial: si `@INCREASE < 0`, suma `@INCREASE + 60` (workaround de zona horaria). |
| `SP_GETTIEMPOEMPRESASTIMERSACTUAL` | `@IDEMPRESA int` | Devuelve los 2 próximos timers de una empresa (donde `INICIO >= GETDATE()`). |
| `SP_DELETETIMERS` | — | Borra **todos** los registros de `TIEMPOS_EMPRESAS_SALAS` y `TEMPORIZADORES`. |
| `SP_DELETETIMER` | `@IDTIMER int` | Borra un timer específico y sus relaciones en `TIEMPOS_EMPRESAS_SALAS`. |

### Modelos JavaScript (frontend / sync server)

Los objetos que viajan por la API no tienen tipado formal (no hay TypeScript). Forma inferida:

#### Timer
```js
{
  idTemporizador: number,
  inicio: string,        // ISO 8601: "2025-01-23T10:05:00.000"
  idCategoria: number,
  pausa: boolean
}
```

#### Categoría
```js
{
  idCategoria: number,
  categoria: string,
  duracion: number       // minutos
}
```

#### Empresa
```js
{
  idEmpresa: number,
  empresa: string,
  imagen: string         // URL
}
```

#### Sala
```js
{
  idSala: number,
  sala: string
}
```

#### TiempoEmpresaSala
```js
{
  uniqueId: number,
  idTimer: number,
  idEmpresa: number,
  idSala: number,
  idEvento: number
}
```

#### TimerEvento (vista)
```js
{
  uniqueId: number,
  idEmpresa: number,
  idTimer: number,
  idSala: number,
  idEvento: number,
  idCategoria: number,
  inicio: string,
  pausa: boolean,
  categoria: string,
  duracion: number,
  sala: string,
  evento: string,
  inicioEvento: string,
  finEvento: string,
  empresa: string,
  imagen: string
}
```

---

## 9. Componentes React

Todos en `AppTimersFinal-master/src/components/`. La capa de acceso a datos está centralizada en `service.js` — ningún componente llama a `axios` directamente.

### TimerView — Vista pública del countdown

**Ruta:** `/` | **Archivo:** `TimerView.js`

Vista principal que ven los asistentes al foro en pantalla grande.

- Conecta al Socket.IO y escucha `timerID` + `envio` para actualizar el countdown en tiempo real.
- Permite seleccionar la sala activa (filtra qué empresa se muestra).
- Muestra empresa actual (logo + nombre), tiempo restante y próximos timers.

**Eventos Socket.IO escuchados:** `timerID`, `envio`

### Login — Administración

**Ruta:** `/login` | **Archivo:** `Login.js`

Panel de control del operador.

- Formulario de autenticación → llama a `service.generateToken()` → guarda el JWT en `localStorage`.
- Botón **"Iniciar Evento"** → emite `vamos` al sync server para arrancar los timers.
- Botón de incremento → llama a `service.updateIncreaseTimers(n)` para desplazar todos los timers.

> **Nota:** El botón "Resetear Temporizadores" (`resetEmergency()`) está **comentado en el render** — no aparece en la UI actual. Internamente emitía `start`; `socket.emit("panic")` también estaba comentado. Ningún botón activo emite `panic`.

**Métodos de service usados:** `generateToken`, `updateIncreaseTimers`  
**Eventos Socket.IO emitidos:** `vamos`

### Menu — Navegación

**Archivos:** `Menu.js` / `MenuPopUp.js`

Barra de navegación superior con enlaces a todas las rutas de administración. Muestra/oculta opciones según si hay token en `localStorage`.

### Categorias — CRUD de categorías

**Ruta:** `/categorias` | **Archivo:** `Categorias.js`

- Lista todas las categorías (nombre + duración).
- Formulario para crear/editar categoría con campo de duración en formato `HH:MM`.
- Validación: no permite duplicados por nombre.
- Elimina categorías con confirmación SweetAlert2.

**Métodos de service usados:** `getCategorias`, `getCategoria`, `postCategoria`, `putCategoria`, `deleteCategoria`

### Empresas — CRUD de empresas

**Ruta:** `/empresas` | **Archivo:** `Empresas.js`

- Lista empresas con logo.
- Crear/editar/eliminar empresas.

**Métodos de service usados:** `getEmpresas`, `getEmpresa`, `postEmpresa`, `putEmpresa`, `deleteEmpresa`

### Salas — CRUD de salas

**Ruta:** `/salas` | **Archivos:** `Salas.js` / `SalaPopUp.js`

- Lista salas disponibles.
- Crear/renombrar/eliminar salas.

**Métodos de service usados:** `getSalas`, `getSala`, `postSala`, `putSala`, `deleteSala`

### Temporizadores — CRUD de timers

**Ruta:** `/temporizadores` | **Archivo:** `Temporizadores.js`

- Lista todos los timers ordenados por fecha de inicio.
- Formulario para crear un timer: fecha/hora de inicio + categoría.
- Editar/eliminar timers.
- Al crear/editar/borrar emite `syncData` vía `service.js`.

**Métodos de service usados:** `getTemporizadores`, `getCategorias`, `postTemporizador`, `putTemporizador`, `deleteTemporizador`

### Horario — Vista de calendario

**Ruta:** `/horario` | **Archivos:** `Horario.js` / `HorarioActualEmpresaPopUp.js`

- Muestra el horario de timers por sala en formato de agenda.
- `HorarioActualEmpresaPopUp`: popup que muestra los 2 próximos turnos de una empresa.

**Métodos de service usados:** `getTimersEventos`, `findTimersEventosSala`, `findTimersActualesEmpresa`

### EmpresasEventoTimers / EmpresasEventoTimersNew

**Ruta activa:** `/empresastimersnew` | **Archivos:** `EmpresasEventoTimers.js`, `EmpresasEventoTimersNew.js`

Gestión de la relación empresa-sala-evento-timer. `New` es la versión activa; la otra es legacy.

- Asignar qué empresa ocupa qué sala en cada slot de tiempo.

**Métodos de service usados:** `getEmpresas`, `getSalas`, `getTemporizadores`, `getEmpresasTimers`, `getTimersEventos`, `getTES`, `postTES`, `deleteTES`, `findTimersEventosEmpresa`

### Tiempo

**Archivo:** `Tiempo.js`

Componente auxiliar de display de tiempo. Formatea segundos a `MM:SS` para el countdown visible.

### Resumen de dependencias por componente

| Componente | Métodos REST | Eventos Socket |
|---|---|---|
| TimerView | — | escucha: `timerID`, `envio` |
| Login | `generateToken`, `updateIncreaseTimers` | emite: `vamos` |
| Categorias | `getCategorias`, `getCategoria`, `postCategoria`, `putCategoria`, `deleteCategoria` | (via service: `syncData`) |
| Empresas | `getEmpresas`, `getEmpresa`, `postEmpresa`, `putEmpresa`, `deleteEmpresa` | — |
| Salas | `getSalas`, `getSala`, `postSala`, `putSala`, `deleteSala` | — |
| Temporizadores | `getTemporizadores`, `getCategorias`, `postTemporizador`, `putTemporizador`, `deleteTemporizador` | (via service: `syncData`) |
| Horario | `getTimersEventos`, `findTimersEventosSala`, `findTimersActualesEmpresa` | — |
| EmpresasEventoTimersNew | `getEmpresas`, `getSalas`, `getTemporizadores`, `getEmpresasTimers`, `getTimersEventos`, `getTES`, `postTES`, `deleteTES`, `findTimersEventosEmpresa` | — |
