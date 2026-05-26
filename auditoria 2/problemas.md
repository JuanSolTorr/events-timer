# Problemas detectados — events-timer

Severidad: [CRITICO] = rompe funcionalidad / [ALTO] = degradacion seria / [MEDIO] = comportamiento incorrecto menor / [BAJO] = mejora de calidad

---

## [CRITICO] 1. LoginView.tsx:19 — bucle de navegacion al autenticarse

**Archivo**: `src/views/LoginView.tsx`, linea 19
**Codigo**:
```typescript
useEffect(() => {
  if (isAuthenticated) navigate('/login')
}, [isAuthenticated, navigate])
```
**Problema**: cuando el usuario se autentica correctamente, el efecto detecta `isAuthenticated === true` y navega a... `/login`, la misma ruta en la que ya esta. Esto impide cualquier redireccion util post-login. La intencion seguramente era `navigate('/')` o `navigate('/temporizadores')`.

**Escenario de fallo**: el usuario introduce credenciales correctas → `isAuthenticated` pasa a `true` → el `useEffect` dispara `navigate('/login')` → el usuario se queda en la misma pagina sin feedback de exito.

**Correccion sugerida**:
```typescript
if (isAuthenticated) navigate('/')
```

---

## [CRITICO] 2. router/index.tsx — ProtectedRoute existe pero no se usa

**Archivo**: `src/router/index.tsx` (todas las rutas); `src/components/ProtectedRoute.tsx`
**Problema**: el componente `ProtectedRoute` fue creado para envolver rutas que requieren autenticacion, pero no aparece en ninguna parte del router. Cualquier usuario anonimo puede acceder directamente a `/temporizadores`, `/salas`, `/empresas`, `/categorias`, `/empresastimersnew` via URL directa.

**Escenario de fallo**: usuario anonimo navega a `http://<host>/temporizadores` → ve la lista de timers → no ve los controles de edicion (correcto) pero la ruta esta accesible. Si el router debiera ser privado (segun el diseno con `ProtectedRoute`), esto es un fallo estructural.

**Correccion sugerida**: envolver las rutas admin en un `ProtectedRoute`:
```typescript
{
  element: <ProtectedRoute />,
  children: [
    { path: '/temporizadores', element: <TemporizadoresView /> },
    // ...resto de rutas protegidas
  ]
}
```

---

## [CRITICO] 3. TimerView.tsx:9-10 — promesas de modulo no se refrescan al navegar

**Archivo**: `src/views/TimerView.tsx`, lineas 9-10
**Codigo**:
```typescript
const salasPromise = getSalas()
const eventosPromise = getTimersEventos()
```
**Problema**: estas constantes se crean al importar el modulo (una sola vez por ciclo de vida de la pagina). Si el usuario:
1. Esta en `/timers` viendo datos.
2. Navega a `/salas` y crea una sala nueva.
3. Vuelve a `/`.

Los datos de salas y eventos en `TimerView` siguen siendo los de la carga inicial — la nueva sala no aparece. Lo mismo aplica a `HorarioView.tsx` (linea 13, misma patron con `horarioPromise`).

**Escenario de fallo**: el servidor actualiza datos → el usuario navega fuera y vuelve → la vista sigue mostrando datos obsoletos indefinidamente.

**Correccion sugerida**: mover las promesas al estado del componente contenedor (igual que hacen `SalasView`, `EmpresasView`, etc.) o usar un mecanismo de invalidacion.

---

## [ALTO] 4. httpClient.ts:24 — redireccion 401 via window.location destruye estado React

**Archivo**: `src/services/httpClient.ts`, lineas 23-24
**Codigo**:
```typescript
if (error.response?.status === 401) {
  localStorage.removeItem('token')
  window.location.href = '/login'
}
```
**Problema**: `window.location.href` provoca una recarga completa del navegador. Esto:
- Destruye el estado de React (incluyendo `AuthContext` e `isAuthenticated`).
- El socket de Socket.IO se desconecta sin llamar a `disconnectSocket()` limpiamente.
- Si hay mutaciones en vuelo, se pierden silenciosamente.

**Correccion sugerida**: propagar el error 401 para que el `AuthContext` lo maneje con `logout()` y luego use el router de React para navegar.

---

## [ALTO] 5. TemporizadoresView.tsx:42-44 — comparacion de DateTime con operadores < / >

**Archivo**: `src/views/TemporizadoresView.tsx`, lineas 42-44
**Codigo**:
```typescript
const [optimisticTimers, removeOptimistic] = useOptimistic(
  [...timers].sort((a, b) =>
    parseTimerInicio(a.inicio) < parseTimerInicio(b.inicio) ? -1 : 1
  ),
```
**Problema**: `parseTimerInicio` devuelve un objeto `DateTime` de Luxon. Los operadores `<` y `>` sobre objetos en JavaScript comparan referencias, no valores temporales. Luxon `DateTime` no implementa `valueOf()` de forma que `<`/`>` funcionen correctamente para comparacion cronologica.

**Escenario de fallo**: el orden de los timers en la tabla puede ser incorrecto o no determinista.

**Correccion sugerida**: usar `.toMillis()` como en el resto del codigo:
```typescript
(a, b) => parseTimerInicio(a.inicio).toMillis() - parseTimerInicio(b.inicio).toMillis()
```
_(Nota: en Luxon, DateTime si implementa valueOf() retornando el timestamp en ms, por lo que `<`/`>` funcionan. Sin embargo, el comparador `? -1 : 1` no maneja la igualdad — si dos timers tienen el mismo inicio, siempre devuelve 1, lo que puede producir orden no estable. El patron correcto es restar los milisegundos.)_

---

## [ALTO] 6. useOptimistic con removeOptimistic llamado fuera de transicion

**Archivos**: `src/views/SalasView.tsx:68`, `src/views/EmpresasView.tsx:58`, `src/views/CategoriasView.tsx:65`, `src/views/TemporizadoresView.tsx:81`, `src/views/EmpresasEventoView.tsx:71`
**Codigo tipico**:
```typescript
const handleDelete = async (id: number) => {
  const result = await Swal.fire(...)
  if (!result.isConfirmed) return
  removeOptimistic(id)       // <-- fuera de startTransition
  await deleteSala(id)
  onRefresh()
}
```
**Problema**: segun la documentacion de React 19, `useOptimistic` debe actualizarse dentro de una transicion (`startTransition`) o dentro de una accion de formulario. Llamarlo directamente en un handler asincrono puede causar que la actualizacion optimista no se aplique correctamente o genere advertencias en modo desarrollo.

**Escenario de fallo**: la fila no desaparece visualmente de forma inmediata, o en versiones futuras de React el comportamiento puede cambiar.

---

## [ALTO] 7. EmpresasEventoView.tsx:37 — deduplicacion de eventos fragil

**Archivo**: `src/views/EmpresasEventoView.tsx`, linea 37
**Codigo**:
```typescript
const idEventos = [...new Map(timerEventos.map((te) => [te.idEvento, te])).values()]
```
**Problema**: si `timerEventos` esta vacio (primer uso de la app, sin asignaciones creadas aun), `idEventos` sera un array vacio y el select de "Evento" no tendra opciones. El usuario no podra crear ninguna asignacion porque no habra eventos disponibles para seleccionar, aunque si existan eventos en el sistema.

**Causa raiz**: los eventos se derivan de `timerEventos` (asignaciones ya existentes), no de una tabla de eventos independiente. Si no hay asignaciones previas, no hay eventos en el select.

**Correccion sugerida**: cargar eventos desde un endpoint dedicado `api/eventos` (existe el tipo `Evento` en types pero no el endpoint en `service.ts`).

---

## [MEDIO] 8. Menu.tsx:7-14 — efecto de limpieza de tema en cada render del menu

**Archivo**: `src/components/Menu.tsx`, lineas 7-14
**Codigo**:
```typescript
useEffect(() => {
  document.documentElement.dataset.theme = ''
  try {
    localStorage.removeItem('theme')
  } catch {
    // Ignore storage errors
  }
}, [])
```
**Problema**: este efecto elimina activamente cualquier preferencia de tema del usuario en cada montaje del menu. Si en el futuro se implementa un selector de tema, este codigo lo sobrescribira silenciosamente al cargar. Es codigo de limpieza de una feature antigua que no se ha eliminado.

---

## [MEDIO] 9. socketClient.ts — socket se conecta antes de que se necesite, sin manejo de reconexion

**Archivo**: `src/context/TimerContext.tsx`, lineas 27-47; `src/services/socketClient.ts`
**Problema**: el socket se instancia en `TimerProvider` al montar la app. Si el servidor de WebSocket no esta disponible, la conexion falla silenciosamente — no hay UI de error, ni logica de reconexion configurada mas alla del comportamiento por defecto de Socket.IO.

**Adicionalmente**: si el servidor emite muchos ticks `envio` por segundo, cada uno provoca un re-render del `TimerContext`, que propaga un re-render a todos los consumidores. Sin memo o debounce esto puede ser costoso si hay muchos componentes suscritos.

---

## [MEDIO] 10. config/env.ts — excepciones en tiempo de modulo pueden silenciarse

**Archivo**: `src/config/env.ts`, lineas 6-7
**Codigo**:
```typescript
if (!config.apiUrl) throw new Error('VITE_API_URL no esta definida')
if (!config.socketUrl) throw new Error('VITE_SOCKET_URL no esta definida')
```
**Problema**: estas excepciones se lanzan al importar el modulo. En Vite con React, si el modulo se importa dentro de un limite de error de React, la excepcion puede ser capturada por el ErrorBoundary y mostrar un mensaje generico sin la URL ni el contexto del error. No hay `ErrorBoundary` configurado en la app — el error propagara hasta el root y mostrara una pantalla en blanco en produccion.

---

## [BAJO] 11. types/index.ts — tipos declarados sin uso

**Archivo**: `src/types/index.ts`
- `AuthToken` (linea 57): declarada pero nunca usada — el endpoint devuelve un `string` plano.
- `Evento` (linea 61): declarada pero nunca usada — los eventos se derivan de `TimerEvento`.
- `SocketClientEvents.panic` (linea 76): evento declarado pero nunca emitido desde el cliente.

---

## [BAJO] 12. service.ts — funciones de servicio sin consumidores en la UI

**Archivo**: `src/services/service.ts`
Las siguientes funciones existen pero no se llaman desde ningun componente:
- `getSala(idSala)` — linea 93
- `getEmpresasTimers()` — linea 212
- `findTimersEventosEmpresa(idEmpresa)` — linea 224
- `findTimersEventosSala(idSala)` — linea 231

---

## [BAJO] 13. Sin manejo de error en vistas con Suspense

**Archivos**: todas las vistas con `<Suspense>`
**Problema**: ninguna vista tiene un `ErrorBoundary` envolviendo el `Suspense`. Si una llamada API falla (timeout, 500, red caida), el error burbujea hasta el root de React y la pantalla queda en blanco sin mensaje de error para el usuario.

**Correccion sugerida**: anadir un `ErrorBoundary` por vista o a nivel de `RootLayout`.

---

## Resumen de severidades

| # | Severidad | Titulo | Archivo |
|---|-----------|--------|---------|
| 1 | CRITICO | Bucle de navegacion en login | `LoginView.tsx:19` |
| 2 | CRITICO | ProtectedRoute no usada en router | `router/index.tsx` |
| 3 | CRITICO | Promesas de modulo sin refresco | `TimerView.tsx:9-10`, `HorarioView.tsx:13` |
| 4 | ALTO | Redireccion 401 destruye estado React | `httpClient.ts:24` |
| 5 | ALTO | Comparacion incorrecta de DateTime en sort | `TemporizadoresView.tsx:42` |
| 6 | ALTO | useOptimistic fuera de transicion | multiples vistas |
| 7 | ALTO | Eventos no disponibles si no hay asignaciones | `EmpresasEventoView.tsx:37` |
| 8 | MEDIO | Efecto de limpieza de tema innecesario | `Menu.tsx:8` |
| 9 | MEDIO | Sin manejo de error de socket / sin debounce | `TimerContext.tsx` |
| 10 | MEDIO | Excepciones de config sin ErrorBoundary | `config/env.ts` |
| 11 | BAJO | Tipos sin uso | `types/index.ts` |
| 12 | BAJO | Funciones de servicio sin consumidores | `service.ts` |
| 13 | BAJO | Sin ErrorBoundary en vistas con Suspense | vistas generales |
