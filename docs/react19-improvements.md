# React 19 — Mejoras aplicables a este proyecto

> **Contexto:** El scaffold ya tiene React 19.2.6 instalado. Este documento describe qué características nuevas de React 19 se deben adoptar, por qué, y cómo resuelven los problemas concretos del código legacy documentado en `DOCUMENTACION-COMPLETA.md`.

---

## 1. Panorama de React 19 relevante para este proyecto

React 19 introduce mejoras concretas en tres áreas que afectan directamente a este proyecto:

| Area | Caracteristica React 19 | Problema legacy que resuelve |
|---|---|---|
| Formularios y mutaciones | `useActionState`, `useFormStatus`, `useOptimistic` | Boilerplate de `isLoading`, `error`, `success` en cada CRUD |
| Consumo de contexto | `use(Context)` hook | `useContext` verboso en cada componente consumidor |
| Datos asincrónicos | `use(Promise)` con Suspense | Fetching sin manejo de estados de carga explícitos |
| Compilador | React Compiler (opt-in) | Re-renders innecesarios por falta de `useMemo`/`useCallback` |
| Metadata | `<title>`, `<meta>` en JSX | Sin gestión de `<head>` en el legacy |
| Recursos | `preload`, `preinit` | Sin precarga de imágenes/estilos críticos |

---

## 2. `useActionState` — Formularios CRUD sin boilerplate

### Problema en el legacy

Cada formulario del legacy (Categorias, Empresas, Salas, Temporizadores) mantenía manualmente tres estados:

```javascript
// Patron legacy (inferido del código)
const [isLoading, setIsLoading] = useState(false)
const [error, setError] = useState(null)
const [success, setSuccess] = useState(false)

const handleSubmit = async (e) => {
  e.preventDefault()
  setIsLoading(true)
  setError(null)
  try {
    await service.postCategoria(data)
    setSuccess(true)
  } catch (err) {
    setError(err.message)
  } finally {
    setIsLoading(false)
  }
}
```

Este patrón se repite en los 5 CRUDs con pequeñas variaciones, generando código duplicado difícil de mantener.

### Solucion con React 19

```typescript
// CategoriasView.tsx — React 19
import { useActionState } from 'react'
import { postCategoria } from '../services/service'
import type { Categoria } from '../types'

type FormState = { error: string | null; success: boolean }

async function crearCategoriaAction(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const nombre = formData.get('categoria') as string
  const duracion = Number(formData.get('duracion'))
  try {
    await postCategoria({ idCategoria: 0, categoria: nombre, duracion })
    return { error: null, success: true }
  } catch (err) {
    return { error: (err as Error).message, success: false }
  }
}

function CrearCategoriaForm() {
  const [state, formAction, isPending] = useActionState(
    crearCategoriaAction,
    { error: null, success: false }
  )

  return (
    <form action={formAction}>
      <input name="categoria" required />
      <input name="duracion" type="number" min="1" required />
      <button type="submit" disabled={isPending}>
        {isPending ? 'Guardando...' : 'Crear categoría'}
      </button>
      {state.error && <p role="alert">{state.error}</p>}
      {state.success && <p>Categoría creada correctamente</p>}
    </form>
  )
}
```

### Beneficio concreto

Elimina el boilerplate de `isLoading`/`error`/`success` en los 5 CRUDs (Categorias, Empresas, Salas, Temporizadores, EmpresasEventoTimersNew). Estimación: -40 líneas de estado por vista.

---

## 3. `useFormStatus` — Estado de envio en componentes hijo

### Problema en el legacy

El botón de envío del formulario tenía que recibir `isLoading` como prop desde el componente padre, acoplando el botón al estado del padre.

### Solucion con React 19

```typescript
// components/SubmitButton.tsx
import { useFormStatus } from 'react-dom'

interface SubmitButtonProps {
  label: string
  labelPending: string
}

export function SubmitButton({ label, labelPending }: SubmitButtonProps) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending}>
      {pending ? labelPending : label}
    </button>
  )
}
```

Este componente se reutiliza en todos los formularios sin recibir props de estado.

---

## 4. `useOptimistic` — Feedback inmediato en las listas CRUD

### Problema en el legacy

Al borrar una categoría con SweetAlert2, el usuario confirmaba la acción, se llamaba a la API y había que esperar la respuesta para actualizar la lista. Si la red era lenta, la lista parecía no responder.

### Solucion con React 19

```typescript
// CategoriasView.tsx — borrado optimista
import { useOptimistic } from 'react'
import type { Categoria } from '../types'

function ListaCategorias({ categorias }: { categorias: Categoria[] }) {
  const [optimisticCategorias, removeOptimistic] = useOptimistic(
    categorias,
    (state, idBorrado: number) =>
      state.filter((c) => c.idCategoria !== idBorrado)
  )

  async function handleDelete(id: number) {
    const confirmed = await Swal.fire({
      title: '¿Eliminar categoría?',
      showCancelButton: true,
    })
    if (!confirmed.isConfirmed) return

    removeOptimistic(id)          // actualiza la UI al instante
    await deleteCategoria(id)     // llama a la API en segundo plano
  }

  return (
    <ul>
      {optimisticCategorias.map((c) => (
        <li key={c.idCategoria}>
          {c.categoria} — {c.duracion} min
          <button onClick={() => handleDelete(c.idCategoria)}>Eliminar</button>
        </li>
      ))}
    </ul>
  )
}
```

### Beneficio concreto

Aplica a las listas de Categorias, Empresas, Salas y Temporizadores. La UI responde instantáneamente sin esperar la red, igual que las aplicaciones móviles nativas.

---

## 5. `use(Context)` — Consumo de contexto simplificado

### Problema en el legacy

No había contexto global en el legacy, solo `localStorage` y props drilling (la autenticación tenía que pasarse a cada componente que la necesitase).

### Solucion con React 19

React 19 permite consumir contexto con el hook `use()` en lugar de `useContext()`. La diferencia clave es que `use()` puede llamarse condicionalmente (dentro de bucles, condicionales), cosa que `useContext` no permite.

```typescript
// Antes (React 18)
import { useContext } from 'react'
import { AuthContext } from '../context/AuthContext'

function Menu() {
  const auth = useContext(AuthContext)  // siempre al nivel superior
  if (!auth) throw new Error('...')
  // ...
}

// Ahora (React 19)
import { use } from 'react'
import { AuthContext } from '../context/AuthContext'

function Menu() {
  const auth = use(AuthContext)  // mas conciso, puede usarse en condicionales
  // ...
}
```

Aplicar en: `Menu.tsx`, `TimerView.tsx`, `LoginView.tsx` y cualquier componente que consuma `AuthContext` o `TimerContext`.

---

## 6. `use(Promise)` con Suspense — Data fetching declarativo

### Problema en el legacy

Cada componente CRUD implementaba su propio `useEffect` + `useState` para cargar datos:

```javascript
// Patron legacy repetido en cada componente
const [categorias, setCategorias] = useState([])
const [loading, setLoading] = useState(true)

useEffect(() => {
  service.getCategorias().then(data => {
    setCategorias(data)
    setLoading(false)
  })
}, [])

if (loading) return <div>Cargando...</div>
```

Este patrón se repite para cada entidad en 6 componentes.

### Solucion con React 19

```typescript
// views/CategoriasView.tsx — React 19 con Suspense
import { use, Suspense } from 'react'
import { getCategorias } from '../services/service'

// La promesa se crea fuera del componente para evitar recrearla en cada render
const categoriasPromise = getCategorias()

function ListaCategorias() {
  const categorias = use(categoriasPromise)  // lanza la promesa a Suspense
  return <ul>{categorias.map(c => <li key={c.idCategoria}>{c.categoria}</li>)}</ul>
}

export function CategoriasView() {
  return (
    <Suspense fallback={<p>Cargando categorías...</p>}>
      <ListaCategorias />
    </Suspense>
  )
}
```

> **Nota de aplicacion:** Este patron funciona bien para datos de solo lectura. Para datos que se recargan tras mutaciones (post/put/delete), combinar con un `key` de invalidacion o con una solución de caché como `react-query`/`swr` (recomendado para el futuro pero no obligatorio en la migración inicial).

---

## 7. `useTransition` — Navegacion y operaciones no urgentes

### Problema en el legacy

El botón "Iniciar Evento" en `Login.js` emitía el evento `vamos` de forma síncrona y podía bloquear la UI durante la respuesta del sync server.

### Solucion con React 19

```typescript
// views/LoginView.tsx
import { useTransition } from 'react'
import { getSocket } from '../services/socketClient'

function BotonIniciarEvento() {
  const [isPending, startTransition] = useTransition()

  function handleIniciarEvento() {
    startTransition(() => {
      getSocket().emit('vamos')
    })
  }

  return (
    <button onClick={handleIniciarEvento} disabled={isPending}>
      {isPending ? 'Iniciando...' : 'Iniciar Evento'}
    </button>
  )
}
```

Aplicar también al formulario de login (la validación del token puede tardar 200–500ms en Azure).

---

## 8. Metadata nativa — `<title>` y `<meta>` en componentes

### Problema en el legacy

El título del documento era siempre el mismo (`events-timer`). No había gestión de meta-etiquetas por ruta.

### Solucion con React 19

React 19 eleva automáticamente los elementos `<title>`, `<meta>` y `<link>` al `<head>` del documento cuando se usan dentro de un componente. No se necesita `react-helmet` ni similar.

```typescript
// views/TimerView.tsx
export function TimerView() {
  return (
    <>
      <title>Timers en directo — Foro de Empleo Tajamar</title>
      <meta name="description" content="Countdown en tiempo real de los turnos del foro" />
      {/* resto del componente */}
    </>
  )
}

// views/LoginView.tsx
export function LoginView() {
  return (
    <>
      <title>Administración — Timers Tajamar</title>
      {/* resto del componente */}
    </>
  )
}
```

Aplicar en las 8 vistas con títulos descriptivos.

---

## 9. React Compiler (opt-in) — Memoizacion automatica

### Problema en el legacy

Sin TypeScript y sin `useMemo`/`useCallback`, el legacy probablemente sufría re-renders en cascada en `TimerView`: cada segundo el socket emite `timerID` y `envio`, lo que dispara un re-render del árbol. Sin memoización, componentes como el selector de sala o la lista de próximos timers se re-renderizaban innecesariamente cada segundo.

### Solucion con React 19

El React Compiler (anteriormente "React Forget") analiza el código y añade memoización automáticamente en tiempo de compilación. Para activarlo:

```javascript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [
          ['babel-plugin-react-compiler', {}],
        ],
      },
    }),
  ],
})
```

Instalar: `npm install --save-dev babel-plugin-react-compiler`

> **Advertencia:** El compilador exige que el código siga las reglas de React (sin mutaciones directas del estado, sin efectos secundarios fuera de hooks). Dado que el proyecto parte de cero con TypeScript estricto, estas reglas se cumplen por diseño. Activarlo desde el inicio evita tener que refactorizar después.

### Impacto esperado en este proyecto

La vista `TimerView` recibe actualizaciones del socket cada segundo. Sin el compilador, todos los componentes hijo se re-renderizan cada segundo aunque sus props no hayan cambiado. Con el compilador, solo se re-renderiza el componente `Tiempo` (que cambia cada segundo) y los componentes que dependen de `currentTimerId` (que cambia cada vez que pasa un timer, no cada segundo).

---

## 10. Server Components — Por que NO en este proyecto

React 19 estabiliza los React Server Components (RSC). Sin embargo, **no se deben adoptar en este proyecto** por las siguientes razones:

1. El despliegue es en Azure App Service como SPA estática (Vite). Los RSC requieren un servidor Node.js que gestione el render en el servidor (Next.js, Remix, etc.).
2. La funcionalidad crítica del proyecto (countdown en tiempo real vía Socket.IO) es inherentemente cliente: los Socket listeners no pueden vivir en un Server Component.
3. Aumentaría la complejidad de infraestructura sin beneficio real: los datos que se cargan no son voluminosos (máximo 48 empresas, 7 salas, ~100 timers).

**Alternativa:** usar Suspense + `use(Promise)` en el cliente para obtener UX similar (estado de carga declarativo) sin necesitar SSR.

---

## 11. Resumen de adoption por fase

| Feature React 19 | Fase donde se adopta | Impacto |
|---|---|---|
| `use(Context)` | Fase 3 (Context) | Consumo de AuthContext y TimerContext |
| `useTransition` | Fase 4 (Login) | Botón "Iniciar Evento" no bloqueante |
| `useActionState` | Fase 4 (todos los CRUDs) | Elimina boilerplate de isLoading/error |
| `useFormStatus` | Fase 4 (componente SubmitButton) | Botón de submit reutilizable |
| `useOptimistic` | Fase 4 (listas CRUD) | Borrado y actualización instantáneos |
| `use(Promise)` + Suspense | Fase 4–5 (carga de datos) | Sin useEffect+useState para fetch |
| Metadata nativa (`<title>`) | Fase 4–5 (todas las vistas) | Titulo de pestaña por ruta |
| React Compiler | Fase 1 (configuración) | Memoizacion automática |
| Server Components | No aplica | SPA cliente, Socket.IO |
