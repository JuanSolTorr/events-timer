# Endpoints REST consumidos

**Base URL (producción):** `https://apitimers.azurewebsites.net/`  
**Base URL (testing / frontend apunta a):** `https://apitimerstesting.azurewebsites.net/`

Configurado en [AppTimersFinal-master/src/Global.js](../AppTimersFinal-master/src/Global.js).

> El sync server (`syncServerTimers-master/index.js`) usa directamente `https://apitimers.azurewebsites.net/`.

---

## Autenticación

| Método | Endpoint | Body | Respuesta | Descripción |
|---|---|---|---|---|
| `POST` | `Auth/Login` | `{ userName, password }` | JWT token | Login de administrador |

El token se almacena en `localStorage`. Las llamadas posteriores lo incluyen en el header `Authorization: Bearer <token>`.

---

## Salas (`SALASTIMERS`)

| Método | Endpoint | Params | Descripción |
|---|---|---|---|
| `GET` | `api/salas` | — | Lista todas las salas |
| `GET` | `api/salas/{idsala}` | `idsala: int` | Obtiene una sala por ID |
| `POST` | `api/salas/createsala/{nombreSala}` | `nombreSala: string` | Crea una nueva sala |
| `PUT` | `api/salas/updatesala/{idSala}/{nombreSala}` | `idSala: int, nombreSala: string` | Renombra una sala |
| `DELETE` | `api/salas/{idSala}` | `idSala: int` | Elimina una sala |

---

## Empresas (`EMPRESASTIMERS`)

| Método | Endpoint | Params | Descripción |
|---|---|---|---|
| `GET` | `api/empresas` | — | Lista todas las empresas |
| `GET` | `api/empresas/{idempresa}` | `idempresa: int` | Obtiene una empresa por ID |
| `POST` | `api/empresas/createempresa/{nombreEmpresa}` | `nombreEmpresa: string` | Crea una empresa |
| `PUT` | `api/empresas/updateempresa/{idEmpresa}/{nombreEmpresa}` | `idEmpresa: int, nombreEmpresa: string` | Renombra una empresa |
| `DELETE` | `api/empresas/{idEmpresa}` | `idEmpresa: int` | Elimina una empresa |

---

## Categorías de timer (`CATEGORIAS_TIMER`)

| Método | Endpoint | Body | Descripción |
|---|---|---|---|
| `GET` | `api/categoriastimer` | — | Lista todas las categorías |
| `GET` | `api/categoriastimer/{idcategoria}` | — | Obtiene una categoría |
| `POST` | `api/categoriastimer` | `{ idCategoria, categoria, duracion }` | Crea una categoría |
| `PUT` | `api/categoriastimer` | `{ idCategoria, categoria, duracion }` | Actualiza una categoría |
| `DELETE` | `api/categoriastimer/{idcategoria}` | — | Elimina una categoría |

> Tras POST/PUT/DELETE de categorías se emite el evento Socket.IO `syncData` para que el sync server recargue su caché.

---

## Temporizadores (`TEMPORIZADORES`)

| Método | Endpoint | Body | Descripción |
|---|---|---|---|
| `GET` | `api/timers` | — | Lista todos los timers |
| `POST` | `api/timers` | `{ idTemporizador, inicio, idCategoria, pausa }` | Crea un timer |
| `PUT` | `api/timers` | `{ idTemporizador, inicio, idCategoria, pausa }` | Actualiza un timer |
| `DELETE` | `api/timers/{idTimer}` | — | Elimina un timer |
| `PUT` | `api/timers/increasetimers/{minutes}` | — | Desplaza **todos** los timers `n` minutos (positivo o negativo) |

> Tras POST/PUT/DELETE de timers se emite `syncData`. El endpoint `increasetimers` es el usado por el sync server al arrancar en modo manual para alinear los timers al tiempo real.

---

## Tiempos Empresas Salas (`TIEMPOS_EMPRESAS_SALAS`)

Tabla de relación N:N entre timers, empresas, salas y eventos.

| Método | Endpoint | Body | Descripción |
|---|---|---|---|
| `GET` | `api/TiempoEmpresaSala` | — | Lista todas las asignaciones |
| `POST` | `api/TiempoEmpresaSala` | `{ uniqueId, idTimer, idEmpresa, idSala, idEvento }` | Crea una asignación |
| `DELETE` | `api/TiempoEmpresaSala/{idTES}` | — | Elimina una asignación |

---

## Timer Eventos (vista `TIEMPOS_EVENTOSTIMERS`)

Endpoints que consumen la **vista SQL** que cruza todas las tablas.

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `api/timereventos` | Lista completa de timer-eventos (vista JOIN) |
| `GET` | `api/timereventos/empresastimers` | Lista empresas que tienen timers asignados |
| `GET` | `api/timereventos/eventosactualesempresa/{idempresa}` | Timers actuales (en curso o próximos) de una empresa |
| `GET` | `api/timereventos/eventosempresa/{idempresa}` | Todos los eventos de una empresa |
| `GET` | `api/timereventos/eventossala/{idsala}` | Todos los eventos de una sala |

---

## Resumen de recursos

| Recurso | GET lista | GET por ID | POST | PUT | DELETE |
|---|---|---|---|---|---|
| Salas | ✅ | ✅ | ✅ | ✅ | ✅ |
| Empresas | ✅ | ✅ | ✅ | ✅ | ✅ |
| Categorías | ✅ | ✅ | ✅ | ✅ | ✅ |
| Timers | ✅ | — | ✅ | ✅ | ✅ |
| Timers (bulk update) | — | — | — | ✅ (`increasetimers`) | — |
| TiempoEmpresaSala | ✅ | — | ✅ | — | ✅ |
| TimerEventos (vistas) | ✅ (5 variantes) | — | — | — | — |
