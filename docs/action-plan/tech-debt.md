# Inventario de deudas tecnicas

> Actualizar este archivo cada vez que se descubra una nueva deuda.
> Formato: Prioridad (Critica / Alta / Media / Baja), descripcion, origen, impacto, accion recomendada.

---

## Deuda 1 — Bug de timezone en el sync server (Critica)

**Archivo afectado:** `syncServerTimers-master/index.js` — funcion `continuarTimers()` / `inicioTimer()`

**Descripcion:** El sync server usa dos mecanismos distintos para calcular el tiempo de inicio de los timers:

- Evento `vamos`: usa **Luxon** con zona `Europe/Madrid` para calcular el diff entre ahora y el primer timer. Correcto.
- `continuarTimers()` → `inicioTimer()`: usa `addUnaHora(new Date())` — suma 60 minutos al reloj UTC del servidor sin zona horaria explicita. Incorrecto.

Esto significa que el primer timer del dia se ajusta correctamente al tiempo real de Madrid, pero todos los timers posteriores se calculan con UTC + 60 min. En horario de verano (UTC+2 en Madrid), este calculo da bien de casualidad. En horario de invierno (UTC+1) hay un desfase de 1 hora en todos los timers a partir del segundo.

**Impacto en el cliente:** El frontend no puede corregir este bug directamente porque el countdown viene del servidor. El cliente debe ser consciente de que los tiempos mostrados en la vista Horario (calculados con Luxon) pueden diferir del countdown en tiempo real durante el horario de invierno.

**Alcance:** Solo el sync server (Node.js). El backend .NET y el cliente React no estan afectados.

**Accion recomendada (backend):** Reemplazar en `continuarTimers()` / `inicioTimer()`:

```javascript
// Actual (incorrecto)
const horaInicio = addUnaHora(new Date())

// Correcto
const { DateTime } = require('luxon')
const horaInicio = DateTime.now().setZone('Europe/Madrid')
```

**Responsable:** Equipo de backend / quien mantenga el sync server.

**Fecha de deteccion:** 2026-05-25

---

## Deuda 2 — Contrasenas en texto plano en la base de datos (Critica)

**Tabla afectada:** `USUARIOSTIMERS` — columna `PASS nvarchar(50)`

**Descripcion:** Las contrasenas de los administradores del sistema se almacenan en texto plano en SQL Server. No hay hash, no hay salt. Cualquier persona con acceso a la base de datos o a un backup puede leer las contrasenas directamente.

**Impacto:** Si la base de datos es comprometida (SQL injection, backup filtrado, acceso no autorizado), las credenciales de los administradores quedan expuestas en claro.

**Accion recomendada:**

1. Migrar a bcrypt o Argon2 en la API .NET para el almacenamiento de contrasenas.
2. Forzar un restablecimiento de contrasenas para todos los administradores tras la migracion.
3. El cambio requiere modificar el endpoint `POST Auth/Login` en la API .NET — fuera del alcance del frontend.

**Mitigacion temporal:** Asegurarse de que el acceso a la base de datos SQL Server esta restringido por firewall de Azure solo a las IPs de los servicios de la aplicacion.

**Responsable:** Equipo de backend (.NET).

**Fecha de deteccion:** 2026-05-25

---

## Deuda 3 — JWT en localStorage (Alta)

**Archivo afectado:** `src/services/authService.ts` (nuevo) y `src/services/httpClient.ts` (nuevo)

**Descripcion:** El token JWT se almacena en `localStorage`. Esta practica expone el token a ataques XSS: si un atacante logra inyectar JavaScript en la pagina, puede leer el token y suplantarse como el usuario autenticado.

**Por que se mantiene en esta migracion:** La alternativa segura (httpOnly cookie) requiere que la API .NET:
1. Establezca la cookie en la respuesta del login.
2. Lea la cookie en cada peticion autenticada.
3. Este configurada para CORS con `credentials: true`.

Estos cambios estan fuera del alcance del frontend y requieren modificar la API .NET.

**Mitigacion implementada en el cliente:**
- El interceptor de respuesta de `httpClient.ts` limpia el token del `localStorage` y redirige a `/login` ante cualquier respuesta 401.
- Las rutas de administracion estan protegidas por `ProtectedRoute`.

**Mitigacion recomendada adicional:**
- Anadir una Content Security Policy (CSP) estricta en `index.html` para reducir la superficie de ataque XSS.
- Configurar un tiempo de expiracion corto para el JWT en la API .NET (< 8 horas).

**Responsable:** Equipo de backend (.NET) para la migracion completa a httpOnly cookie.

**Fecha de deteccion:** 2026-05-25

---

## Deuda 4 — Ruta EmpresasEventoTimers (legacy eliminada) (Baja)

**Archivo afectado:** `AppTimersFinal-master/src/components/EmpresasEventoTimers.js`

**Descripcion:** El legacy tenia dos versiones del componente de asignacion empresa-sala-timer:
- `EmpresasEventoTimers.js` — version original (ruta `/empresaseventotimers`).
- `EmpresasEventoTimersNew.js` — version activa (ruta `/empresastimersnew`).

En la migracion, **solo se crea la version nueva** (`/empresastimersnew` → `EmpresasEventoView.tsx`). La ruta antigua no existe en el nuevo router.

**Impacto:** Cualquier enlace externo o bookmark a la ruta antigua (`/empresaseventotimers`) redirigira a `/` (catch-all del router). No hay funcionalidad perdida porque la version antigua ya no era la activa.

**Accion recomendada:** Ninguna. Documentado como decision en `decisiones.md` (ADR-004).

**Fecha de deteccion:** 2026-05-25

---

## Deuda 5 — Evento panic sin funcion definida en el servidor (Alta)

**Archivo afectado:** `syncServerTimers-master/index.js`

**Descripcion:** El sync server tiene el listener:

```javascript
socket.on("panic", () => { panic(); })
```

Pero la funcion `panic()` **no esta definida** en ningun lugar del archivo. Si el evento `panic` llega al servidor (por ejemplo, desde una consola de desarrollador), el servidor lanzaria un `ReferenceError: panic is not defined` en runtime.

**Estado actual:** El boton que emitia `panic` esta comentado en `Login.js`. El nuevo cliente NO implementa ningun boton que emita `panic`. El riesgo es bajo pero el bug existe en el servidor.

**Accion recomendada:** En el sync server, o bien definir la funcion `panic()` correctamente, o bien eliminar el listener `socket.on("panic", ...)`.

**Responsable:** Equipo de backend / mantenedor del sync server.

**Fecha de deteccion:** 2026-05-25

---

## Deuda 6 — Sin estado de cache para datos del servidor (Media)

**Descripcion:** En la v1 de la migracion se usa `use(Promise)` + Suspense para cargar datos, pero las promesas se crean fuera de los componentes (por lo tanto en el modulo, no en un cache). Esto significa que:
- Al navegar entre rutas, los datos no se recargan (la promesa ya fue resuelta).
- Al volver a una vista tras una mutacion, la lista puede estar desactualizada hasta que el usuario recarga la pagina.

**Impacto:** Experiencia de usuario degradada en escenarios donde se crean/borran entidades y se vuelve a la lista.

**Mitigacion en v1:** Recargar la promesa tras cada mutacion cambiando la `key` del componente Suspense (patron de invalidacion manual).

**Accion recomendada para v2:** Integrar `@tanstack/react-query` para gestion de cache, invalidacion automatica tras mutaciones y reintento de peticiones fallidas. El ADR correspondiente esta en `decisiones.md` (ADR-003).

**Responsable:** Equipo de frontend.

**Fecha de deteccion:** 2026-05-25

---

## Deuda 7 — Migracion a Tailwind CSS 4 (Baja)

**Descripcion:** La decision de usar Bootstrap 5.3 en lugar de Tailwind CSS 4 fue tomada para minimizar el esfuerzo de la migracion (ADR-001). Bootstrap anade ~20KB CSS gzip al bundle y requiere clases de Bootstrap en el JSX, que son menos mantenibles que las utilidades de Tailwind.

**Impacto:** Bundle mas grande y menor flexibilidad para el tema de la vista `TimerView` (pantalla de proyector requiere modo oscuro personalizado, que con Bootstrap es mas trabajoso).

**Accion recomendada:** En una segunda iteracion del proyecto, migrar los estilos a Tailwind CSS 4, empezando por la `TimerView` que es la mas critica visualmente.

**Responsable:** Equipo de frontend.

**Fecha de deteccion:** 2026-05-25
