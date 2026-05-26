# Fase 1 — Bugs críticos (bloquean la app ahora mismo)

Bugs: C-01, C-02, C-03, C-04

Tiempo total estimado: 4-6 horas

---

## C-01 — Bucle de navegación post-login

### Descripción

Cuando el administrador introduce credenciales correctas, `isAuthenticated` pasa a `true`. El `useEffect` de la línea 18 reacciona y llama a `navigate('/login')`, devolviendo al usuario exactamente a la misma página. El flujo de login se convierte en un bucle infinito sin ningún feedback de éxito. El panel de administración es inaccesible.

### Archivo y línea

`src/views/LoginView.tsx` — línea 19

### Código actual

```typescript
useEffect(() => {
  if (isAuthenticated) navigate('/login')
}, [isAuthenticated, navigate])
```

### Código corregido

```typescript
useEffect(() => {
  if (isAuthenticated) navigate('/')
}, [isAuthenticated, navigate])
```

### Cómo verificar

1. Arrancar la app con `npm run dev`.
2. Navegar a `/login`.
3. Introducir credenciales de administrador válidas y pulsar "Entrar".
4. Resultado esperado: la app redirige a `/` (vista de cuenta atrás) y el menú muestra el botón "Salir" y el enlace "Temporizadores".
5. Resultado con el bug: la URL permanece en `/login` sin cambiar.

### Tiempo estimado

15 minutos

---

## C-02 — Token guardado como `[object Object]` si el backend devuelve `{ response: string }`

### Descripción

`service.ts:82` declara el tipo de respuesta como `string` y devuelve `data` directamente. Si el backend de ASP.NET sigue devolviendo `{ response: "<JWT>" }` (objeto JSON), Axios deserializa el objeto, y `localStorage.setItem(TOKEN_KEY, token)` convierte ese objeto a la cadena `"[object Object]"`. La app parece autenticada (`token !== null`) pero cada petición enviará `Authorization: Bearer [object Object]`, que el backend rechazará con 401.

### Archivo y línea

`src/services/service.ts` — línea 81-84  
`src/services/authService.ts` — línea 8-9

### Código actual

```typescript
// service.ts:81-84
export async function generateToken(credentials: LoginCredentials): Promise<string> {
  const { data } = await httpClient.post<string>('Auth/Login', credentials)
  return data
}
```

```typescript
// authService.ts:7-9
export async function login(credentials: LoginCredentials): Promise<void> {
  const token = await generateToken(credentials)
  localStorage.setItem(TOKEN_KEY, token)
}
```

### Código corregido

Verificar primero con DevTools (Network > `Auth/Login` > Response) qué devuelve el backend real.

**Caso A — El backend devuelve `{ "response": "<JWT>" }` (objeto):**

```typescript
// service.ts:81-84 — cambiar tipo y acceso al campo
export async function generateToken(credentials: LoginCredentials): Promise<string> {
  const { data } = await httpClient.post<{ response: string }>('Auth/Login', credentials)
  return data.response
}
```

`authService.ts` no necesita cambios en el caso A.

**Caso B — El backend ya devuelve la cadena JWT directamente:**

El código actual es correcto. No hay cambio.

### Cómo verificar

1. Abrir DevTools > Network.
2. Hacer login con credenciales válidas.
3. Inspeccionar la respuesta de `POST Auth/Login`:
   - Si la respuesta es una cadena (`"eyJ..."`) → Caso B, sin cambio.
   - Si la respuesta es `{ "response": "eyJ..." }` → Caso A, aplicar el fix.
4. Tras aplicar el fix (si Caso A): hacer login, abrir Application > Local Storage, verificar que el valor de `token` empieza por `eyJ` y no por `[object`.
5. Navegar a `/salas` — la petición GET debe devolver 200, no 401.

### Tiempo estimado

30 minutos (15 de diagnóstico + 15 de fix si Caso A)

---

## C-03 — DELETE de TiempoEmpresaSala puede enviar ID `undefined`

### Descripción

La interfaz `TiempoEmpresaSala` usa `uniqueId` como campo PK, pero la función `getTES` en `service.ts` hace `httpClient.get<TiempoEmpresaSala[]>` sin pasar los datos por ninguna función de mapeo. Si el backend devuelve el campo con nombre `id` (como hacía la versión original), TypeScript no lo detecta en runtime y todos los registros tendrán `uniqueId: undefined`. Al pulsar "Eliminar" en `EmpresasEventoView`, se llama `deleteTES(te.uniqueId)` — es decir, `deleteTES(undefined)` — generando `DELETE api/TiempoEmpresaSala/undefined`. El servidor devuelve 404 o, en el peor caso, borra el registro con ID 0.

Comparación con `mapSala` y `mapEmpresa` que sí tienen fallback: `sala: data.sala ?? data.nombreSala ?? ''`.

### Archivo y línea

`src/services/service.ts` — líneas 192-195 (función `getTES`)  
`src/types/index.ts` — líneas 25-31 (interfaz `TiempoEmpresaSala`)

### Código actual

```typescript
// service.ts:192-195
export async function getTES(): Promise<TiempoEmpresaSala[]> {
  const { data } = await httpClient.get<TiempoEmpresaSala[]>('api/TiempoEmpresaSala')
  return data
}
```

### Código corregido

Añadir un tipo interno `ApiTES` y una función `mapTES` con fallback, igual que el patrón ya existente para `Sala` y `Empresa`. Insertar justo después de la declaración de `ApiTimerEvento` (línea 37) y antes de `mapSala` (línea 39):

```typescript
// Añadir en service.ts — después de la línea 37 (cierre de ApiTimerEvento)
type ApiTES = {
  uniqueId?: number
  id?: number
  idTimer: number
  idEmpresa: number
  idSala: number
  idEvento: number
}

function mapTES(data: ApiTES): TiempoEmpresaSala {
  return {
    uniqueId: data.uniqueId ?? data.id ?? 0,
    idTimer: data.idTimer,
    idEmpresa: data.idEmpresa,
    idSala: data.idSala,
    idEvento: data.idEvento,
  }
}
```

Y actualizar `getTES` para que use `mapTES`:

```typescript
// service.ts:192-195 — reemplazar la función completa
export async function getTES(): Promise<TiempoEmpresaSala[]> {
  const { data } = await httpClient.get<ApiTES[]>('api/TiempoEmpresaSala')
  return data.map(mapTES)
}
```

### Cómo verificar

1. Con el backend corriendo, navegar a `/empresastimersnew`.
2. Abrir DevTools > Network, filtrar por `TiempoEmpresaSala`.
3. Inspeccionar la respuesta GET: verificar si el campo PK se llama `id` o `uniqueId` en el JSON real.
4. Con el fix aplicado: pulsar "Eliminar" en una asignación existente.
5. Verificar en Network que el DELETE va a `api/TiempoEmpresaSala/3` (número concreto), no a `api/TiempoEmpresaSala/undefined`.
6. La fila debe desaparecer de la tabla y no volver al refrescar.

### Tiempo estimado

1 hora

---

## C-04 — Datos de TimerView y HorarioView nunca se refrescan al navegar

### Descripción

`TimerView.tsx` declara `salasPromise` y `eventosPromise` como constantes de módulo (fuera de cualquier componente o hook). En JavaScript, las constantes de módulo se evalúan una sola vez en el momento de importar el archivo — no al montar el componente ni al navegar. Cada vez que el usuario navega a `/` o vuelve desde otra vista, el componente `TimerContent` usa la misma promesa resuelta al inicio. Si entre medias se crearon salas, timers o asignaciones nuevas, los datos en pantalla son obsoletos y no hay forma de refrescarlos sin recargar la página completa. `HorarioView` tiene el mismo patrón con `horarioPromise`.

### Archivo y línea

`src/views/TimerView.tsx` — líneas 9-10  
`src/views/HorarioView.tsx` — líneas 13-19

### Código actual

```typescript
// TimerView.tsx:9-10
const salasPromise = getSalas()
const eventosPromise = getTimersEventos()
```

```typescript
// HorarioView.tsx:13-19
const horarioPromise = Promise.all([
  getSalas(),
  getTemporizadores(),
  getCategorias(),
  getEmpresas(),
  getTES(),
])
```

### Código corregido

**TimerView.tsx** — mover las promesas a `useState` dentro del componente exportado, igual que hace `SalasView`:

```typescript
// Eliminar las líneas 9-10 (constantes de módulo)
// Reemplazar el componente TimerView (líneas 154-160) por:

export function TimerView() {
  const [salasPromise, setSalasPromise] = useState(() => getSalas())
  const [eventosPromise, setEventosPromise] = useState(() => getTimersEventos())

  const refresh = () => {
    setSalasPromise(getSalas())
    setEventosPromise(getTimersEventos())
  }

  return (
    <Suspense fallback={<p className="p-6">Cargando timer...</p>}>
      <TimerContent salasPromise={salasPromise} eventosPromise={eventosPromise} onRefresh={refresh} />
    </Suspense>
  )
}
```

Y actualizar `TimerContent` para recibir las promesas como props en lugar de leer las constantes de módulo:

```typescript
// Reemplazar la firma de TimerContent (línea 22):
function TimerContent({
  salasPromise,
  eventosPromise,
}: {
  salasPromise: Promise<Sala[]>
  eventosPromise: Promise<TimerEvento[]>
}) {
  const salas = use(salasPromise)
  const eventos = use(eventosPromise)
  // resto del cuerpo sin cambios
```

**HorarioView.tsx** — mismo patrón:

```typescript
// Eliminar líneas 13-19 (horarioPromise de módulo)
// Reemplazar el componente HorarioView (líneas 101-107) por:

export function HorarioView() {
  const [promise, setPromise] = useState(() =>
    Promise.all([getSalas(), getTemporizadores(), getCategorias(), getEmpresas(), getTES()])
  )
  const refresh = () =>
    setPromise(Promise.all([getSalas(), getTemporizadores(), getCategorias(), getEmpresas(), getTES()]))

  return (
    <Suspense fallback={<p className="p-4">Cargando horario...</p>}>
      <HorarioContent promise={promise} onRefresh={refresh} />
    </Suspense>
  )
}
```

Y actualizar `HorarioContent` para recibir `promise` como prop:

```typescript
// Reemplazar la firma de HorarioContent (línea 25):
function HorarioContent({ promise }: { promise: Promise<[Sala[], Timer[], Categoria[], Empresa[], TiempoEmpresaSala[]]> }) {
  const [salas, timers, categorias, empresas, tes] = use(promise) as [
    Sala[], Timer[], Categoria[], Empresa[], TiempoEmpresaSala[]
  ]
  // resto del cuerpo sin cambios
```

Añadir `useState` a los imports de `TimerView.tsx` y `HorarioView.tsx` donde no estén ya.

### Cómo verificar

1. Navegar a `/` — los timers cargan correctamente.
2. Navegar a `/salas` y crear una sala nueva.
3. Volver a `/` (sin recargar la página).
4. Resultado esperado: la nueva sala aparece en el selector de sala.
5. Resultado con el bug: la nueva sala no aparece hasta recargar.
6. Repetir el mismo flujo para `/horario`: crear un temporizador y verificar que aparece en la tabla de horario al volver, sin recargar.

### Tiempo estimado

2-3 horas
