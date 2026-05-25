# Eventos Socket.IO

Conexión gestionada en [service.js](../AppTimersFinal-master/src/services/service.js) y servidor en [syncServerTimers-master/index.js](../syncServerTimers-master/index.js).

**URL del servidor:** `https://timertajamarback.azurewebsites.net/`  
**Puerto local:** 3002  
**Librería:** Socket.IO 4.5 (cliente y servidor)  
**CORS:** abierto a todos los orígenes (`origin: true`)

---

## Diagrama de flujo

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

---

## Eventos que emite el CLIENTE → servidor

### `vamos`
Inicia los timers usando el método nuevo (Luxon, zona `Europe/Madrid`).

- Calcula la diferencia en minutos entre `ahora` y el primer timer.
- Llama a `PUT /api/timers/IncreaseTimers/{diff}` para alinear todos los timers al tiempo real.
- Inicia el countdown interno del servidor.
- **Usado desde:** botón "Iniciar Evento" en `Login.js`.

### `start`
Inicia los timers usando el método antiguo (Date nativo, sin timezone explícita).

- Mismo comportamiento que `vamos` pero con `startTimersManul()` (typo heredado).
- **Deprecated de facto** — `vamos` es el método activo.
- **Usado desde:** `resetEmergency()` en `Login.js`, pero el botón que llama a esa función está **comentado en el render** — no accesible desde la UI actual.

### `syncData`
Solicita al servidor que recargue categorías y timers desde la API REST.

- No reinicia el countdown si hay uno en curso.
- Se emite automáticamente desde `service.js` tras cada POST/PUT/DELETE de timers, categorías.
- **Usado desde:** `postTemporizador`, `putTemporizador`, `deleteTemporizador`, `postCategoria`, `putCategoria`, `deleteCategoria`, `updateIncreaseTimers`.

### `panic`
Reset de emergencia del estado interno del servidor.

- Limpia `timersOrdenados`, `corriendo`, `intervaloComprovarHora`.
- **Ningún botón activo emite este evento.** En `Login.js`, `socket.emit("panic")` está comentado dentro de `resetEmergency()`, y el botón que llama a esa función también está comentado en el render.

> **Advertencia:** El listener en el servidor (`socket.on("panic", () => { panic(); })`) llama a `panic()` que **no está definida** — lanzaría `ReferenceError` en runtime si el evento llegase al servidor.

---

## Eventos que emite el SERVIDOR → clientes (broadcast)

### `timerID`
**Payload:** `idTimer` (int)

Emitido cada segundo durante el countdown. Indica qué timer está corriendo actualmente. Los clientes usan este ID para saber qué empresa/sala mostrar.

### `envio`
**Payload:** `tiempoRestante` (int, segundos)

Emitido cada segundo. Segundos que quedan del timer actual. Cuando llega a `0` el servidor pasa al siguiente timer automáticamente.

---

## Estado interno del servidor

El sync server mantiene estado en memoria (no persiste entre reinicios):

| Variable | Tipo | Descripción |
|---|---|---|
| `timersOrdenados` | `Array` | Lista de timers ordenada por `inicio`, cargada desde la API |
| `categoriasTimer` | `Array` | Lista de categorías con duración, usada para calcular segundos |
| `corriendo` | `boolean` | `true` si hay un countdown activo |
| `intervaloComprovarHora` | `Interval \| false` | Interval que comprueba si ha llegado la hora del primer timer |

---

## Lógica de encadenamiento de timers

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
