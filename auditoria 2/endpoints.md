# Endpoints y API calls — events-timer

Todos los endpoints parten de la `baseURL` configurada en `VITE_API_URL` (dev: `https://apitimerstesting.azurewebsites.net/`, prod: `https://apitimers.azurewebsites.net/`).

El cliente HTTP es Axios (`src/services/httpClient.ts`) con interceptor que adjunta el JWT de `localStorage` en la cabecera `Authorization: Bearer <token>`. Si la respuesta es 401 limpia el token y redirige a `/login` via `window.location.href`.

---

## Autenticacion

| Metodo | URL | Payload | Respuesta | Archivo |
|--------|-----|---------|-----------|---------|
| POST | `Auth/Login` | `{ userName, password }` | `string` (token JWT) | `service.ts:82` |

---

## Salas

| Metodo | URL | Payload | Respuesta | Archivo |
|--------|-----|---------|-----------|---------|
| GET | `api/salas` | — | `ApiSala[]` | `service.ts:89` |
| GET | `api/salas/:idSala` | — | `Sala` | `service.ts:94` |
| POST | `api/salas/createsala/:nombreSala` | — (nombre en URL, encodeURIComponent) | void | `service.ts:99` |
| PUT | `api/salas/updatesala/:idSala/:nombreSala` | — (parametros en URL) | void | `service.ts:103` |
| DELETE | `api/salas/:idSala` | — | void | `service.ts:107` |

---

## Empresas

| Metodo | URL | Payload | Respuesta | Archivo |
|--------|-----|---------|-----------|---------|
| GET | `api/empresas` | — | `ApiEmpresa[]` | `service.ts:113` |
| GET | `api/empresas/:idEmpresa` | — | `ApiEmpresa` | `service.ts:118` |
| POST | `api/empresas/createempresa/:nombreEmpresa` | — (nombre en URL) | void | `service.ts:123` |
| PUT | `api/empresas/updateempresa/:idEmpresa/:nombreEmpresa` | — (parametros en URL) | void | `service.ts:127` |
| DELETE | `api/empresas/:idEmpresa` | — | void | `service.ts:134` |

---

## Categorias de timer

| Metodo | URL | Payload | Respuesta | Archivo |
|--------|-----|---------|-----------|---------|
| GET | `api/categoriastimer` | — | `Categoria[]` | `service.ts:139` |
| GET | `api/categoriastimer/:idCategoria` | — | `Categoria` | `service.ts:144` |
| POST | `api/categoriastimer` | `{ idCategoria: 0, categoria, duracion }` | void | `service.ts:149` |
| PUT | `api/categoriastimer` | `{ idCategoria, categoria, duracion }` | void | `service.ts:154` |
| DELETE | `api/categoriastimer/:idCategoria` | — | void | `service.ts:159` |

---

## Temporizadores

| Metodo | URL | Payload | Respuesta | Archivo |
|--------|-----|---------|-----------|---------|
| GET | `api/timers` | — | `Timer[]` | `service.ts:166` |
| POST | `api/timers` | `{ idTemporizador: 0, inicio, idCategoria, pausa }` | void | `service.ts:171` |
| PUT | `api/timers` | `{ idTemporizador, inicio, idCategoria, pausa }` | void | `service.ts:176` |
| DELETE | `api/timers/:idTimer` | — | void | `service.ts:181` |
| PUT | `api/Timers/IncreaseTimers/:minutes` | — (minutos en URL) | void | `service.ts:186` |

---

## TiempoEmpresaSala (asignaciones)

| Metodo | URL | Payload | Respuesta | Archivo |
|--------|-----|---------|-----------|---------|
| GET | `api/TiempoEmpresaSala` | — | `TiempoEmpresaSala[]` | `service.ts:193` |
| POST | `api/TiempoEmpresaSala` | `{ uniqueId, idTimer, idEmpresa, idSala, idEvento }` | void | `service.ts:198` |
| DELETE | `api/TiempoEmpresaSala/:idTES` | — | void | `service.ts:202` |

---

## TimerEventos (vista JOIN)

| Metodo | URL | Payload | Respuesta | Archivo |
|--------|-----|---------|-----------|---------|
| GET | `api/timereventos` | — | `ApiTimerEvento[]` | `service.ts:208` |
| GET | `api/timereventos/empresastimers` | — | `ApiEmpresa[]` | `service.ts:213` |
| GET | `api/timereventos/eventosactualesempresa/:idEmpresa` | — | `ApiTimerEvento[]` | `service.ts:219` |
| GET | `api/timereventos/eventosempresa/:idEmpresa` | — | `ApiTimerEvento[]` | `service.ts:225` |
| GET | `api/timereventos/eventossala/:idSala` | — | `ApiTimerEvento[]` | `service.ts:232` |

---

## WebSocket (Socket.IO)

Servidor: `VITE_SOCKET_URL` — `https://timertajamarback.azurewebsites.net/`
Transporte: `websocket` exclusivo (sin polling de fallback).

| Direccion | Evento | Dato | Descripcion | Archivo |
|-----------|--------|------|-------------|---------|
| Server -> Client | `timerID` | `number` (idTimer) | Notifica que un timer ha arrancado | `TimerContext.tsx:30` |
| Server -> Client | `envio` | `number` (segundosRestantes) | Tick con segundos restantes | `TimerContext.tsx:35` |
| Client -> Server | `vamos` | — | El admin inicia el evento | `LoginView.tsx:41` |
| Client -> Server | `syncData` | — | Solicita resincronizacion tras mutacion | `service.ts:76` |
| Client -> Server | `panic` | — | Declarado en tipos pero no usado en el cliente | `types/index.ts:76` |

---

## Notas de inconsistencia

- El evento `panic` esta definido en `SocketClientEvents` (tipos) pero ningun componente lo emite.
- `postTES` envia `uniqueId: 0` hardcodeado (`EmpresasEventoView.tsx:50`); el backend debe ignorarlo o generarlo.
- `getSala` (singular) y `getEmpresasTimers` y `findTimersEventosEmpresa` / `findTimersEventosSala` estan disponibles en `service.ts` pero no se usan en ningun componente de la UI actual.
