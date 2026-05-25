# Fase 4 — Vistas de administracion (CRUD)

> Duracion estimada: 3-4 jornadas
> Prerequisito: Fase 3 completada (contextos y servicios disponibles).
> Paralelizable con: Fase 5 si hay dos desarrolladores.

---

## Criterio de entrada

- `useAuth()` y `useTimerState()` estan disponibles y sin errores TypeScript.
- `src/services/service.ts` tiene todos los metodos del legacy.
- `npm run build` pasa.

## Criterio de salida

- [ ] Las 6 vistas (Login, Categorias, Empresas, Salas, Temporizadores, EmpresasEvento) renderizan sin errores en dev.
- [ ] El CRUD completo de cada entidad funciona contra la API de testing (`https://apitimerstesting.azurewebsites.net/`).
- [ ] `syncData` se emite despues de cada POST, PUT y DELETE de categorias y temporizadores.
- [ ] `npm run lint` sin advertencias.
- [ ] No hay `console.error` visible en el navegador en ninguna vista.

---

## Hooks de React 19 a usar — resumen por vista

| Vista | `useActionState` | `useFormStatus` | `useOptimistic` | `useTransition` | `use(Promise)` + Suspense |
|---|---|---|---|---|---|
| LoginView | formulario login | SubmitButton | — | boton "Iniciar Evento" | — |
| CategoriasView | form crear/editar | SubmitButton | borrado lista | — | carga inicial |
| EmpresasView | form crear/editar | SubmitButton | borrado lista | — | carga inicial |
| SalasView | form crear/editar | SubmitButton | borrado lista | — | carga inicial |
| TemporizadoresView | form crear/editar | SubmitButton | borrado lista | — | carga inicial |
| EmpresasEventoView | form asignacion | SubmitButton | borrado asignacion | — | carga inicial |
| Menu | — | — | — | — | — |

---

## Componente compartido: SubmitButton

Crear primero `src/components/SubmitButton.tsx` porque todos los formularios lo usan:

```typescript
// src/components/SubmitButton.tsx
import { useFormStatus } from 'react-dom'

interface SubmitButtonProps {
  label: string
  labelPending?: string
  className?: string
}

export function SubmitButton({
  label,
  labelPending = 'Guardando...',
  className = 'btn btn-primary',
}: SubmitButtonProps) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? labelPending : label}
    </button>
  )
}
```

---

## Vista 4.1 — Menu (`src/components/Menu.tsx`)

El Menu no es una vista (no tiene ruta propia) sino un componente que aparece en todas las vistas de administracion. Crearlo primero porque las vistas lo importan.

Funcionalidad:
- NavLink a cada ruta de administracion usando React Router `<NavLink>`.
- Muestra las opciones de administracion solo si `useAuth().isAuthenticated`.
- Boton de logout que llama a `useAuth().logout()`.
- La ruta `/` (TimerView) siempre es visible aunque no este autenticado.

Hooks de React 19 a usar:
- `use(AuthContext)` via el hook `useAuth()` para leer `isAuthenticated` y acceder a `logout`.

Estructura minima:

```typescript
// src/components/Menu.tsx
import { NavLink } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function Menu() {
  const { isAuthenticated, logout } = useAuth()

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
      <div className="container-fluid">
        <NavLink className="navbar-brand" to="/">Timers Tajamar</NavLink>
        {isAuthenticated && (
          <div className="navbar-nav">
            <NavLink className="nav-link" to="/horario">Horario</NavLink>
            <NavLink className="nav-link" to="/salas">Salas</NavLink>
            <NavLink className="nav-link" to="/empresas">Empresas</NavLink>
            <NavLink className="nav-link" to="/categorias">Categorias</NavLink>
            <NavLink className="nav-link" to="/temporizadores">Temporizadores</NavLink>
            <NavLink className="nav-link" to="/empresastimersnew">Asignaciones</NavLink>
            <button className="btn btn-outline-light btn-sm ms-2" onClick={logout}>
              Salir
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}
```

---

## Vista 4.2 — Login (`src/views/LoginView.tsx`)

Funcionalidad:
- Formulario con campos `userName` y `password`.
- Al autenticar, llama a `useAuth().login()` y redirige a `/horario`.
- Boton "Iniciar Evento" (visible solo si autenticado): emite el evento `vamos` al sync server.
- Boton de incremento de tiempo: llama a `updateIncreaseTimers(n)` del service.
- Muestra la hora actual en zona `Europe/Madrid` usando Luxon.
- NO incluir boton de `panic` ni de `resetEmergency` (estan comentados en el legacy y no deben reaparecer).

Hooks de React 19 a usar:
- `useActionState` para el formulario de login (maneja `isPending`, `error`, `success` sin estado manual).
- `useTransition` para el boton "Iniciar Evento" (emision del socket no bloquea la UI).
- `use(AuthContext)` via `useAuth()`.

Esquema de la action del formulario:

```typescript
async function loginAction(
  _prevState: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  const credentials = {
    userName: formData.get('userName') as string,
    password: formData.get('password') as string,
  }
  try {
    await authService.login(credentials)
    return { error: null }
  } catch {
    return { error: 'Usuario o contraseña incorrectos' }
  }
}
```

Tras un login exitoso (`state.error === null` y `!isPending`), usar `useNavigate()` de React Router para redirigir a `/horario`.

---

## Vista 4.3 — Categorias (`src/views/CategoriasView.tsx`)

Funcionalidad:
- Lista todas las categorias cargadas con `getCategorias()`.
- Formulario inline para crear nueva categoria (nombre + duracion en minutos).
- Boton de editar que carga los valores de la categoria en el formulario.
- Boton de eliminar con confirmacion SweetAlert2.
- Validacion en cliente: no permitir duplicados por nombre (comparar contra la lista antes de POST).

Hooks de React 19 a usar:
- `use(Promise)` + Suspense para la carga inicial: `const categoriasPromise = getCategorias()` fuera del componente.
- `useActionState` para el formulario de creacion/edicion.
- `useFormStatus` en `<SubmitButton>`.
- `useOptimistic` para el borrado: la fila desaparece de la UI inmediatamente, la API se llama en segundo plano.

Flujo de borrado con `useOptimistic`:

```typescript
const [optimisticCats, removeOptimistic] = useOptimistic(
  categorias,
  (state, idBorrado: number) => state.filter((c) => c.idCategoria !== idBorrado)
)

async function handleDelete(id: number) {
  const result = await Swal.fire({
    title: '¿Eliminar categoria?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Eliminar',
    cancelButtonText: 'Cancelar',
  })
  if (!result.isConfirmed) return
  removeOptimistic(id)        // UI actualizada al instante
  await deleteCategoria(id)   // llamada a la API (service.ts emite syncData)
}
```

---

## Vista 4.4 — Empresas (`src/views/EmpresasView.tsx`)

Funcionalidad:
- Lista empresas con logo (`<img loading="lazy" alt="Logo de {empresa}" />`).
- CRUD completo: crear, editar nombre, eliminar.
- Confirmacion de borrado con SweetAlert2.

Hooks de React 19 a usar:
- `use(Promise)` + Suspense para carga inicial.
- `useActionState` para formulario.
- `useFormStatus` en `<SubmitButton>`.
- `useOptimistic` para borrado instantaneo.

Nota: la API para empresas usa paths con el nombre en la URL (`createempresa/{nombre}`, `updateempresa/{id}/{nombre}`). No hay body JSON para crear/editar.

---

## Vista 4.5 — Salas (`src/views/SalasView.tsx`)

Funcionalidad:
- Lista de salas existentes.
- Crear sala nueva (solo nombre).
- Renombrar sala (PUT con id y nuevo nombre).
- Eliminar sala con confirmacion SweetAlert2.
- El formulario de creacion/edicion se abre en un `<dialog>` nativo (no Bootstrap modal). El `<dialog>` es accesible por defecto: gestiona foco, `Escape` para cerrar, y no necesita ARIA adicional.

Hooks de React 19 a usar:
- `use(Promise)` + Suspense para carga inicial.
- `useActionState` para el formulario del dialog.
- `useFormStatus` en `<SubmitButton>`.
- `useOptimistic` para borrado.

Esquema del `<dialog>` nativo:

```typescript
const dialogRef = useRef<HTMLDialogElement>(null)

function abrirDialog() { dialogRef.current?.showModal() }
function cerrarDialog() { dialogRef.current?.close() }

// En el JSX:
<dialog ref={dialogRef}>
  <form method="dialog" action={formAction}>
    <input name="sala" required />
    <SubmitButton label="Guardar" />
    <button type="button" onClick={cerrarDialog}>Cancelar</button>
  </form>
</dialog>
```

---

## Vista 4.6 — Temporizadores (`src/views/TemporizadoresView.tsx`)

Funcionalidad:
- Lista de timers ordenados por `inicio` (usar `parseTimerInicio` de `src/utils/timezone.ts` para ordenar correctamente en zona `Europe/Madrid`).
- Formulario: campo `datetime-local` para `inicio` + selector de categoria.
- Validacion antes de POST: el `inicio` debe ser una fecha futura.
- Al crear/editar/borrar, `service.ts` emite `syncData` automaticamente.

Hooks de React 19 a usar:
- `use(Promise)` + Suspense para cargar tanto `getTemporizadores()` como `getCategorias()` en paralelo con `Promise.all()`.
- `useActionState` para el formulario.
- `useFormStatus` en `<SubmitButton>`.
- `useOptimistic` para borrado.

Carga paralela con Suspense:

```typescript
// Fuera del componente — se crea una sola vez por montaje
const dataPromise = Promise.all([getTemporizadores(), getCategorias()])

function TemporizadoresList() {
  const [timers, categorias] = use(dataPromise)
  // ...
}

export function TemporizadoresView() {
  return (
    <Suspense fallback={<p>Cargando...</p>}>
      <TemporizadoresList />
    </Suspense>
  )
}
```

Validacion de fecha futura:

```typescript
import { ahora } from '../utils/timezone'
import { DateTime } from 'luxon'

function esFechaFutura(datetimeLocalValue: string): boolean {
  const seleccionado = DateTime.fromISO(datetimeLocalValue)
  return seleccionado > ahora()
}
```

---

## Vista 4.7 — EmpresasEvento (`src/views/EmpresasEventoView.tsx`)

Esta es la vista mas compleja del CRUD. Gestiona la tabla de relacion `TIEMPOS_EMPRESAS_SALAS`.

Funcionalidad:
- Cuatro selectores: empresa, sala, temporizador, evento.
- Boton "Asignar": crea un registro en `TiempoEmpresaSala` via `postTES`.
- Tabla de asignaciones actuales con columnas: Empresa, Sala, Timer (fecha inicio), Evento.
- Boton de eliminar en cada fila con confirmacion SweetAlert2.
- La tabla se actualiza tras cada operacion.

Fuente de datos:
- `getEmpresas()` — para el selector de empresa.
- `getSalas()` — para el selector de sala.
- `getTemporizadores()` — para el selector de timer (mostrar la fecha formateada).
- `getTimersEventos()` — para la tabla de asignaciones actuales (es la vista JOIN que ya tiene empresa, sala, etc.).
- `getTES()` — para el borrado (necesita el `uniqueId`).

Hooks de React 19 a usar:
- `use(Promise)` + Suspense para carga inicial de todos los selectores.
- `useActionState` para el formulario de asignacion.
- `useFormStatus` en `<SubmitButton>`.
- `useOptimistic` para borrado de asignaciones.

IMPORTANTE: La ruta antigua `/empresaseventotimers` (sin "new") NO existe en este proyecto. Solo existe `/empresastimersnew` con este componente.

---

## Estructura de carpeta al finalizar esta fase

```
src/
├── components/
│   ├── Menu.tsx             (creado)
│   ├── SubmitButton.tsx     (creado)
│   └── ProtectedRoute.tsx   (actualizado en Fase 3)
└── views/
    ├── LoginView.tsx        (creado)
    ├── CategoriasView.tsx   (creado)
    ├── EmpresasView.tsx     (creado)
    ├── SalasView.tsx        (creado)
    ├── TemporizadoresView.tsx (creado)
    └── EmpresasEventoView.tsx (creado)
```

---

## Verificacion final

Ejecutar contra la API de testing (`VITE_API_URL=https://apitimerstesting.azurewebsites.net/`):

- [ ] GET de cada entidad devuelve datos sin errores en consola.
- [ ] POST de una categoria nueva aparece en la lista al recargar.
- [ ] DELETE con SweetAlert2: confirmar elimina, cancelar no hace nada.
- [ ] Borrado optimista: la fila desaparece inmediatamente al confirmar, antes de que la API responda.
- [ ] `syncData` se emite: abrir el log del sync server y verificar que se recibe tras cada mutacion de categorias o temporizadores.
- [ ] La validacion de fecha futura en Temporizadores rechaza fechas pasadas antes de llamar a la API.

---

## Al cerrar la fase

```bash
git add src/views/ src/components/Menu.tsx src/components/SubmitButton.tsx
git commit -m "fase-4: vistas CRUD — Login, Categorias, Empresas, Salas, Temporizadores, EmpresasEvento"
git tag v0.4-crud
```
