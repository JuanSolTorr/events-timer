# Fase 3 — Contextos y estado global

> Duracion estimada: 0.5 jornada
> Prerequisito: Fase 2 completada (servicios y tipos disponibles).
> Bloquea: Fases 4 y 5.

---

## Criterio de entrada

- `src/services/authService.ts` exporta `login`, `logout`, `getToken`, `isAuthenticated`.
- `src/services/socketClient.ts` exporta `getSocket` y `disconnectSocket`.
- `src/types/index.ts` exporta `LoginCredentials`.

## Criterio de salida

- [ ] `useAuth()` es importable desde cualquier componente y devuelve `{ isAuthenticated, login, logout }`.
- [ ] `useTimerState()` es importable desde cualquier componente y devuelve `{ currentTimerId, secondsRemaining, isRunning, selectedSalaId, setSelectedSalaId }`.
- [ ] El socket NO se instancia mas de una vez: abrir dos pestanas del navegador conectadas a la misma sesion debe mostrar una sola conexion en los logs del sync server.
- [ ] `npm run build` pasa sin errores.

---

## Descripcion del estado global

Solo dos contextos. Todo lo demas es estado local en el componente que lo necesita.

| Contexto | Estado | Quien lo consume |
|---|---|---|
| `AuthContext` | `isAuthenticated`, `token` | Menu, ProtectedRoute, LoginView, httpClient |
| `TimerContext` | `currentTimerId`, `secondsRemaining`, `isRunning`, `selectedSalaId` | TimerView, EmpresaActual, ProximosTurnos |

El estado de servidor (listas de salas, empresas, etc.) NO va en contexto. Se carga en cada vista con `use(Promise)` + Suspense.

---

## Paso 3.1 — AuthContext

Crear `src/context/AuthContext.tsx`:

```typescript
// src/context/AuthContext.tsx
import {
  createContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import * as authService from '../services/authService'
import type { LoginCredentials } from '../types'

interface AuthContextValue {
  isAuthenticated: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => void
}

// El contexto se exporta para que use(AuthContext) funcione en consumidores
export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    authService.isAuthenticated()
  )

  const login = useCallback(async (credentials: LoginCredentials) => {
    await authService.login(credentials)
    setIsAuthenticated(true)
  }, [])

  const logout = useCallback(() => {
    authService.logout()
    setIsAuthenticated(false)
  }, [])

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
```

Crear `src/hooks/useAuth.ts`:

```typescript
// src/hooks/useAuth.ts
import { use } from 'react'
import { AuthContext } from '../context/AuthContext'

/**
 * Hook para consumir el AuthContext con React 19 use().
 * Lanza un error si se usa fuera de AuthProvider.
 */
export function useAuth() {
  const ctx = use(AuthContext)
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  }
  return ctx
}
```

---

## Paso 3.2 — TimerContext

El `TimerProvider` monta los listeners del socket una sola vez cuando la app arranca y los desmonta en el cleanup del `useEffect`. Ningun otro componente suscribe eventos de socket directamente — toda la logica de tiempo real vive aqui.

Crear `src/context/TimerContext.tsx`:

```typescript
// src/context/TimerContext.tsx
import {
  createContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import { getSocket } from '../services/socketClient'

interface TimerContextValue {
  currentTimerId: number | null
  secondsRemaining: number
  isRunning: boolean
  selectedSalaId: number | null
  setSelectedSalaId: (id: number | null) => void
}

export const TimerContext = createContext<TimerContextValue | null>(null)

export function TimerProvider({ children }: { children: ReactNode }) {
  const [currentTimerId, setCurrentTimerId] = useState<number | null>(null)
  const [secondsRemaining, setSecondsRemaining] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [selectedSalaId, setSelectedSalaId] = useState<number | null>(null)

  useEffect(() => {
    const socket = getSocket()

    const handleTimerId = (id: number) => {
      setCurrentTimerId(id)
      setIsRunning(true)
    }

    const handleEnvio = (seconds: number) => {
      setSecondsRemaining(seconds)
      if (seconds <= 0) setIsRunning(false)
    }

    socket.on('timerID', handleTimerId)
    socket.on('envio', handleEnvio)

    // Limpieza: elimina los listeners al desmontar el proveedor
    // Esto evita listeners duplicados si el componente se monta dos veces
    return () => {
      socket.off('timerID', handleTimerId)
      socket.off('envio', handleEnvio)
    }
  }, [])

  const handleSetSelectedSala = useCallback((id: number | null) => {
    setSelectedSalaId(id)
  }, [])

  return (
    <TimerContext.Provider
      value={{
        currentTimerId,
        secondsRemaining,
        isRunning,
        selectedSalaId,
        setSelectedSalaId: handleSetSelectedSala,
      }}
    >
      {children}
    </TimerContext.Provider>
  )
}
```

Crear `src/hooks/useTimerState.ts`:

```typescript
// src/hooks/useTimerState.ts
import { use } from 'react'
import { TimerContext } from '../context/TimerContext'

/**
 * Hook para consumir el TimerContext con React 19 use().
 * Lanza un error si se usa fuera de TimerProvider.
 */
export function useTimerState() {
  const ctx = use(TimerContext)
  if (!ctx) {
    throw new Error('useTimerState debe usarse dentro de <TimerProvider>')
  }
  return ctx
}
```

---

## Paso 3.3 — Arbol de providers en main.tsx

Actualizar `src/main.tsx` con los dos providers envolviendo el router. El orden importa: `AuthProvider` va fuera porque `TimerProvider` podria necesitar el estado de autenticacion en el futuro.

```typescript
// src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { TimerProvider } from './context/TimerContext'
import { router } from './router'
import 'bootstrap/dist/css/bootstrap.min.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <TimerProvider>
        <RouterProvider router={router} />
      </TimerProvider>
    </AuthProvider>
  </StrictMode>
)
```

---

## Paso 3.4 — Actualizar ProtectedRoute con useAuth

Ahora que `useAuth` existe, actualizar `src/components/ProtectedRoute.tsx` para usar el contexto en lugar de acceder a `localStorage` directamente:

```typescript
// src/components/ProtectedRoute.tsx
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function ProtectedRoute() {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <Outlet />
}
```

---

## Verificacion final

```bash
npm run build   # sin errores
npm run dev     # arrancar en http://localhost:5173
```

Prueba manual:
1. Ir a `/salas` → redirige a `/login` (no autenticado).
2. Abrir la consola del navegador y ejecutar `localStorage.setItem('token', 'fake')`.
3. Recargar → debe cargar el placeholder de `/salas` sin redirigir.
4. Ejecutar `localStorage.removeItem('token')` y recargar → vuelve a `/login`.

---

## Al cerrar la fase

```bash
git add src/context/ src/hooks/ src/main.tsx src/components/ProtectedRoute.tsx
git commit -m "fase-3: AuthContext y TimerContext con React 19 use(); providers en main.tsx"
git tag v0.3-contextos
```
