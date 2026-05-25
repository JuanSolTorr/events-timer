# Fase 2 — Capa de servicios

> Duracion estimada: 1 jornada
> Prerequisito: Fase 1 completada (`npm run build` y `npm run lint` pasan).
> Bloquea: Fase 3 (contextos necesitan los servicios para funcionar).

---

## Criterio de entrada

- `npm run build` pasa sin errores tras la Fase 1.
- `src/config/env.ts` existe y exporta `config.apiUrl` y `config.socketUrl`.

## Criterio de salida

- [ ] `npm run build` pasa sin errores TypeScript en `src/services/`.
- [ ] No hay ni un solo `any` implicito en ningun archivo de `src/services/` ni `src/types/`.
- [ ] `src/types/index.ts` exporta todos los tipos de dominio listados en este archivo.
- [ ] `service.ts` tiene exactamente los mismos metodos que el legacy `service.js`.
- [ ] `socketClient.ts` exporta un singleton: importado dos veces en la misma sesion devuelve la misma instancia.

---

## Paso 2.1 — Tipos de dominio

Crear `src/types/index.ts` con los tipos de todos los modelos del sistema. Estos tipos son el contrato entre el frontend y la API — no se pueden cambiar sin coordinar con el backend .NET.

```typescript
// src/types/index.ts

// ------------------------------------
// Modelos de dominio (tablas de la BD)
// ------------------------------------

export interface Timer {
  idTemporizador: number
  inicio: string        // datetime ISO 8601: "2025-01-23T10:05:00.000"
  idCategoria: number
  pausa: boolean
}

export interface Categoria {
  idCategoria: number
  categoria: string
  duracion: number      // minutos
}

export interface Empresa {
  idEmpresa: number
  empresa: string
  imagen: string        // URL del logotipo
}

export interface Sala {
  idSala: number
  sala: string
}

export interface TiempoEmpresaSala {
  uniqueId: number
  idTimer: number
  idEmpresa: number
  idSala: number
  idEvento: number
}

// ------------------------------------
// Vista SQL TIEMPOS_EVENTOSTIMERS
// (JOIN de todas las tablas)
// ------------------------------------

export interface TimerEvento {
  uniqueId: number
  idEmpresa: number
  idTimer: number
  idSala: number
  idEvento: number
  idCategoria: number
  inicio: string        // datetime ISO 8601
  pausa: boolean
  categoria: string
  duracion: number      // minutos (de CATEGORIAS_TIMER)
  sala: string
  evento: string
  inicioEvento: string  // datetime ISO 8601
  finEvento: string     // datetime ISO 8601
  empresa: string
  imagen: string        // URL del logotipo
}

// ------------------------------------
// Autenticacion
// ------------------------------------

export interface LoginCredentials {
  userName: string
  password: string
}

export interface AuthToken {
  token: string
}

// ------------------------------------
// Evento (EVENTOSTIMERS)
// ------------------------------------

export interface Evento {
  idEvento: number
  evento: string
  inicioEvento: string  // datetime ISO 8601
  finEvento: string     // datetime ISO 8601
}

// ------------------------------------
// Tipos de Socket.IO (para documentar
// los eventos — no son interfaces de TS
// estrictamente necesarias pero ayudan)
// ------------------------------------

export interface SocketServerEvents {
  timerID: (idTimer: number) => void
  envio: (segundosRestantes: number) => void
}

export interface SocketClientEvents {
  vamos: () => void
  syncData: () => void
  panic: () => void
}
```

---

## Paso 2.2 — Helper de timezone

Crear `src/utils/timezone.ts` antes que `service.ts` porque este lo importa:

```typescript
// src/utils/timezone.ts
import { DateTime } from 'luxon'

export const TIMEZONE = 'Europe/Madrid'

/** Parsea un string ISO recibido de la API y lo interpreta en la zona de Madrid. */
export function parseTimerInicio(isoString: string): DateTime {
  return DateTime.fromISO(isoString, { zone: TIMEZONE })
}

/** Devuelve el momento actual en la zona de Madrid. */
export function ahora(): DateTime {
  return DateTime.now().setZone(TIMEZONE)
}

/**
 * Determina si un timer ya ha terminado.
 * @param inicio  - ISO 8601 recibido de la API
 * @param duracionMinutos - duracion de la categoria asociada
 */
export function timerYaPaso(inicio: string, duracionMinutos: number): boolean {
  const fin = parseTimerInicio(inicio).plus({ minutes: duracionMinutos })
  return fin < ahora()
}
```

---

## Paso 2.3 — Cliente HTTP

Crear `src/services/httpClient.ts`:

```typescript
// src/services/httpClient.ts
import axios from 'axios'
import { config } from '../config/env'

export const httpClient = axios.create({
  baseURL: config.apiUrl,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Inyecta el token JWT en cada peticion autenticada
httpClient.interceptors.request.use((axiosConfig) => {
  const token = localStorage.getItem('token')
  if (token && axiosConfig.headers) {
    axiosConfig.headers.Authorization = `Bearer ${token}`
  }
  return axiosConfig
})

// Redirige a /login cuando el servidor responde 401
httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)
```

---

## Paso 2.4 — Capa de servicios REST

Crear `src/services/service.ts` con todos los metodos del legacy tipados. Ninguna vista ni componente importa `axios` ni `httpClient` directamente — todo pasa por aqui.

Los metodos que modifican datos de categorias y temporizadores emiten `syncData` al sync server para que este recargue su cache.

```typescript
// src/services/service.ts
import { httpClient } from './httpClient'
import { getSocket } from './socketClient'
import type {
  Timer,
  Categoria,
  Empresa,
  Sala,
  TiempoEmpresaSala,
  TimerEvento,
  LoginCredentials,
} from '../types'

// Funcion interna: notifica al sync server para que recargue su estado
function emitSyncData(): void {
  getSocket().emit('syncData')
}

// ─────────────────────────────────────────
// Autenticacion
// ─────────────────────────────────────────

export async function generateToken(credentials: LoginCredentials): Promise<string> {
  const { data } = await httpClient.post<string>('Auth/Login', credentials)
  return data
}

// ─────────────────────────────────────────
// Salas  (SALASTIMERS)
// ─────────────────────────────────────────

export async function getSalas(): Promise<Sala[]> {
  const { data } = await httpClient.get<Sala[]>('api/salas')
  return data
}

export async function getSala(idSala: number): Promise<Sala> {
  const { data } = await httpClient.get<Sala>(`api/salas/${idSala}`)
  return data
}

export async function postSala(nombreSala: string): Promise<void> {
  await httpClient.post(`api/salas/createsala/${encodeURIComponent(nombreSala)}`)
}

export async function putSala(idSala: number, nombreSala: string): Promise<void> {
  await httpClient.put(`api/salas/updatesala/${idSala}/${encodeURIComponent(nombreSala)}`)
}

export async function deleteSala(idSala: number): Promise<void> {
  await httpClient.delete(`api/salas/${idSala}`)
}

// ─────────────────────────────────────────
// Empresas  (EMPRESASTIMERS)
// ─────────────────────────────────────────

export async function getEmpresas(): Promise<Empresa[]> {
  const { data } = await httpClient.get<Empresa[]>('api/empresas')
  return data
}

export async function getEmpresa(idEmpresa: number): Promise<Empresa> {
  const { data } = await httpClient.get<Empresa>(`api/empresas/${idEmpresa}`)
  return data
}

export async function postEmpresa(nombreEmpresa: string): Promise<void> {
  await httpClient.post(`api/empresas/createempresa/${encodeURIComponent(nombreEmpresa)}`)
}

export async function putEmpresa(idEmpresa: number, nombreEmpresa: string): Promise<void> {
  await httpClient.put(
    `api/empresas/updateempresa/${idEmpresa}/${encodeURIComponent(nombreEmpresa)}`
  )
}

export async function deleteEmpresa(idEmpresa: number): Promise<void> {
  await httpClient.delete(`api/empresas/${idEmpresa}`)
}

// ─────────────────────────────────────────
// Categorias  (CATEGORIAS_TIMER)
// ─────────────────────────────────────────

export async function getCategorias(): Promise<Categoria[]> {
  const { data } = await httpClient.get<Categoria[]>('api/categoriastimer')
  return data
}

export async function getCategoria(idCategoria: number): Promise<Categoria> {
  const { data } = await httpClient.get<Categoria>(`api/categoriastimer/${idCategoria}`)
  return data
}

export async function postCategoria(categoria: Omit<Categoria, 'idCategoria'>): Promise<void> {
  await httpClient.post('api/categoriastimer', { idCategoria: 0, ...categoria })
  emitSyncData()
}

export async function putCategoria(categoria: Categoria): Promise<void> {
  await httpClient.put('api/categoriastimer', categoria)
  emitSyncData()
}

export async function deleteCategoria(idCategoria: number): Promise<void> {
  await httpClient.delete(`api/categoriastimer/${idCategoria}`)
  emitSyncData()
}

// ─────────────────────────────────────────
// Temporizadores  (TEMPORIZADORES)
// ─────────────────────────────────────────

export async function getTemporizadores(): Promise<Timer[]> {
  const { data } = await httpClient.get<Timer[]>('api/timers')
  return data
}

export async function postTemporizador(timer: Omit<Timer, 'idTemporizador'>): Promise<void> {
  await httpClient.post('api/timers', { idTemporizador: 0, ...timer })
  emitSyncData()
}

export async function putTemporizador(timer: Timer): Promise<void> {
  await httpClient.put('api/timers', timer)
  emitSyncData()
}

export async function deleteTemporizador(idTimer: number): Promise<void> {
  await httpClient.delete(`api/timers/${idTimer}`)
  emitSyncData()
}

/**
 * Desplaza todos los timers n minutos.
 * Positivo: adelanta. Negativo: retrasa.
 * Nota: el SP en BD tiene logica especial para valores negativos (ver tech-debt.md).
 */
export async function updateIncreaseTimers(minutes: number): Promise<void> {
  await httpClient.put(`api/timers/increasetimers/${minutes}`)
  emitSyncData()
}

// ─────────────────────────────────────────
// TiempoEmpresaSala  (TIEMPOS_EMPRESAS_SALAS)
// ─────────────────────────────────────────

export async function getTES(): Promise<TiempoEmpresaSala[]> {
  const { data } = await httpClient.get<TiempoEmpresaSala[]>('api/TiempoEmpresaSala')
  return data
}

export async function postTES(tes: TiempoEmpresaSala): Promise<void> {
  await httpClient.post('api/TiempoEmpresaSala', tes)
}

export async function deleteTES(idTES: number): Promise<void> {
  await httpClient.delete(`api/TiempoEmpresaSala/${idTES}`)
}

// ─────────────────────────────────────────
// TimerEventos  (vista TIEMPOS_EVENTOSTIMERS)
// ─────────────────────────────────────────

export async function getTimersEventos(): Promise<TimerEvento[]> {
  const { data } = await httpClient.get<TimerEvento[]>('api/timereventos')
  return data
}

export async function getEmpresasTimers(): Promise<Empresa[]> {
  const { data } = await httpClient.get<Empresa[]>('api/timereventos/empresastimers')
  return data
}

export async function findTimersActualesEmpresa(idEmpresa: number): Promise<TimerEvento[]> {
  const { data } = await httpClient.get<TimerEvento[]>(
    `api/timereventos/eventosactualesempresa/${idEmpresa}`
  )
  return data
}

export async function findTimersEventosEmpresa(idEmpresa: number): Promise<TimerEvento[]> {
  const { data } = await httpClient.get<TimerEvento[]>(
    `api/timereventos/eventosempresa/${idEmpresa}`
  )
  return data
}

export async function findTimersEventosSala(idSala: number): Promise<TimerEvento[]> {
  const { data } = await httpClient.get<TimerEvento[]>(
    `api/timereventos/eventossala/${idSala}`
  )
  return data
}
```

---

## Paso 2.5 — Cliente Socket.IO (singleton)

Crear `src/services/socketClient.ts`:

```typescript
// src/services/socketClient.ts
import { io, type Socket } from 'socket.io-client'
import { config } from '../config/env'
import type { SocketServerEvents, SocketClientEvents } from '../types'

type AppSocket = Socket<SocketServerEvents, SocketClientEvents>

let instance: AppSocket | null = null

/**
 * Devuelve la unica instancia del socket.
 * Si no existe, la crea. Si ya existe, la reutiliza.
 * Esto garantiza que hay exactamente un listener por evento en toda la app.
 */
export function getSocket(): AppSocket {
  if (!instance) {
    instance = io(config.socketUrl, {
      transports: ['websocket'],
      autoConnect: true,
    })
  }
  return instance
}

/** Desconecta el socket y limpia la instancia. Llamar en logout. */
export function disconnectSocket(): void {
  if (instance) {
    instance.disconnect()
    instance = null
  }
}
```

---

## Paso 2.6 — Servicio de autenticacion

Crear `src/services/authService.ts`:

```typescript
// src/services/authService.ts
import { generateToken } from './service'
import { disconnectSocket } from './socketClient'
import type { LoginCredentials } from '../types'

const TOKEN_KEY = 'token'

export async function login(credentials: LoginCredentials): Promise<void> {
  const token = await generateToken(credentials)
  localStorage.setItem(TOKEN_KEY, token)
}

export function logout(): void {
  localStorage.removeItem(TOKEN_KEY)
  disconnectSocket()
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function isAuthenticated(): boolean {
  return getToken() !== null
}
```

---

## Verificacion final

```bash
npm run build   # sin errores TypeScript en src/services/ ni src/types/
npm run lint    # sin advertencias
```

Comprobacion manual de tipos: TypeScript debe rechazar si intentas pasar un `string` donde se espera `number` en cualquier metodo de `service.ts`. Prueba escribir temporalmente `getSala('abc')` en cualquier archivo y verifica que el compilador se queja.

---

## Al cerrar la fase

```bash
git add src/services/ src/types/ src/utils/timezone.ts src/config/env.ts
git commit -m "fase-2: capa de servicios tipada — httpClient, service, socket, auth"
git tag v0.2-servicios
```
