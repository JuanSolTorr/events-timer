# Fase 2 — Bugs altos (degradación seria del flujo)

Bugs: A-01, A-02, A-03, A-04, A-05, A-06

Tiempo total estimado: 5-8 horas

Prerequisito: Fase 1 completada (especialmente C-01 para que el login funcione).

---

## A-01 — ProtectedRoute existe pero no protege ninguna ruta

### Descripción

`src/components/ProtectedRoute.tsx` existe y está bien implementado: redirige a `/login` si no hay sesión activa. Sin embargo, `src/router/index.tsx` no lo usa en ninguna ruta. Cualquier usuario anónimo puede acceder directamente a `/temporizadores`, `/salas`, `/empresas`, `/categorias` y `/empresastimersnew` tecleando la URL. Los controles de escritura se ocultan condicionalmente con `canEdit = isAuthenticated`, pero los datos son completamente públicos via las peticiones GET. Peor que no tener el componente: da falsa sensación de seguridad.

### Archivo y línea

`src/router/index.tsx` — líneas 12-27 (árbol de rutas completo)

### Código actual

```typescript
export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/', element: <TimerView /> },
      { path: '/login', element: <LoginView /> },
      { path: '/horario',           element: <HorarioView /> },
      { path: '/salas',             element: <SalasView /> },
      { path: '/empresas',          element: <EmpresasView /> },
      { path: '/categorias',        element: <CategoriasView /> },
      { path: '/temporizadores',    element: <TemporizadoresView /> },
      { path: '/empresastimersnew', element: <EmpresasEventoView /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
```

### Código corregido

Añadir `ProtectedRoute` al import y anidar las rutas admin bajo él:

```typescript
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { RootLayout } from '../components/RootLayout'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { TimerView } from '../views/TimerView'
import { LoginView } from '../views/LoginView'
import { HorarioView } from '../views/HorarioView'
import { SalasView } from '../views/SalasView'
import { EmpresasView } from '../views/EmpresasView'
import { CategoriasView } from '../views/CategoriasView'
import { TemporizadoresView } from '../views/TemporizadoresView'
import { EmpresasEventoView } from '../views/EmpresasEventoView'

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/', element: <TimerView /> },
      { path: '/login', element: <LoginView /> },
      { path: '/horario', element: <HorarioView /> },
      {
        element: <ProtectedRoute />,
        children: [
          { path: '/salas',             element: <SalasView /> },
          { path: '/empresas',          element: <EmpresasView /> },
          { path: '/categorias',        element: <CategoriasView /> },
          { path: '/temporizadores',    element: <TemporizadoresView /> },
          { path: '/empresastimersnew', element: <EmpresasEventoView /> },
        ],
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
```

### Cómo verificar

1. Cerrar sesión (botón "Salir") o abrir una ventana de incógnito.
2. Teclear directamente en la barra de URL: `http://localhost:5173/salas`.
3. Resultado esperado: la app redirige automáticamente a `/login`.
4. Hacer login y volver a `/salas` — debe cargar correctamente.
5. Repetir con `/empresas`, `/categorias`, `/temporizadores`, `/empresastimersnew`.
6. Verificar que `/` y `/horario` siguen siendo accesibles sin autenticación.

### Tiempo estimado

30 minutos

---

## A-02 — El interceptor de 401 destruye el estado de React con recarga completa

### Descripción

`httpClient.ts:24` usa `window.location.href = '/login'` cuando el backend devuelve 401 (token expirado). Esto fuerza una recarga completa del navegador: destruye todos los contextos de React, los formularios en vuelo, las promesas pendientes y —lo más importante— desconecta el socket WebSocket sin llamar a `disconnectSocket()`. El patrón correcto es propagar el evento de sesión expirada al `AuthContext` para que llame a `logout()` y use el router de React para navegar.

### Archivo y línea

`src/services/httpClient.ts` — líneas 22-25

### Código actual

```typescript
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

### Código corregido

El interceptor de Axios no tiene acceso al router de React. La solución más limpia sin reestructurar el árbol es usar un evento personalizado del DOM que `AuthContext` escucha:

**Paso 1 — Emitir un evento en el interceptor en lugar de forzar recarga:**

```typescript
// httpClient.ts — reemplazar líneas 22-28 completas
httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.dispatchEvent(new Event('auth:session-expired'))
    }
    return Promise.reject(error)
  }
)
```

**Paso 2 — Escuchar el evento en el componente que envuelve el árbol.**

Localizar el componente que provee `AuthContext` (normalmente `src/context/AuthContext.tsx` o similar). Añadir un `useEffect` que escuche el evento y llame a `logout()` + `navigate`:

```typescript
// Dentro del provider de AuthContext — añadir este useEffect:
useEffect(() => {
  const handler = () => {
    logout()
    navigate('/login', { replace: true })
  }
  window.addEventListener('auth:session-expired', handler)
  return () => window.removeEventListener('auth:session-expired', handler)
}, [logout, navigate])
```

Si el `AuthContext` no tiene acceso a `useNavigate` porque está fuera del `RouterProvider`, la alternativa mínima sin refactor estructural es exportar el `router` y usar `router.navigate('/login')`:

```typescript
// httpClient.ts
import { router } from '../router'

httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      router.navigate('/login', { replace: true })
    }
    return Promise.reject(error)
  }
)
```

Elegir la opción que sea compatible con la estructura actual de `AuthContext`.

### Cómo verificar

1. Con sesión activa, manipular manualmente el token en localStorage para que sea inválido (devtools > Application > Local Storage > cambiar el valor).
2. Realizar cualquier acción que dispare una petición autenticada (p.ej. navegar a `/salas`).
3. Resultado esperado: la app navega a `/login` **sin recargar la página** (no se pierde el estado del DOM, el socket no se desconecta abruptamente).
4. Resultado con el bug: la página recarga completamente, el socket se desconecta y los formularios en vuelo se pierden.
5. Verificar en la consola que `disconnectSocket()` se llama correctamente (añadir un `console.log` temporal en `logout`).

### Tiempo estimado

2 horas

---

## A-03 — Select "Evento" vacío en instalación limpia o tras borrar todas las asignaciones

### Descripción

En `EmpresasEventoView.tsx:37`, el array `idEventos` se construye haciendo deduplicación sobre `timerEventos` (las asignaciones existentes). Si no hay ninguna asignación en la base de datos —instalación limpia, o el administrador borró todas— `idEventos` es `[]` y el `<select name="idEvento">` no tiene opciones. El formulario de "Nueva asignación" queda con el campo Evento vacío y el usuario no puede crear ninguna asignación nueva. La validación de `formAction` (`!idEvento`) bloquea el submit correctamente, pero el bloqueo es invisible: el select simplemente no tiene opciones.

### Archivo y línea

`src/views/EmpresasEventoView.tsx` — línea 37

### Código actual

```typescript
const idEventos = [...new Map(timerEventos.map((te) => [te.idEvento, te])).values()]
```

### Código corregido

**Opción A — Fix mínimo: valor fijo `idEvento: 1` como hacía la original**

Eliminar el select de Evento del formulario y hardcodear el valor en `formAction`:

```typescript
// En formAction — reemplazar la línea que lee idEvento:
const idEvento = 1  // valor fijo, igual que la original

// Eliminar del JSX el bloque <select name="idEvento">...</select>
```

Usar esta opción si el sistema siempre tiene un único evento activo.

**Opción B — Fix correcto: cargar eventos desde el backend independientemente**

Añadir `getEventos` en `service.ts`:

```typescript
// service.ts — añadir después de getTES (línea 203):
export async function getEventos(): Promise<import('../types').Evento[]> {
  const { data } = await httpClient.get<import('../types').Evento[]>('api/eventos')
  return data
}
```

Actualizar `EmpresasEventoView.tsx` para incluir eventos en la promesa:

```typescript
// En EmpresasEventoView.tsx — cambiar el tipo ViewData (línea 16):
type ViewData = [Empresa[], Sala[], Timer[], TimerEvento[], import('../types').Evento[]]

// Actualizar EmpresasEventoView (líneas 149-162) — añadir getEventos a los Promise.all:
const [promise, setPromise] = useState<Promise<ViewData>>(
  () => Promise.all([getEmpresas(), getSalas(), getTemporizadores(), getTimersEventos(), getEventos()])
)
const refresh = () =>
  setPromise(Promise.all([getEmpresas(), getSalas(), getTemporizadores(), getTimersEventos(), getEventos()]))

// En EmpresasEventoContent — desestructurar el quinto elemento:
const [empresas, salas, timers, timerEventos, eventos] = use(promise)

// Y reemplazar la línea 37:
// const idEventos = [...new Map(timerEventos.map((te) => [te.idEvento, te])).values()]
// Por:
// (usar directamente `eventos` para el select)

// En el JSX del select de Evento — reemplazar:
{idEventos.map((te) => (
  <option key={te.idEvento} value={te.idEvento}>{te.evento}</option>
))}
// Por:
{eventos.map((ev) => (
  <option key={ev.idEvento} value={ev.idEvento}>{ev.evento}</option>
))}
```

Usar Opción B si el backend expone `GET api/eventos`. Si no existe ese endpoint, usar Opción A.

### Cómo verificar

**Opción A:**
1. Borrar todas las asignaciones existentes de la tabla.
2. Intentar crear una nueva asignación en `/empresastimersnew`.
3. Resultado esperado: el formulario envía correctamente con `idEvento: 1`.

**Opción B:**
1. Borrar todas las asignaciones.
2. Navegar a `/empresastimersnew`.
3. El select "Evento" debe tener opciones cargadas desde `api/eventos`.
4. Crear una asignación nueva — debe funcionar.

### Tiempo estimado

1 hora (Opción A: 20 min / Opción B: 1 hora dependiendo de si el endpoint existe)

---

## A-04 — Sort de timers inestable con timers simultáneos

### Descripción

El comparador de `useOptimistic` en `TemporizadoresView.tsx:42-44` usa `parseTimerInicio(a.inicio) < parseTimerInicio(b.inicio) ? -1 : 1`. Dos problemas: primero, el caso de igualdad devuelve `1` en lugar de `0`, produciendo orden no determinista cuando dos timers tienen el mismo `inicio`. Segundo, aunque Luxon `DateTime` implementa `valueOf()` y el operador `<` funciona técnicamente, la práctica correcta —y la que usa el resto del código (`TimerView.tsx:19`, `HorarioView.tsx:36-38`)— es `toMillis() - toMillis()`.

### Archivo y línea

`src/views/TemporizadoresView.tsx` — líneas 41-44

### Código actual

```typescript
const [optimisticTimers, removeOptimistic] = useOptimistic(
  [...timers].sort((a, b) =>
    parseTimerInicio(a.inicio) < parseTimerInicio(b.inicio) ? -1 : 1
  ),
  (state, id: number) => state.filter((t) => t.idTemporizador !== id)
)
```

### Código corregido

```typescript
const [optimisticTimers, removeOptimistic] = useOptimistic(
  [...timers].sort((a, b) =>
    parseTimerInicio(a.inicio).toMillis() - parseTimerInicio(b.inicio).toMillis()
  ),
  (state, id: number) => state.filter((t) => t.idTemporizador !== id)
)
```

### Cómo verificar

1. Crear dos temporizadores con exactamente la misma hora de inicio (misma fecha y hora en el formulario de edición — modificar los `inicio` desde la BD si es necesario para el test).
2. Sin el fix: el orden puede cambiar entre renders o entre navegadores.
3. Con el fix: el orden es estable (los dos timers con mismo inicio siempre mantienen el mismo orden relativo entre sí, y el orden general es correcto por hora ascendente).
4. Verificar que los timers se ordenan de más antiguo a más nuevo en la tabla.

### Tiempo estimado

15 minutos

---

## A-05 — `useOptimistic` llamado fuera de `startTransition` en 5 vistas

### Descripción

En React 19, las actualizaciones de `useOptimistic` deben ocurrir dentro de una transición (`startTransition`) para que React las trate como temporales y las revierta automáticamente si la mutación falla. Sin `startTransition`, la eliminación optimista puede no reflejarse de forma inmediata en la UI o puede generar warnings de React en consola (`Warning: An update to a component inside a Suspense was not wrapped in startTransition`). El patrón afecta a cinco vistas: `SalasView`, `EmpresasView`, `CategoriasView`, `TemporizadoresView` y `EmpresasEventoView`.

### Archivo y línea

- `src/views/SalasView.tsx` — línea 68: `removeOptimistic(id)`
- `src/views/EmpresasView.tsx` — línea 58: `removeOptimistic(id)`
- `src/views/CategoriasView.tsx` — línea 65: `removeOptimistic(id)`
- `src/views/TemporizadoresView.tsx` — línea 81: `removeOptimistic(id)`
- `src/views/EmpresasEventoView.tsx` — línea 71: `removeOptimistic(id)`

### Código actual (patrón común en las 5 vistas, mostrado con SalasView como referencia)

```typescript
// SalasView.tsx — handleDelete (líneas 59-71)
const handleDelete = async (id: number, nombre: string) => {
  const result = await Swal.fire({
    title: `¿Eliminar "${nombre}"?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Eliminar',
    cancelButtonText: 'Cancelar',
  })
  if (!result.isConfirmed) return
  removeOptimistic(id)
  await deleteSala(id)
  onRefresh()
}
```

```typescript
// EmpresasEventoView.tsx — handleDelete (líneas 62-74)
const handleDelete = async (id: number) => {
  const result = await Swal.fire({
    title: '¿Eliminar asignación?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Eliminar',
    cancelButtonText: 'Cancelar',
  })
  if (!result.isConfirmed) return
  removeOptimistic(id)
  await deleteTES(id)
  onRefresh()
}
```

### Código corregido

Añadir `startTransition` al import de React en cada vista y envolver `removeOptimistic`:

**SalasView.tsx** — cambiar el import de la línea 1 y el `handleDelete`:

```typescript
// Añadir startTransition al import existente
import { use, useState, useRef, useOptimistic, useActionState, Suspense, useCallback, startTransition } from 'react'

// handleDelete corregido:
const handleDelete = async (id: number, nombre: string) => {
  const result = await Swal.fire({
    title: `¿Eliminar "${nombre}"?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Eliminar',
    cancelButtonText: 'Cancelar',
  })
  if (!result.isConfirmed) return
  startTransition(() => removeOptimistic(id))
  await deleteSala(id)
  onRefresh()
}
```

**EmpresasView.tsx** — mismo patrón:

```typescript
import { use, useState, useOptimistic, useActionState, Suspense, useCallback, startTransition } from 'react'

const handleDelete = async (id: number, nombre: string) => {
  // ... Swal igual ...
  if (!result.isConfirmed) return
  startTransition(() => removeOptimistic(id))
  await deleteEmpresa(id)
  onRefresh()
}
```

**CategoriasView.tsx** — mismo patrón:

```typescript
import { use, useState, useOptimistic, useActionState, Suspense, useCallback, startTransition } from 'react'

const handleDelete = async (id: number) => {
  // ... Swal igual ...
  if (!result.isConfirmed) return
  startTransition(() => removeOptimistic(id))
  await deleteCategoria(id)
  onRefresh()
}
```

**TemporizadoresView.tsx** — mismo patrón:

```typescript
import { use, useState, useRef, useOptimistic, useActionState, Suspense, useCallback, startTransition } from 'react'

const handleDelete = async (id: number) => {
  // ... Swal igual ...
  if (!result.isConfirmed) return
  startTransition(() => removeOptimistic(id))
  await deleteTemporizador(id)
  setEditando(null)
  dialogRef.current?.close()
  onRefresh()
}
```

**EmpresasEventoView.tsx** — mismo patrón:

```typescript
import { use, useState, useOptimistic, useActionState, Suspense, useCallback, startTransition } from 'react'

const handleDelete = async (id: number) => {
  // ... Swal igual ...
  if (!result.isConfirmed) return
  startTransition(() => removeOptimistic(id))
  await deleteTES(id)
  onRefresh()
}
```

### Cómo verificar

1. Abrir DevTools > Console, filtrar por "Warning".
2. Con la sesión activa, eliminar un elemento en cada vista (sala, empresa, categoría, temporizador, asignación).
3. Sin el fix: posibles warnings de React sobre actualizaciones fuera de transición.
4. Con el fix: la fila eliminada desaparece inmediatamente al confirmar, sin warnings en consola.
5. Verificar que si la petición DELETE falla (p.ej. desconectando el backend), la fila eliminada de forma optimista vuelve a aparecer.

### Tiempo estimado

1 hora (cambio repetitivo en 5 archivos)

---

## A-06 — Capitalización diferente en endpoint `IncreaseTimers`

### Descripción

El endpoint original en `service.js` era `api/timers/increasetimers/:minutes` (todo minúsculas). La versión actual en `service.ts:186` usa `api/Timers/IncreaseTimers/:minutes` (con mayúsculas). En IIS/ASP.NET con routing case-insensitive esto no tiene impacto, pero en servidores Linux o con Kestrel configurado como case-sensitive, los tres botones de ajuste de tiempo (`+1 min`, `+5 min`, `-1 min`) devolverán 404 sin ningún error visible para el usuario. La verificación requiere probar contra el backend real.

### Archivo y línea

`src/services/service.ts` — línea 186

### Código actual

```typescript
export async function updateIncreaseTimers(minutes: number): Promise<void> {
  await httpClient.put(`api/Timers/IncreaseTimers/${minutes}`)
  emitSyncData()
}
```

### Código corregido

Si el backend falla con la capitalización actual, volver a la capitalización original:

```typescript
export async function updateIncreaseTimers(minutes: number): Promise<void> {
  await httpClient.put(`api/timers/increasetimers/${minutes}`)
  emitSyncData()
}
```

Si el backend acepta ambas formas (ASP.NET case-insensitive por defecto), no hay cambio necesario.

### Cómo verificar

1. Con sesión de administrador activa, navegar a `/login`.
2. Pulsar el botón `+1 min`.
3. Abrir DevTools > Network.
4. Verificar que la petición PUT devuelve 200 (éxito) o 404 (fallo por capitalización).
5. Si 404: aplicar el fix cambiando a minúsculas y repetir.
6. Confirmar con el mensaje de éxito de SweetAlert2 que aparece en `LoginView.tsx:48-53`.

### Tiempo estimado

30 minutos (15 de diagnóstico + 15 de fix si es necesario)
