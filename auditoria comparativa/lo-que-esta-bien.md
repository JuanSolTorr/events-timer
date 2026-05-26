# Lo que está bien — Migración CRA+JS → Vite+TS+React 19

Fecha comparación: 2026-05-26  
Referencia: `auditoria/` (original) vs `auditoria 2/` (actual)

---

## Infraestructura y arquitectura — correctamente migrada

### M-01 — Token JWT en cabeceras REST ✓
- **Original**: las peticiones REST nunca enviaban el token. El backend recibía peticiones sin autenticar.
- **Actual**: `src/services/httpClient.ts` tiene un interceptor de request que adjunta `Authorization: Bearer <token>` automáticamente en cada petición.
- **Archivo**: `httpClient.ts:11-17`

### M-02 — Eliminación del antipatrón de promesas ✓
- **Original**: `service.js` usaba `.then().catch()` anidados sin rechazar promesas correctamente.
- **Actual**: `service.ts` usa `async/await` directo en todos los métodos. Las excepciones se propagan correctamente.

### M-03 — Socket WebSocket como singleton ✓
- **Original**: múltiples instancias de socket podían crearse al montar distintos componentes.
- **Actual**: `src/services/socketClient.ts` exporta una única instancia compartida. No hay riesgo de conexiones duplicadas.

### M-08 — SweetAlert2 desacoplado del servicio ✓
- **Original**: `service.js` llamaba a `Swal.fire(...)` directamente, mezclando lógica de UI con lógica de datos.
- **Actual**: Swal solo aparece en las vistas. El servicio solo lanza excepciones.

### M-09 — Variables de entorno correctamente configuradas ✓
- **Original**: URLs hardcodeadas en `service.js`.
- **Actual**: `VITE_API_URL` y `VITE_SOCKET_URL` en `src/config/env.ts` con validación en tiempo de arranque.

### M-10 — Componentes funcionales con hooks ✓
- **Original**: class components con `this.state`, `componentDidMount`, `componentWillUnmount`.
- **Actual**: todos son functional components con hooks. Código más limpio y testeable.

### M-11 — Ruta EmpresasEventoTimers reemplazada ✓
- **Original**: `EmpresasEventoTimers` era una vista con deuda técnica y lógica duplicada.
- **Actual**: reemplazada por `EmpresasEventoView` con arquitectura consistente con el resto de vistas.

---

## Modelos de datos — expansiones correctas

### TimerEvento — modelo ampliado correctamente
El modelo `EventoActual` de la original tenía 4 campos. El nuevo `TimerEvento` tiene 15 campos con toda la información necesaria para el display de timers sin peticiones adicionales:
- `uniqueId`, `idTimer`, `idEmpresa`, `idSala`, `idEvento`
- `inicio`, `pausa`, `categoria`, `evento`
- `inicioEvento`, `finEvento`
- `imagen` (antes `imagenEmpresa` en `EventoActual`)

### Sala y Empresa — mapeo defensivo con fallback ✓
El renombrado de `nombreSala` → `sala` y `nombreEmpresa` → `empresa` está manejado con tipos internos (`ApiSala`, `ApiEmpresa`) y funciones de mapeo con fallback:
```typescript
sala: data.sala ?? data.nombreSala ?? ''
empresa: data.empresa ?? data.nombreEmpresa ?? ''
```
Esto hace la app resiliente a distintas versiones del backend.

### Categoria y Timer — sin regresiones ✓
Los modelos `Categoria` y `Temporizador` son idénticos en campos. La mejora de `idCategoria` como `number` en lugar de `string` (cast implícito) es correcta.

---

## Endpoints — 27 de 29 correctos

| Grupo | Estado |
|-------|--------|
| `api/salas` (6 endpoints) | Todos correctos |
| `api/empresas` (5 endpoints) | Todos correctos |
| `api/categoriastimer` (5 endpoints) | Todos correctos |
| `api/timers` (4 endpoints) | Todos correctos salvo capitalización en uno |
| `api/TiempoEmpresaSala` (3 endpoints) | Ruta correcta, problema de modelo |
| `api/timereventos` (5 endpoints) | Todos correctos |
| `Auth/Login` (1 endpoint) | Ruta correcta, verificar formato respuesta |

---

## Autenticación — mejoras aplicadas

- **Logout correcto**: la original hacía `localStorage.clear()` (borraba todo). La actual hace `localStorage.removeItem('token')` + `disconnectSocket()`. Más seguro y específico.
- **Evento de socket**: `socket.emit('vamos')` tras login funciona igual que en la original.
- **TypeScript**: la tipificación de `AuthContext` y `AuthService` previene errores de compilación que la original JS no detectaba.

---

## Arquitectura general — mejor que la original

| Aspecto | Original | Actual |
|---------|----------|--------|
| Lenguaje | JavaScript | TypeScript |
| Bundler | CRA (Webpack) | Vite (más rápido) |
| Socket | Múltiples instancias | Singleton |
| Token en REST | No se enviaba | Interceptor automático |
| UI feedback | Swal en el servicio | Swal solo en vistas |
| URLs | Hardcodeadas | Variables de entorno |
| Tipos | Ninguno | Interfaces TypeScript completas |
| Componentes | Class components | Functional + hooks |
