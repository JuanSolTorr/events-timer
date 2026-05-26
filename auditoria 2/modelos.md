# Modelaje de datos — events-timer

Todas las interfaces viven en `src/types/index.ts` salvo los tipos internos de mapeo que estan en `src/services/service.ts`.

---

## Interfaces publicas (src/types/index.ts)

### Timer
```typescript
interface Timer {
  idTemporizador: number
  inicio: string          // ISO 8601 — se interpreta en zona Europe/Madrid
  idCategoria: number
  pausa: boolean
}
```

### Categoria
```typescript
interface Categoria {
  idCategoria: number
  categoria: string
  duracion: number        // minutos
}
```

### Empresa
```typescript
interface Empresa {
  idEmpresa: number
  empresa: string
  imagen: string          // URL de imagen; puede ser cadena vacia
}
```

### Sala
```typescript
interface Sala {
  idSala: number
  sala: string
}
```

### TiempoEmpresaSala
```typescript
interface TiempoEmpresaSala {
  uniqueId: number        // PK de la asignacion
  idTimer: number
  idEmpresa: number
  idSala: number
  idEvento: number
}
```

### TimerEvento (vista JOIN enriquecida)
```typescript
interface TimerEvento {
  uniqueId: number
  idEmpresa: number
  idTimer: number
  idSala: number
  idEvento: number
  idCategoria: number
  inicio: string          // ISO 8601
  pausa: boolean
  categoria: string
  duracion: number        // minutos
  sala: string
  evento: string
  inicioEvento: string    // ISO 8601
  finEvento: string       // ISO 8601
  empresa: string
  imagen: string
}
```

### LoginCredentials
```typescript
interface LoginCredentials {
  userName: string
  password: string
}
```

### AuthToken
```typescript
interface AuthToken {
  token: string
}
// NOTA: esta interface esta definida pero no se usa — el token se devuelve
// directamente como string desde el endpoint Auth/Login.
```

### Evento
```typescript
interface Evento {
  idEvento: number
  evento: string
  inicioEvento: string
  finEvento: string
}
// NOTA: definida pero no se usa en ningun componente — los eventos se derivan
// de TimerEvento en EmpresasEventoView.
```

---

## Tipos internos de mapeo (src/services/service.ts)

Estos tipos representan la forma real que devuelve el backend (nombres de campo variables segun version de API). El servicio los normaliza a las interfaces publicas.

### ApiSala (line 13)
```typescript
type ApiSala = {
  idSala: number
  nombreSala?: string   // nombre alternativo del campo
  sala?: string         // nombre canonico del campo
}
```

### ApiEmpresa (line 14)
```typescript
type ApiEmpresa = {
  idEmpresa: number
  nombreEmpresa?: string
  empresa?: string
  imagen?: string
  imagenEmpresa?: string
}
```

### ApiTimerEvento (lines 15-37)
```typescript
type ApiTimerEvento = {
  uniqueId: number
  idEmpresa: number
  idTimer: number
  idSala: number
  idEvento: number
  idCategoria: number
  inicioTimer?: string   // nombre alternativo
  inicio?: string        // nombre canonico
  pausaTimer?: boolean   // nombre alternativo
  pausa?: boolean        // nombre canonico
  categoria: string
  duracion: number
  sala?: string
  nombreSala?: string
  evento: string
  inicioEvento: string
  finEvento: string
  empresa?: string
  nombreEmpresa?: string
  imagenEmpresa?: string
  imagen?: string
}
```

---

## Funciones de mapeo (src/services/service.ts)

| Funcion | Entrada | Salida | Logica de fallback |
|---------|---------|--------|-------------------|
| `mapSala` | `ApiSala` | `Sala` | `sala ?? nombreSala ?? ''` |
| `mapEmpresa` | `ApiEmpresa` | `Empresa` | campos con `??` encadenados |
| `mapTimerEvento` | `ApiTimerEvento` | `TimerEvento` | `inicio ?? inicioTimer ?? ''`, `pausa ?? pausaTimer ?? false` |

**Riesgo**: si el backend no devuelve ninguno de los campos alternativos, el fallback es cadena vacia o `false` sin error visible al usuario.

---

## Estado de contexto (src/context/)

### AuthContext
```typescript
interface AuthContextValue {
  isAuthenticated: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => void
}
```
Fuente de verdad: `localStorage.getItem('token') !== null`.

### TimerContext
```typescript
interface TimerContextValue {
  currentTimerId: number | null
  secondsRemaining: number
  isRunning: boolean
  selectedSalaId: number | null
  setSelectedSalaId: (id: number | null) => void
}
```
Fuente de verdad: eventos WebSocket del servidor.

---

## Tipos de Socket.IO

```typescript
interface SocketServerEvents {
  timerID: (idTimer: number) => void
  envio: (segundosRestantes: number) => void
}

interface SocketClientEvents {
  vamos: () => void
  syncData: () => void
  panic: () => void     // declarado, no emitido desde el cliente
}
```
