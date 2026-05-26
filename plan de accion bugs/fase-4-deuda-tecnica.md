# Fase 4 — Deuda técnica y notas de migración no aplicadas

Bugs: B-01, B-02, B-03 + ítems de migration-notes.md pendientes (M-04, M-05, M-07, M-12)

Tiempo total estimado: 4-6 horas

Prerequisito: Fases 1, 2 y 3 completadas. Esta fase no desbloquea nada crítico — es limpieza y robustez.

---

## B-01 — `AuthToken`, `Evento` y `SocketClientEvents.panic` declarados sin ningún uso

### Descripción

`src/types/index.ts` declara tres elementos que no son consumidos por ningún componente, servicio ni hook del proyecto:
- `AuthToken` (línea 57-59): interfaz con un solo campo `token: string`. Nunca se usa como tipo en ninguna función.
- `Evento` (líneas 61-66): interfaz con `idEvento`, `evento`, `inicioEvento`, `finEvento`. La vista `EmpresasEventoView` necesita esta estructura pero en lugar de usar este tipo, deriva eventos de `TimerEvento`. Si se implementa la Opción B del fix A-03, este tipo debería usarse.
- `SocketClientEvents.panic` (línea 76): el evento `panic` figura en el tipo de eventos del cliente pero nunca se emite desde ninguna vista. Era un botón de emergencia comentado en la original que nunca fue portado.

Mantener código muerto en los tipos aumenta el tamaño mental del módulo y lleva a confusión: "¿debería estar usando `AuthToken` en algún sitio?".

### Archivo y línea

`src/types/index.ts` — líneas 57-59 (`AuthToken`), 61-66 (`Evento`), 76 (`panic`)

### Código actual

```typescript
export interface AuthToken {
  token: string
}

export interface Evento {
  idEvento: number
  evento: string
  inicioEvento: string
  finEvento: string
}

export interface SocketClientEvents {
  vamos: () => void
  syncData: () => void
  panic: () => void
}
```

### Código corregido

**Si el fix A-03 Opción B (carga de eventos desde API) está implementado:**
- Mantener `Evento` — se usará como tipo de retorno de `getEventos()`.
- Eliminar `AuthToken` (reemplazado por `LoginCredentials` + el token como `string` plano en `authService`).
- Eliminar `panic` de `SocketClientEvents`.

```typescript
// types/index.ts — eliminar AuthToken completo (líneas 57-59)
// types/index.ts — mantener Evento si se implementó A-03 Opción B

export interface SocketClientEvents {
  vamos: () => void
  syncData: () => void
  // panic eliminado — evento de emergencia no portado
}
```

**Si el fix A-03 Opción A (idEvento hardcodeado) está implementado:**
- Eliminar `AuthToken`, `Evento` (no se usa) y `panic`.

### Cómo verificar

1. Eliminar los tipos.
2. Ejecutar `npm run build` — debe compilar sin errores de TypeScript.
3. Si hay errores de "Cannot find name 'AuthToken'", buscar el consumidor y ajustar.
4. Verificar que el socket sigue funcionando (vamos, syncData) en el flujo normal.

### Tiempo estimado

30 minutos

---

## B-02 — Funciones de servicio exportadas sin consumidores en la UI

### Descripción

`src/services/service.ts` exporta cuatro funciones que no son llamadas desde ningún componente, vista ni hook del proyecto actual:

- `getSala(idSala)` — línea 93: obtiene una sala por ID. Ninguna vista hace lookup individual.
- `getEmpresasTimers()` — línea 212: alias de `api/timereventos/empresastimers`. `EmpresasView` usa `getEmpresas()` (endpoint distinto).
- `findTimersEventosEmpresa(idEmpresa)` — línea 224: obtiene timers por empresa. No hay vista que filtre por empresa individualmente.
- `findTimersEventosSala(idSala)` — línea 231: obtiene timers por sala. `TimerView` filtra en cliente, no usa este endpoint.

Exportar funciones sin consumidores es ruido de API surface. Si el backend las mantiene y pueden ser útiles, deben documentarse como "reservadas para uso futuro". Si no hay plan de uso, deben eliminarse.

### Archivo y línea

`src/services/service.ts` — líneas 93-96, 212-215, 224-228, 231-235

### Código actual

```typescript
// líneas 93-96
export async function getSala(idSala: number): Promise<Sala> {
  const { data } = await httpClient.get<Sala>(`api/salas/${idSala}`)
  return data
}

// líneas 212-215
export async function getEmpresasTimers(): Promise<Empresa[]> {
  const { data } = await httpClient.get<ApiEmpresa[]>('api/timereventos/empresastimers')
  return data.map(mapEmpresa)
}

// líneas 224-228
export async function findTimersEventosEmpresa(idEmpresa: number): Promise<TimerEvento[]> {
  const { data } = await httpClient.get<ApiTimerEvento[]>(
    `api/timereventos/eventosempresa/${idEmpresa}`
  )
  return data.map(mapTimerEvento)
}

// líneas 231-235
export async function findTimersEventosSala(idSala: number): Promise<TimerEvento[]> {
  const { data } = await httpClient.get<ApiTimerEvento[]>(
    `api/timereventos/eventossala/${idSala}`
  )
  return data.map(mapTimerEvento)
}
```

### Código corregido

**Opción A — Eliminar las funciones sin uso:**

Eliminar los cuatro bloques. Antes de eliminar, buscar en toda la base de código que no estén referenciadas:

```
grep -r "getSala\|getEmpresasTimers\|findTimersEventosEmpresa\|findTimersEventosSala" src/
```

Si no hay resultados fuera de `service.ts`, eliminar con seguridad.

**Opción B — Documentar como API reservada:**

```typescript
// Reservado para uso futuro — endpoint disponible pero sin consumidor en UI
export async function getSala(idSala: number): Promise<Sala> { ... }
```

### Cómo verificar

1. Ejecutar `npm run build` tras la eliminación.
2. Sin errores de TypeScript: las funciones no estaban siendo importadas.
3. Verificar que los tests (si existen) no referencian estas funciones.

### Tiempo estimado

30 minutos

---

## B-03 — Borrado en cascada (TES antes del padre) no implementado

### Descripción

La nota de migración M-07 indicaba que el borrado en cascada debía implementarse con `Promise.all`: eliminar primero todas las asignaciones de `TiempoEmpresaSala` que referencien a una sala, empresa o timer antes de borrar el padre. Si el backend de ASP.NET tiene `ON DELETE CASCADE` configurado en la base de datos relacional, esto lo gestiona el servidor automáticamente y no hay acción necesaria en el frontend. Si no está configurado, el DELETE del padre fallará con un error de FK violation (típicamente 409 Conflict o 500 del servidor).

Las vistas actuales solo hacen el DELETE del elemento padre directamente: `deleteSala(id)`, `deleteEmpresa(id)`, `deleteTemporizador(id)` — sin gestionar las asignaciones TES asociadas.

### Archivo y línea

- `src/views/SalasView.tsx` — línea 69: `await deleteSala(id)` (sin cascade)
- `src/views/EmpresasView.tsx` — línea 59: `await deleteEmpresa(id)` (sin cascade)
- `src/views/TemporizadoresView.tsx` — línea 82: `await deleteTemporizador(id)` (sin cascade)

### Código actual

```typescript
// SalasView.tsx:68-70
removeOptimistic(id)
await deleteSala(id)
onRefresh()
```

```typescript
// EmpresasView.tsx:57-60
removeOptimistic(id)
await deleteEmpresa(id)
onRefresh()
```

```typescript
// TemporizadoresView.tsx:81-86
removeOptimistic(id)
await deleteTemporizador(id)
setEditando(null)
dialogRef.current?.close()
onRefresh()
```

### Código corregido

**Paso previo — verificar si el backend tiene CASCADE:**

1. Intentar borrar una sala que tiene asignaciones TES en `/empresastimersnew`.
2. Si el backend devuelve 200/204: el CASCADE está en el servidor, no hay cambio necesario.
3. Si devuelve 409/500: el CASCADE no está, aplicar el fix de frontend.

**Fix para SalasView (si el backend no tiene CASCADE):**

Necesita `getTES` y `deleteTES` disponibles. Añadir los imports y modificar `handleDelete`:

```typescript
import { getSalas, postSala, putSala, deleteSala, getTES, deleteTES } from '../services/service'

const handleDelete = async (id: number, nombre: string) => {
  const result = await Swal.fire({
    title: `¿Eliminar "${nombre}"?`,
    text: 'Se eliminarán también todas las asignaciones de esta sala.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Eliminar',
    cancelButtonText: 'Cancelar',
  })
  if (!result.isConfirmed) return

  // Obtener y eliminar las asignaciones TES de esta sala
  const tes = await getTES()
  const tesDeEsta = tes.filter((t) => t.idSala === id)
  await Promise.all(tesDeEsta.map((t) => deleteTES(t.uniqueId)))

  startTransition(() => removeOptimistic(id))
  await deleteSala(id)
  onRefresh()
}
```

Mismo patrón para `EmpresasView` (filtrar por `t.idEmpresa === id`) y `TemporizadoresView` (filtrar por `t.idTimer === id` — usando `idTimer` del TES).

**Nota:** este fix requiere que C-03 (mapTES) esté implementado, o `t.uniqueId` podría ser `undefined`.

### Cómo verificar

1. Crear una asignación en `/empresastimersnew` vinculando una sala.
2. Intentar borrar esa sala desde `/salas`.
3. Sin el fix (y sin CASCADE en BD): el DELETE devuelve error, la sala permanece.
4. Con el fix: primero se borran las asignaciones TES asociadas, luego la sala. Verificar en `/empresastimersnew` que la asignación desapareció.

### Tiempo estimado

2 horas (diagnóstico + implementación si no hay CASCADE)

---

## Migration-notes M-04 — Endpoints de creación con parámetros en URL (no en body)

### Descripción

La nota M-04 recomendaba migrar los endpoints de creación y actualización de `POST /api/salas/createsala/:nombreSala` (nombre en URL) a `POST /api/salas` con body JSON. El fix actual solo añadió `encodeURIComponent` pero mantuvo la estructura de URL. El problema real es que nombres con caracteres especiales (barras `/`, `?`, `#`, `%`) pueden romper el routing del servidor aunque estén codificados, dependiendo del servidor HTTP y su configuración de `allowEncodedSlashes`.

### Archivo y línea

`src/services/service.ts` — líneas 98-100 (postSala), 102-104 (putSala), 122-124 (postEmpresa), 126-130 (putEmpresa)

### Código actual

```typescript
// líneas 98-100
export async function postSala(nombreSala: string): Promise<void> {
  await httpClient.post(`api/salas/createsala/${encodeURIComponent(nombreSala)}`)
}

// líneas 102-104
export async function putSala(idSala: number, nombreSala: string): Promise<void> {
  await httpClient.put(`api/salas/updatesala/${idSala}/${encodeURIComponent(nombreSala)}`)
}

// líneas 122-124
export async function postEmpresa(nombreEmpresa: string): Promise<void> {
  await httpClient.post(`api/empresas/createempresa/${encodeURIComponent(nombreEmpresa)}`)
}

// líneas 126-130
export async function putEmpresa(idEmpresa: number, nombreEmpresa: string): Promise<void> {
  await httpClient.put(
    `api/empresas/updateempresa/${idEmpresa}/${encodeURIComponent(nombreEmpresa)}`
  )
}
```

### Código corregido

Este cambio requiere coordinación con el backend. Si el backend de ASP.NET tiene un endpoint `POST api/salas` que acepta body JSON, usar:

```typescript
export async function postSala(nombreSala: string): Promise<void> {
  await httpClient.post('api/salas', { nombreSala })
}

export async function putSala(idSala: number, nombreSala: string): Promise<void> {
  await httpClient.put('api/salas', { idSala, nombreSala })
}
```

Si el backend no tiene esos endpoints y el cambio requiere modificar el servidor, documentar la limitación y mantener el `encodeURIComponent` actual como workaround hasta que el backend se actualice.

### Cómo verificar

1. Probar crear una sala con un nombre que contenga caracteres especiales: `Sala / Principal`, `Sala & Co`, `Sala "A"`.
2. Sin el fix: el servidor puede devolver 404 o interpretar mal el nombre.
3. Con el fix de body JSON: los caracteres especiales se transmiten sin problema.

### Tiempo estimado

1 hora (requiere coordinación con el backend)

---

## Migration-notes M-05 — Lógica de solapamiento de rangos de timers no portada

### Descripción

La app original validaba que un nuevo timer no se solapara en tiempo con timers existentes de la misma categoría. `src/utils/timezone.ts` existe y provee `parseTimerInicio` y `ahora`, pero la lógica de validación de solapamiento no fue portada a `TemporizadoresView`. La validación actual en `formAction` solo verifica que la fecha de inicio sea futura (`esFechaFutura`), no que no se solape con otro timer.

### Archivo y línea

`src/views/TemporizadoresView.tsx` — líneas 47-67 (formAction) — falta la validación de solapamiento

### Código actual

```typescript
const formAction = useCallback(
  async (_prev: FormState, formData: FormData): Promise<FormState> => {
    if (!editando) return { error: 'Selecciona un temporizador para editar' }
    const fecha = formData.get('fecha') as string
    const hora = formData.get('hora') as string
    const inicio = `${fecha}T${hora}`
    const idCategoria = Number(formData.get('idCategoria'))

    if (!esFechaFutura(inicio)) return { error: 'La fecha de inicio debe ser futura' }

    try {
      await putTemporizador({ ...editando, inicio, idCategoria })
      // ...
```

### Código corregido

Añadir función de validación de solapamiento y usarla en `formAction`:

```typescript
// Añadir en TemporizadoresView.tsx — después de esFechaFutura (línea 21):
function seSuperpone(nuevoInicio: string, idCategoria: number, timers: Timer[], idExcluir: number): boolean {
  const nuevaCategoria = timers.find((t) => t.idCategoria === idCategoria)
  if (!nuevaCategoria) return false
  const duracion = 0 // La duración no está en Timer directamente; necesita Categoria

  // Implementación simplificada: verificar si hay otro timer con el mismo inicio y misma categoría
  return timers.some(
    (t) =>
      t.idTemporizador !== idExcluir &&
      t.idCategoria === idCategoria &&
      t.inicio === nuevoInicio
  )
}
```

**Nota:** La validación completa de solapamiento requiere la duración de la categoría (campo `duracion` de `Categoria`). Como `timers` en el componente ya contiene tanto timers como categorias (via `use(promise)`), la implementación completa es:

```typescript
function seSuperpone(
  nuevoInicio: string,
  idCategoria: number,
  timers: Timer[],
  categorias: Categoria[],
  idExcluir: number
): boolean {
  const cat = categorias.find((c) => c.idCategoria === idCategoria)
  if (!cat) return false

  const nuevaStart = parseTimerInicio(nuevoInicio)
  const nuevaEnd = nuevaStart.plus({ minutes: cat.duracion })

  return timers.some((t) => {
    if (t.idTemporizador === idExcluir) return false
    const tStart = parseTimerInicio(t.inicio)
    const tCat = categorias.find((c) => c.idCategoria === t.idCategoria)
    const tEnd = tCat ? tStart.plus({ minutes: tCat.duracion }) : tStart

    // Solapamiento: start1 < end2 && start2 < end1
    return nuevaStart < tEnd && tStart < nuevaEnd
  })
}
```

Usar en `formAction`:

```typescript
if (seSuperpone(inicio, idCategoria, timers, categorias, editando.idTemporizador)) {
  return { error: 'El timer se solapa con otro timer existente en ese horario' }
}
```

### Cómo verificar

1. Crear dos timers con el mismo horario y misma categoría (p.ej. dos timers de 30 minutos a las 10:00).
2. Sin el fix: ambos se guardan sin error.
3. Con el fix: el segundo timer muestra "El timer se solapa con otro timer existente en ese horario".

### Tiempo estimado

1 hora

---

## Migration-notes M-07 — Borrado en cascada con Promise.all

(Ver B-03 en este mismo archivo — son el mismo problema. M-07 es la nota de migración, B-03 es el bug resultante de no haberla aplicado.)

---

## Migration-notes M-12 — `idEvento` dinámico genera select vacío en instalación limpia

(Ver A-03 en fase-2-altos.md — el fix de A-03 resuelve completamente este ítem.)
