# Fase 0 — Auditoría (ya completada)

> Duración estimada: completada.
> Prerequisito: ninguno — es el punto de partida absoluto.
> Bloquea: Fase 1.

La auditoría de la aplicación original ya está hecha y documentada en la carpeta `docs auditoria/`. Esta fase consiste en leer esos documentos antes de escribir una sola línea de código.

---

## Criterio de entrada

- Acceso de lectura a la carpeta `docs auditoria/`.

## Criterio de salida

- [ ] Los 5 documentos de auditoría leídos en su totalidad.
- [ ] Las 8 rutas y sus componentes identificados.
- [ ] Los endpoints REST y sus firmas exactas conocidos.
- [ ] El esquema de BD y los stored procedures comprendidos.
- [ ] Los 5 eventos Socket.IO y sus flujos comprendidos.
- [ ] Las dos inconsistencias críticas de la app original asumidas (ver sección abajo).

---

## Documentos a leer (en este orden)

### 1. `docs auditoria/README.md` — visión general

Arquitectura del sistema completo, flujo principal de uso (login → configurar → "Vamos" → countdown), rutas del frontend y stack tecnológico del legacy.

Puntos clave:
- Tres piezas: SPA React (frontend), API REST .NET, Sync Server Node.js. El backend .NET **no está en este repositorio**.
- La URL de testing del frontend es `apitimerstesting.azurewebsites.net`.
- El sync server corre en `timertajamarback.azurewebsites.net` (puerto 3002 en local).

### 2. `docs auditoria/api-endpoints.md` — contratos REST exactos

Todos los endpoints que `service.ts` debe implementar. Leer con atención los patrones de URL:

- **Salas:** params en la URL (`/createsala/{nombreSala}`, `/updatesala/{idSala}/{nombreSala}`), no en el body.
- **Empresas:** mismo patrón que salas.
- **Categorías:** body JSON `{ idCategoria, categoria, duracion }` en POST/PUT (diferente a salas/empresas).
- **Timers:** body JSON `{ idTemporizador, inicio, idCategoria, pausa }` en POST/PUT; endpoint especial `PUT /api/timers/increasetimers/{minutes}`.
- **TiempoEmpresaSala:** body JSON `{ uniqueId, idTimer, idEmpresa, idSala, idEvento }` en POST; DELETE por `{idTES}`.
- **TimerEventos:** 5 variantes GET de solo lectura (vista JOIN).

> Al implementar `service.ts` en Fase 2, cada método debe respetar exactamente el patrón de URL documentado aquí.

### 3. `docs auditoria/data-models.md` — esquema de BD y modelos JS

Esquema SQL completo, stored procedures y la forma exacta de los objetos JSON que devuelve la API.

Puntos clave:
- `DURACION` en `CATEGORIAS_TIMER` es **minutos** (int), no segundos.
- `INICIO` en `TEMPORIZADORES` es `datetime` en formato ISO 8601: `"2025-01-23T10:05:00.000"`.
- `IMAGEN` en `EMPRESASTIMERS` es una URL (nvarchar 550).
- `SP_INCREASETIMERS`: si `@INCREASE < 0` aplica `@INCREASE + 60` — workaround de zona horaria en el servidor. **Esto afecta al comportamiento del botón de incremento negativo.**
- `SP_DELETETIMER` borra el timer Y sus relaciones en `TIEMPOS_EMPRESAS_SALAS` en cascada.
- La vista `TIEMPOS_EVENTOSTIMERS` es el JOIN de todas las tablas — la consumen los endpoints `api/timereventos/*`.

Modelos JS de referencia para los tipos TypeScript de Fase 2:

| Entidad | Campos clave |
|---|---|
| Timer | `idTemporizador`, `inicio` (ISO), `idCategoria`, `pausa` (bool) |
| Categoría | `idCategoria`, `categoria`, `duracion` (minutos) |
| Empresa | `idEmpresa`, `empresa`, `imagen` (URL) |
| Sala | `idSala`, `sala` |
| TiempoEmpresaSala | `uniqueId`, `idTimer`, `idEmpresa`, `idSala`, `idEvento` |
| TimerEvento (vista) | 16 campos — ver doc completo |

### 4. `docs auditoria/socket-events.md` — eventos Socket.IO y lógica del servidor

El documento más denso. Describe el protocolo entre cliente y sync server.

Eventos cliente → servidor:

| Evento | Acción en servidor | Emitir desde |
|---|---|---|
| `vamos` | Alinea timers con `IncreaseTimers`, inicia countdown con Luxon + `Europe/Madrid` | LoginView (botón "Iniciar Evento") |
| `syncData` | Recarga categorías y timers desde API sin reiniciar countdown | `service.ts` tras cada mutación de timers/categorías |
| `start` | Deprecated — mismo que `vamos` pero sin timezone. No exponer en UI | — |
| `panic` | Reset de emergencia — **no exponer en UI** (ver advertencia) | — |

Eventos servidor → cliente:

| Evento | Payload | Quién lo consume |
|---|---|---|
| `timerID` | `idTimer: int` | `TimerContext` — ID del timer activo |
| `envio` | `segundos: int` | `TimerContext` — segundos restantes |

### 5. `docs auditoria/components.md` — qué hace cada componente y qué métodos usa

Mapa de dependencias componente → métodos de `service.ts` → eventos Socket.IO. Imprescindible para implementar las Fases 4 y 5 sin omitir llamadas.

La tabla de resumen al final del documento es la referencia rápida.

---

## Inconsistencias críticas de la app original (asumidas, no a corregir en frontend)

### 1. Bug de timezone en el sync server

`vamos` → usa Luxon con zona `Europe/Madrid` ✅  
`continuarTimers()` → usa `new Date()` + suma de 60 minutos (UTC) ❌

Consecuencia: el primer timer arranca con timezone correcta; los siguientes pueden desfasarse en cambios de horario verano/invierno. **Este bug está en el servidor** y queda documentado en `tech-debt.md`. El cliente no puede corregirlo.

### 2. Evento `panic` sin función definida en servidor

`socket.on("panic", () => { panic(); })` → `panic()` no está definida → lanzaría `ReferenceError` en runtime. **No exponer ningún botón que emita `panic`.**

---

## Resumen de referencia rápida

### Las 8 rutas

| Ruta | Vista | Protegida |
|---|---|---|
| `/` | TimerView (countdown público) | No |
| `/login` | LoginView | No |
| `/horario` | HorarioView | Sí |
| `/salas` | SalasView | Sí |
| `/empresas` | EmpresasView | Sí |
| `/categorias` | CategoriasView | Sí |
| `/temporizadores` | TemporizadoresView | Sí |
| `/empresastimersnew` | EmpresasEventoView | Sí |

### Variables de entorno

| Variable | Dev | Prod |
|---|---|---|
| `VITE_API_URL` | `https://apitimerstesting.azurewebsites.net/` | `https://apitimers.azurewebsites.net/` |
| `VITE_SOCKET_URL` | `https://timertajamarback.azurewebsites.net/` | `https://timertajamarback.azurewebsites.net/` |
