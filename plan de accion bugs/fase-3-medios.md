# Fase 3 — Bugs medios (comportamiento incorrecto menor)

Bugs: M-01 (ErrorBoundary), M-02 (tema en Menu), M-03 (socket sin indicador), M-04 (env sin manejo)

Tiempo total estimado: 4-6 horas

Prerequisito: Fase 1 y Fase 2 completadas.

---

## M-01 — Sin ErrorBoundary en vistas con Suspense

### Descripción

Todas las vistas (`TimerView`, `HorarioView`, `SalasView`, `EmpresasView`, `CategoriasView`, `TemporizadoresView`, `EmpresasEventoView`) usan `<Suspense>` para gestionar la carga asíncrona, pero ninguna tiene un `<ErrorBoundary>` envolviendo ese Suspense. Cuando una petición de API lanza una excepción (backend caído, timeout, 500, red sin cobertura), React no captura el error y el resultado es una pantalla completamente en blanco —o peor, un error no manejado que rompe el árbol completo—. El usuario no recibe ningún mensaje que le explique qué falló ni le dé opción de reintentar.

### Archivo y línea

No existe un `ErrorBoundary` en el proyecto. Hay que crearlo.

Vistas afectadas (todas usan el patrón Suspense sin ErrorBoundary):
- `src/views/TimerView.tsx` — líneas 154-160
- `src/views/HorarioView.tsx` — líneas 101-107
- `src/views/SalasView.tsx` — líneas 129-139
- `src/views/EmpresasView.tsx` — líneas 114-124
- `src/views/CategoriasView.tsx` — líneas 132-142
- `src/views/TemporizadoresView.tsx` — líneas 209-221
- `src/views/EmpresasEventoView.tsx` — líneas 149-162

### Código actual (patrón repetido en todas las vistas, usando SalasView como referencia)

```typescript
// SalasView.tsx:129-139
export function SalasView() {
  const { isAuthenticated } = useAuth()
  const [promise, setPromise] = useState(() => getSalas())
  const refresh = () => setPromise(getSalas())

  return (
    <Suspense fallback={<p className="p-4">Cargando salas...</p>}>
      <SalasContent promise={promise} onRefresh={refresh} canEdit={isAuthenticated} />
    </Suspense>
  )
}
```

### Código corregido

**Paso 1 — Crear el componente `ErrorBoundary`:**

Crear el archivo `src/components/ErrorBoundary.tsx`:

```typescript
import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: (error: Error, reset: () => void) => ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  reset = () => this.setState({ error: null })

  render() {
    const { error } = this.state
    if (error) {
      if (this.props.fallback) return this.props.fallback(error, this.reset)
      return (
        <div className="p-6 text-center">
          <p className="text-red-600 font-medium mb-2">Error al cargar los datos</p>
          <p className="text-sm text-slate-500 mb-4">{error.message}</p>
          <button
            onClick={this.reset}
            className="px-4 py-2 bg-blue-700 text-white rounded hover:bg-blue-800 text-sm"
          >
            Reintentar
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
```

**Paso 2 — Envolver el Suspense de cada vista con ErrorBoundary (misma operación en las 7 vistas).**

Ejemplo con `SalasView`:

```typescript
import { ErrorBoundary } from '../components/ErrorBoundary'

export function SalasView() {
  const { isAuthenticated } = useAuth()
  const [promise, setPromise] = useState(() => getSalas())
  const refresh = () => setPromise(getSalas())

  return (
    <ErrorBoundary>
      <Suspense fallback={<p className="p-4">Cargando salas...</p>}>
        <SalasContent promise={promise} onRefresh={refresh} canEdit={isAuthenticated} />
      </Suspense>
    </ErrorBoundary>
  )
}
```

Repetir el mismo patrón en `TimerView`, `HorarioView`, `EmpresasView`, `CategoriasView`, `TemporizadoresView` y `EmpresasEventoView`.

### Cómo verificar

1. Detener el backend (o cambiar `VITE_API_URL` a una URL inexistente).
2. Navegar a `/salas`.
3. Sin el fix: pantalla en blanco o error de consola sin feedback visible.
4. Con el fix: aparece el mensaje "Error al cargar los datos" con el botón "Reintentar".
5. Reiniciar el backend y pulsar "Reintentar" — los datos deben cargar correctamente.
6. Verificar en cada una de las 7 vistas.

### Tiempo estimado

2 horas (creación del componente + 7 vistas × 5 min)

---

## M-02 — Efecto de tema en Menu sobreescribe preferencias en cada navegación

### Descripción

`Menu.tsx:7-14` tiene un `useEffect` que se ejecuta en cada montaje del componente y hace dos cosas: limpia `document.documentElement.dataset.theme` y elimina `'theme'` de `localStorage`. `Menu` se monta con cada navegación porque es parte del layout. Esto significa que si en el futuro se añade un selector de tema (modo oscuro/claro), las preferencias del usuario se borrarán cada vez que navegue a otra ruta. El código parece ser un vestigio de una limpieza de feature antigua que nunca se eliminó del todo.

### Archivo y línea

`src/components/Menu.tsx` — líneas 1 y 7-14

### Código actual

```typescript
import { useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function Menu() {
  const { isAuthenticated, logout } = useAuth()
  useEffect(() => {
    document.documentElement.dataset.theme = ''
    try {
      localStorage.removeItem('theme')
    } catch {
      // Ignore storage errors
    }
  }, [])
```

### Código corregido

Eliminar el `useEffect` completo y el import de `useEffect` si no hay otros usos en el archivo:

```typescript
import { NavLink } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function Menu() {
  const { isAuthenticated, logout } = useAuth()

  return (
    // resto del JSX sin cambios
```

### Cómo verificar

1. Con el fix aplicado, verificar que el menú se renderiza correctamente en todas las rutas.
2. Abrir DevTools > Application > Local Storage — no debe verse ninguna clave `theme` borrada automáticamente al navegar.
3. Añadir manualmente en consola `document.documentElement.dataset.theme = 'dark'` y navegar entre rutas — el atributo debe persistir (no desaparecer).
4. La app debe comportarse igual que antes para el usuario final, ya que el tema no tiene selector visible aún.

### Tiempo estimado

15 minutos

---

## M-03 — Sin indicador visible de reconexión de socket

### Descripción

`socketClient.ts` implementa el singleton del socket pero no propaga eventos de desconexión a la UI. `TimerContext` escucha los eventos del servidor (`timerID`, `envio`) pero no informa al usuario cuando el socket pierde la conexión. El usuario ve el timer congelado en la última lectura y no sabe si los datos están actualizados o desactualizados, especialmente en `TimerView` que es la vista pública principal. Socket.IO tiene reintentos automáticos, pero el usuario no tiene feedback visual durante el período de desconexión.

### Archivo y línea

`src/services/socketClient.ts` — no expone eventos de estado de conexión  
`src/context/TimerContext.tsx` — no consume ni propaga estado de conexión del socket

### Código actual

Para leer `socketClient.ts`:
```typescript
// El singleton existe pero no hay eventos de estado de conexión expuestos
```

### Código corregido

**Paso 1 — Exponer un estado de conexión desde el socket.**

Localizar `src/services/socketClient.ts` (o equivalente) y añadir una forma de suscribirse al estado:

```typescript
// Añadir en socketClient.ts — al crear el socket:
socket.on('connect', () => {
  window.dispatchEvent(new CustomEvent('socket:connected'))
})
socket.on('disconnect', () => {
  window.dispatchEvent(new CustomEvent('socket:disconnected'))
})
```

**Paso 2 — Mostrar un indicador en `TimerView` o en el layout.**

Crear un hook `useSocketStatus`:

```typescript
// src/hooks/useSocketStatus.ts
import { useState, useEffect } from 'react'
import { getSocket } from '../services/socketClient'

export function useSocketStatus(): 'connected' | 'disconnected' {
  const [status, setStatus] = useState<'connected' | 'disconnected'>(
    getSocket().connected ? 'connected' : 'disconnected'
  )

  useEffect(() => {
    const onConnected = () => setStatus('connected')
    const onDisconnected = () => setStatus('disconnected')
    window.addEventListener('socket:connected', onConnected)
    window.addEventListener('socket:disconnected', onDisconnected)
    return () => {
      window.removeEventListener('socket:connected', onConnected)
      window.removeEventListener('socket:disconnected', onDisconnected)
    }
  }, [])

  return status
}
```

Usar el hook en `TimerContent` (o en `RootLayout`) para mostrar un banner:

```typescript
// En TimerContent o en RootLayout:
const socketStatus = useSocketStatus()

// En el JSX — añadir encima del contenido principal:
{socketStatus === 'disconnected' && (
  <div role="alert" className="bg-yellow-100 border border-yellow-400 text-yellow-800 text-sm px-4 py-2 rounded mb-4">
    Conexion perdida — los datos pueden no estar actualizados. Reconectando...
  </div>
)}
```

### Cómo verificar

1. Detener el servidor de Socket.IO (o bloquear la conexión con DevTools > Network > offline).
2. En `TimerView`: debe aparecer el banner amarillo de reconexión.
3. Restaurar la conexión — el banner debe desaparecer automáticamente cuando Socket.IO se reconecte.
4. Verificar que el banner no aparece en condiciones normales de conexión.

### Tiempo estimado

2 horas

---

## M-04 — Excepción de configuración sin manejo visible

### Descripción

`src/config/env.ts:6-7` lanza dos `throw new Error(...)` síncronos en tiempo de importación si `VITE_API_URL` o `VITE_SOCKET_URL` no están definidas. Dado que no existe un `ErrorBoundary` en el árbol raíz (`main.tsx` o `App.tsx`), y dado que el error ocurre en tiempo de importación (fuera del árbol de React), el resultado es una pantalla completamente en blanco sin ningún mensaje de error para el equipo de despliegue. El error aparece solo en la consola del navegador.

### Archivo y línea

`src/config/env.ts` — líneas 6-7

### Código actual

```typescript
export const config = {
  apiUrl: import.meta.env.VITE_API_URL as string,
  socketUrl: import.meta.env.VITE_SOCKET_URL as string,
} as const

if (!config.apiUrl) throw new Error('VITE_API_URL no esta definida')
if (!config.socketUrl) throw new Error('VITE_SOCKET_URL no esta definida')
```

### Código corregido

El lanzamiento síncrono está bien —es la forma correcta de fallar rápido en configuración—. Lo que falta es que el error sea visible. Dos mejoras:

**Mejora 1 — Mostrar el mensaje de error en el DOM si el módulo falla (en `main.tsx`):**

```typescript
// src/main.tsx — envolver el bootstrapping en try/catch:
try {
  // imports que usan env.ts ya habrán lanzado antes de llegar aquí,
  // por lo que este try no captura errores de importación de módulo.
  // La solución correcta es el ErrorBoundary de nivel raíz.
} catch (e) {
  // ...
}
```

Como los errores de importación de módulo no son capturables con `try/catch` en `main.tsx`, la solución real es añadir un `window.onerror` global que muestre el error en el DOM si React no llegó a montarse:

```typescript
// src/main.tsx — añadir ANTES del import de App/router:
window.addEventListener('error', (event) => {
  if (!document.getElementById('root')?.hasChildNodes()) {
    document.getElementById('root')!.innerHTML = `
      <div style="padding:2rem;font-family:sans-serif;color:#b91c1c">
        <h1 style="font-size:1.25rem;font-weight:bold;margin-bottom:0.5rem">Error de configuración</h1>
        <p style="font-size:0.875rem">${event.message}</p>
        <p style="font-size:0.75rem;color:#6b7280;margin-top:1rem">Revisa las variables de entorno VITE_API_URL y VITE_SOCKET_URL en el archivo .env</p>
      </div>
    `
  }
})
```

**Mejora 2 — Mensaje más claro en `env.ts`:**

```typescript
if (!config.apiUrl) throw new Error(
  'VITE_API_URL no está definida. Crea un archivo .env con VITE_API_URL=http://tu-backend:puerto'
)
if (!config.socketUrl) throw new Error(
  'VITE_SOCKET_URL no está definida. Crea un archivo .env con VITE_SOCKET_URL=http://tu-backend:puerto'
)
```

### Cómo verificar

1. Renombrar temporalmente el archivo `.env` a `.env.bak` para eliminar las variables.
2. Ejecutar `npm run dev`.
3. Sin el fix: pantalla en blanco en el navegador, error solo visible en consola.
4. Con el fix: aparece el mensaje de error de configuración directamente en la pantalla del navegador.
5. Restaurar `.env.bak` a `.env` — la app debe cargar correctamente.

### Tiempo estimado

1 hora
