# Flujo de la aplicacion — events-timer

## 1. Arranque (main.tsx)

```
StrictMode
  AuthProvider          <- isAuthenticated = localStorage.getItem('token') !== null
    TimerProvider       <- conecta socket.io al montar, escucha timerID y envio
      RouterProvider    <- rutas definidas en src/router/index.tsx
```

El socket se conecta **siempre** al montar `TimerProvider`, independientemente de si el usuario esta autenticado. Esto es correcto para la vista publica de cuenta atras.

---

## 2. Autenticacion

### Flujo de login

1. Usuario navega a `/login` → `LoginView`.
2. El formulario usa `useActionState` con `loginAction`.
3. `loginAction` llama a `authService.login({ userName, password })`.
4. `authService.login` → `generateToken` → `POST Auth/Login`.
5. Si OK: guarda JWT en `localStorage('token')` y llama `setIsAuthenticated(true)` en `AuthContext`.
6. Si falla: devuelve `{ error: 'Usuario o contraseña incorrectos' }`.

### Flujo de logout

1. Usuario pulsa "Salir" en el menu.
2. `authService.logout()` → elimina token de `localStorage` + `disconnectSocket()`.
3. `setIsAuthenticated(false)` en `AuthContext`.

### Autenticacion persistida

- Al recargar la pagina, `AuthContext` inicializa `isAuthenticated` con `authService.isAuthenticated()` = `localStorage.getItem('token') !== null`.
- **No se valida el token contra el servidor** en el arranque — un token expirado seguira mostrando `isAuthenticated: true` hasta que una llamada API devuelva 401.
- El interceptor de respuesta en `httpClient.ts` captura el 401, limpia el token y redirige via `window.location.href = '/login'` (recarga completa, perdiendo el estado de React).

### Proteccion de rutas

- El componente `ProtectedRoute` existe en `src/components/ProtectedRoute.tsx` pero **no esta usado en el router** (`src/router/index.tsx`).
- Todas las rutas admin (Temporizadores, Salas, Empresas, Categorias, EmpresasEventoView) son accesibles sin autenticacion. Las operaciones de escritura dentro de esas vistas si comprueban `canEdit = isAuthenticated` para mostrar/ocultar controles.

---

## 3. Vistas y componentes

### Mapa de rutas

| Ruta | Componente | Requiere auth | Descripcion |
|------|------------|---------------|-------------|
| `/` | `TimerView` | No | Pantalla publica de cuenta atras en vivo |
| `/login` | `LoginView` | No | Login admin + controles de evento |
| `/horario` | `HorarioView` | No | Horario completo por salas |
| `/salas` | `SalasView` | No (lectura) / Si (escritura) | CRUD de salas |
| `/empresas` | `EmpresasView` | No (lectura) / Si (escritura) | CRUD de empresas |
| `/categorias` | `CategoriasView` | No (lectura) / Si (escritura) | CRUD de categorias |
| `/temporizadores` | `TemporizadoresView` | No (lectura) / Si (escritura) | Listado y edicion de timers |
| `/empresastimersnew` | `EmpresasEventoView` | No (lectura) / Si (escritura) | Asignacion empresa-sala-timer |
| `*` | Navigate to `/` | — | Catch-all, redirige a raiz |

### TimerView (/)

- Carga `salas` y `timerEventos` en promesas de nivel modulo (se ejecutan una sola vez al importar).
- Lee `currentTimerId` y `secondsRemaining` del `TimerContext` (WebSocket).
- Permite seleccionar sala por dropdown o por parametro URL `?sala=N`.
- Muestra la empresa activa, su logo, la categoria y el tiempo restante.
- Muestra hasta 2 proximos turnos de la sala seleccionada.
- **Problema**: las promesas son constantes de modulo; si el usuario navega a otra vista y vuelve, los datos no se refrescan.

### LoginView (/login)

- Muestra el formulario de login si `!isAuthenticated`.
- Si `isAuthenticated`, muestra:
  - Boton "Iniciar Evento (Vamos)" → emite `vamos` al socket.
  - Botones de ajuste de timers (+1 min, +5 min, -1 min) → `PUT api/Timers/IncreaseTimers/:minutes`.
- **Bug critico**: el `useEffect` de linea 19 navega a `/login` cuando ya esta autenticado — loop de navegacion.

### HorarioView (/horario)

- Carga 5 colecciones en paralelo (salas, timers, categorias, empresas, TES) con promesa de nivel modulo.
- Construye una tabla por sala con los timers ordenados por hora.
- Muestra empresa asignada o "Descanso" si la categoria contiene esa palabra.
- Componente `HorarioActualEmpresaPopUp`: abre un dialog nativo con los turnos actuales de cada empresa bajo demanda (lazy fetch).

### SalasView, EmpresasView, CategoriasView (/salas, /empresas, /categorias)

- Patron identico: Suspense + promise en estado de componente padre.
- CRUD completo con confirmacion via SweetAlert2.
- Actualizaciones optimistas con `useOptimistic` para eliminaciones.
- Formularios con `useActionState` para manejo de estado de envio.
- El boton "Eliminar" en el dialog de TemporizadoresView se puede pulsar con `editando === null` si el dialog se abre de alguna forma sin seleccion — aunque el flujo normal lo previene.

### TemporizadoresView (/temporizadores)

- Lista timers con la posibilidad de editarlos en un `<dialog>` nativo.
- La edicion valida que la fecha sea futura (`esFechaFutura`).
- Solo visible en el menu si `isAuthenticated`.

### EmpresasEventoView (/empresastimersnew)

- Permite asignar empresa + sala + timer + evento.
- Los eventos disponibles se derivan de `getTimersEventos()` (deduplicando por `idEvento`).
- `postTES` envia `uniqueId: 0`.

---

## 4. Tiempo real (WebSocket)

```
Servidor emite timerID(id)  →  TimerContext.setCurrentTimerId(id) + setIsRunning(true)
Servidor emite envio(secs)  →  TimerContext.setSecondsRemaining(secs)
                                  si secs <= 0: setIsRunning(false)

Cliente emite vamos         ←  LoginView (admin pulsa "Iniciar Evento")
Cliente emite syncData      ←  service.ts tras cualquier mutacion de categoria/timer/TES
```

El socket se instancia en `socketClient.ts` como singleton. Solo se desconecta al hacer logout.

---

## 5. Gestion de estado

| Estado | Ubicacion | Fuente de verdad |
|--------|-----------|-----------------|
| Autenticacion | `AuthContext` + `localStorage` | Token JWT en localStorage |
| Timer activo / segundos | `TimerContext` | Servidor via WebSocket |
| Sala seleccionada | `TimerContext` + URL param `?sala` | Usuario / URL |
| Datos de listas (salas, empresas, etc.) | Estado local de cada vista | API REST |
| Optimismo UI en borrados | `useOptimistic` en cada Content component | Reduccion local temporal |
