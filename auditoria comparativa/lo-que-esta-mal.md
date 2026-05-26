# Lo que está mal — Bugs y regresiones detectadas

Fecha comparación: 2026-05-26  
Referencia: `auditoria/` (original) vs `auditoria 2/` (actual)

---

## CRITICOS — Rompen el flujo principal ahora mismo

### C-01 — Bucle de navegación post-login [BLOQUEANTE]
- **Archivo**: `src/views/LoginView.tsx:19`
- **Código con bug**:
  ```typescript
  useEffect(() => {
    if (isAuthenticated) navigate('/login')  // ← INCORRECTO
  }, [isAuthenticated, navigate])
  ```
- **Efecto**: el admin introduce credenciales correctas → `isAuthenticated` pasa a `true` → el efecto navega de vuelta a `/login` → el usuario se queda atrapado en la misma página sin ningún feedback de éxito.
- **Fix**: cambiar `navigate('/login')` por `navigate('/')` (o la ruta del panel de administración).
- **Por qué ocurrió**: la original no usaba `navigate()` — simplemente cambiaba el render condicionalmente. La refactorización introdujo este bug.

---

### C-02 — Token guardado como `[object Object]` si el backend no cambió su respuesta [BLOQUEANTE]
- **Archivos**: `src/services/service.ts:82`, `src/services/authService.ts:9`
- **Situación**:
  - **Original**: el backend devolvía `{ response: "<JWT>" }`. El componente accedía a `result.response`.
  - **Actual**: `service.ts:82` hace `return data` asumiendo que el endpoint devuelve la cadena JWT directamente.
- **Efecto**: si el backend **no fue actualizado**, `localStorage` almacena el string `"[object Object]"`. La app parece autenticada (`token !== null`), pero todas las peticiones envían `Authorization: Bearer [object Object]` — el backend las rechaza con 401.
- **Fix**: verificar con Postman/DevTools qué devuelve `POST Auth/Login`. Si devuelve `{ response: string }`:
  ```typescript
  // service.ts:82
  const { data } = await httpClient.post<{ response: string }>('Auth/Login', credentials)
  return data.response
  ```
- **Por qué ocurrió**: el cambio de M-01 asumió que el backend ya devolvía string plano sin verificarlo.

---

### C-03 — DELETE de TiempoEmpresaSala puede enviar ID `undefined` [BLOQUEANTE]
- **Archivos**: `src/types/index.ts:26`, `src/services/service.ts` (función `getTES`), `src/views/EmpresasEventoView.tsx:71`
- **Situación**:
  - **Original**: la PK del TES se llamaba `id`.
  - **Actual**: la interfaz usa `uniqueId`. Pero `getTES` hace `httpClient.get<TiempoEmpresaSala[]>` **sin pasar por una función de mapeo** que haga el fallback `uniqueId ?? id`.
  - Sala y Empresa tienen `mapSala`/`mapEmpresa` con fallback. TES no tiene `mapTES`.
- **Efecto**: si el backend devuelve `id` en lugar de `uniqueId`, cada registro tendrá `uniqueId: undefined`. Cuando el usuario borra una asignación, se envía `DELETE api/TiempoEmpresaSala/undefined` — el servidor devuelve 404 o elimina el registro incorrecto.
- **Fix**: añadir función de mapeo en `service.ts`:
  ```typescript
  function mapTES(data: any): TiempoEmpresaSala {
    return { ...data, uniqueId: data.uniqueId ?? data.id ?? 0 }
  }
  // y en getTES:
  return (await httpClient.get<any[]>('TiempoEmpresaSala')).data.map(mapTES)
  ```

---

### C-04 — Datos de TimerView y HorarioView nunca se refrescan [BLOQUEANTE para usuarios finales]
- **Archivos**: `src/views/TimerView.tsx:9-10`, `src/views/HorarioView.tsx:13` (mismo patrón)
- **Código con bug**:
  ```typescript
  // Se ejecutan UNA SOLA VEZ al importar el módulo
  const salasPromise = getSalas()
  const eventosPromise = getTimersEventos()
  ```
- **Efecto**: si el usuario navega a otra vista, crea o modifica datos (nueva sala, nuevo temporizador), y vuelve a `/` o `/horario` — los datos son los de la carga inicial. Los cambios nunca aparecen sin recargar la página completa.
- **Fix**: mover la carga de datos a `useState` + función de refresco, igual que hacen `SalasView`, `EmpresasView`, etc.
- **Por qué ocurrió**: la original recargaba en `componentDidMount` y en listeners de socket. La refactorización usó un patrón de promesas de módulo que no se puede refrescar.

---

## ALTOS — Degradación seria del flujo

### A-01 — ProtectedRoute existe pero no protege ninguna ruta
- **Archivos**: `src/components/ProtectedRoute.tsx` (existe), `src/router/index.tsx` (no lo usa)
- **Efecto**: cualquier usuario puede acceder a `/temporizadores`, `/salas`, `/empresas`, `/categorias`, `/empresastimersnew` por URL directa sin autenticarse. Los controles de escritura se ocultan con `canEdit = isAuthenticated`, pero la ruta y sus peticiones GET son completamente públicas.
- **Fix**: envolver las rutas admin con `<ProtectedRoute>` en `router/index.tsx`.
- **Por qué ocurrió**: el componente fue creado pero nunca conectado. Peor que la original porque da falsa sensación de seguridad.

---

### A-02 — El interceptor de 401 destruye el estado de React
- **Archivo**: `src/services/httpClient.ts:23-24`
- **Código con bug**:
  ```typescript
  localStorage.removeItem(TOKEN_KEY)
  window.location.href = '/login'  // ← provoca recarga completa
  ```
- **Efecto**: cuando un token expira, `window.location.href` provoca una recarga completa del navegador. Esto destruye el estado de React (contextos, formularios en vuelo), y el socket queda desconectado sin llamar a `disconnectSocket()`.
- **Fix**: propagar el error al `AuthContext` para que llame a `logout()` y navegue con `useNavigate()` del router de React.

---

### A-03 — Select "Evento" vacío en instalación limpia o tras borrar todas las asignaciones
- **Archivo**: `src/views/EmpresasEventoView.tsx:37`
- **Causa**: los eventos disponibles se derivan de `timerEventos` (asignaciones existentes). Si no hay ninguna asignación, `idEventos` es `[]` y el `<select>` no tiene opciones.
- **Efecto**: el usuario no puede crear ninguna asignación nueva. La app queda bloqueada para este flujo.
- **Fix opción A** (simple): `idEvento: 1` hardcodeado como hacía la original.
- **Fix opción B** (correcto): añadir `getEventos()` en `service.ts` que llame a `api/eventos` para cargar eventos independientemente de las asignaciones.

---

### A-04 — Sort de timers inestable con timers simultáneos
- **Archivo**: `src/views/TemporizadoresView.tsx:42-44`
- **Código con bug**:
  ```typescript
  parseTimerInicio(a.inicio) < parseTimerInicio(b.inicio) ? -1 : 1
  // No maneja el caso de igualdad → siempre devuelve 1
  ```
- **Efecto**: dos timers con el mismo `inicio` producen orden no determinista. Puede cambiar entre navegadores o versiones de V8.
- **Fix**:
  ```typescript
  parseTimerInicio(a.inicio).toMillis() - parseTimerInicio(b.inicio).toMillis()
  ```

---

### A-05 — `useOptimistic` llamado fuera de `startTransition` en 5 vistas
- **Archivos**: `SalasView.tsx:68`, `EmpresasView.tsx:58`, `CategoriasView.tsx:65`, `TemporizadoresView.tsx:81`, `EmpresasEventoView.tsx:71`
- **Efecto**: en React 19, las actualizaciones de `useOptimistic` deben ocurrir dentro de una transición. Sin `startTransition`, la fila eliminada puede no desaparecer visualmente de forma inmediata o generar warnings en consola.
- **Fix**:
  ```typescript
  startTransition(() => removeOptimistic(id))
  await deleteXxx(id)
  onRefresh()
  ```

---

### A-06 — Capitalización diferente en endpoint `IncreaseTimers`
- **Archivo**: `src/services/service.ts:186`
- **Original**: `api/timers/increasetimers/:minutes`
- **Actual**: `api/Timers/IncreaseTimers/:minutes`
- **Efecto**: en servidores case-sensitive (Linux + Kestrel configurado estrictamente), el endpoint fallará. Los botones `+1 min`, `+5 min`, `-1 min` no funcionarán.
- **Fix**: verificar con el backend y homogeneizar capitalización.

---

## MEDIOS — Comportamiento incorrecto menor

### M-01 — Sin ErrorBoundary en vistas con Suspense
- Todas las vistas usan `<Suspense>` pero no tienen `<ErrorBoundary>`. Un error de API produce pantalla en blanco sin mensaje de error.

### M-02 — Efecto de tema sobreescribe preferencias en cada navegación
- **Archivo**: `src/components/Menu.tsx:7-14`
- El `useEffect` limpia el tema del `dataset` y elimina `'theme'` de `localStorage` en cada montaje de `Menu`. Si se añade un selector de tema en el futuro, las preferencias se perderán en cada navegación.

### M-03 — Sin indicador visible de reconexión de socket
- `socketClient.ts` no emite eventos de UI cuando el socket se desconecta inesperadamente. El usuario no sabe si el timer en pantalla está actualizado o congelado.

### M-04 — Excepción de configuración sin manejo visible
- **Archivo**: `src/config/env.ts:6-7`
- Si `VITE_API_URL` falta en un despliegue, la validación lanza un error síncrono en tiempo de importación. Sin `ErrorBoundary` en el árbol raíz, el resultado es pantalla en blanco.

---

## BAJOS — Deuda técnica

| # | Problema | Archivo:línea |
|---|----------|--------------|
| B-01 | `AuthToken`, `Evento`, `SocketClientEvents.panic` declarados sin ningún uso | `types/index.ts:57, 61, 76` |
| B-02 | `getSala`, `getEmpresasTimers`, `findTimersEventosEmpresa`, `findTimersEventosSala` sin consumidores en UI | `service.ts:93, 212, 224, 231` |
| B-03 | Borrado en cascada (TES antes del padre) no implementado | Ninguna vista |

---

## Resumen de notas de migración ignoradas

| ID | Descripción | Estado |
|----|-------------|--------|
| M-04 | Cambiar endpoints de creación a body JSON (no en URL) | Solo se añadió `encodeURIComponent`. Estructura URL sin cambiar. |
| M-05 | Portar lógica de solapamiento de rangos de timers | `timezone.ts` existe pero la validación de solapamiento no está portada. |
| M-07 | Borrado en cascada con `Promise.all` | No implementado en ninguna vista. |
| M-12 | `idEvento` dinámico | Se hizo dinámico pero el select puede quedar vacío — peor que el hardcode original. |

---

## Orden de fixes recomendado

| Sprint | Qué resolver | Tiempo estimado |
|--------|-------------|-----------------|
| Sprint 1 | C-01 (navigate), C-02 (token formato), C-03 (mapTES) | 2-3 horas |
| Sprint 2 | C-04 (promesas módulo), A-01 (ProtectedRoute en router) | 1 día |
| Sprint 3 | A-02 (401 sin reload), A-03 (select Evento), A-04 (sort), A-05 (startTransition), A-06 (capitalización) | 1-2 días |
| Sprint 4 | ErrorBoundary, tema en Menu, deuda técnica | 1-2 días |
