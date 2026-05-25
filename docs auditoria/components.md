# Componentes React

Todos en [AppTimersFinal-master/src/components/](../AppTimersFinal-master/src/components/).

La capa de acceso a datos está centralizada en [`service.js`](../AppTimersFinal-master/src/services/service.js) — ningún componente llama a `axios` directamente.

---

## TimerView — Vista pública del countdown

**Ruta:** `/`  
**Archivo:** `TimerView.js`

Vista principal que ven los asistentes al foro en pantalla grande.

**Responsabilidades:**
- Conecta al Socket.IO y escucha `timerID` + `envio` para actualizar el countdown en tiempo real.
- Permite seleccionar la sala activa (filtra qué empresa se muestra).
- Muestra empresa actual (logo + nombre), tiempo restante y próximos timers.

**Eventos Socket.IO escuchados:** `timerID`, `envio`

---

## Login — Administración

**Ruta:** `/login`  
**Archivo:** `Login.js`

Panel de control del operador.

**Responsabilidades:**
- Formulario de autenticación → llama a `service.generateToken()` → guarda el JWT en `localStorage`.
- Botón **"Iniciar Evento"** → emite `vamos` al sync server para arrancar los timers.
- Botón de incremento → llama a `service.updateIncreaseTimers(n)` para desplazar todos los timers.

> **Nota:** El botón "Resetear Temporizadores" (`resetEmergency()`) está **comentado en el render** — no aparece en la UI actual. Internamente emitía `start`; `socket.emit("panic")` también estaba comentado. Ningún botón activo emite `panic`.

**Métodos de service usados:** `generateToken`, `updateIncreaseTimers`  
**Eventos Socket.IO emitidos:** `vamos`

---

## Menu — Navegación

**Archivo:** `Menu.js` / `MenuPopUp.js`

Barra de navegación superior con enlaces a todas las rutas de administración.  
Muestra/oculta opciones según si hay token en `localStorage`.

---

## Categorias — CRUD de categorías

**Ruta:** `/categorias`  
**Archivo:** `Categorias.js`

**Responsabilidades:**
- Lista todas las categorías (nombre + duración).
- Formulario para crear/editar categoría con campo de duración en formato `HH:MM`.
- Validación: no permite duplicados por nombre.
- Elimina categorías con confirmación SweetAlert2.

**Métodos de service usados:** `getCategorias`, `getCategoria`, `postCategoria`, `putCategoria`, `deleteCategoria`

---

## Empresas — CRUD de empresas

**Ruta:** `/empresas`  
**Archivo:** `Empresas.js`

**Responsabilidades:**
- Lista empresas con logo.
- Crear/editar/eliminar empresas.

**Métodos de service usados:** `getEmpresas`, `getEmpresa`, `postEmpresa`, `putEmpresa`, `deleteEmpresa`

---

## Salas — CRUD de salas

**Ruta:** `/salas`  
**Archivo:** `Salas.js` / `SalaPopUp.js`

**Responsabilidades:**
- Lista salas disponibles.
- Crear/renombrar/eliminar salas.

**Métodos de service usados:** `getSalas`, `getSala`, `postSala`, `putSala`, `deleteSala`

---

## Temporizadores — CRUD de timers

**Ruta:** `/temporizadores`  
**Archivo:** `Temporizadores.js`

**Responsabilidades:**
- Lista todos los timers ordenados por fecha de inicio.
- Formulario para crear un timer: fecha/hora de inicio + categoría.
- Editar/eliminar timers.
- Al crear/editar/borrar emite `syncData` vía `service.js`.

**Métodos de service usados:** `getTemporizadores`, `getCategorias`, `postTemporizador`, `putTemporizador`, `deleteTemporizador`

---

## Horario — Vista de calendario

**Ruta:** `/horario`  
**Archivo:** `Horario.js` / `HorarioActualEmpresaPopUp.js`

**Responsabilidades:**
- Muestra el horario de timers por sala en formato de agenda.
- `HorarioActualEmpresaPopUp`: popup que muestra los 2 próximos turnos de una empresa.

**Métodos de service usados:** `getTimersEventos`, `findTimersEventosSala`, `findTimersActualesEmpresa`

---

## EmpresasEventoTimers / EmpresasEventoTimersNew

**Rutas:** — / `/empresastimersnew`  
**Archivos:** `EmpresasEventoTimers.js`, `EmpresasEventoTimersNew.js`

Gestión de la relación empresa-sala-evento-timer.

**Responsabilidades:**
- Asignar qué empresa ocupa qué sala en cada slot de tiempo.
- `New` es la versión activa; la otra es legacy.

**Métodos de service usados:** `getEmpresas`, `getSalas`, `getTemporizadores`, `getEmpresasTimers`, `getTimersEventos`, `getTES`, `postTES`, `deleteTES`, `findTimersEventosEmpresa`

---

## Tiempo

**Archivo:** `Tiempo.js`

Componente auxiliar de display de tiempo. Formatea segundos a `MM:SS` para el countdown visible.

---

## Resumen de dependencias de service por componente

| Componente | Métodos REST | Eventos Socket |
|---|---|---|
| TimerView | — | escucha: `timerID`, `envio` |
| Login | `generateToken`, `updateIncreaseTimers` | emite: `vamos` |
| Categorias | `getCategorias`, `getCategoria`, `postCategoria`, `putCategoria`, `deleteCategoria` | (via service: `syncData`) |
| Empresas | `getEmpresas`, `getEmpresa`, `postEmpresa`, `putEmpresa`, `deleteEmpresa` | — |
| Salas | `getSalas`, `getSala`, `postSala`, `putSala`, `deleteSala` | — |
| Temporizadores | `getTemporizadores`, `getCategorias`, `postTemporizador`, `putTemporizador`, `deleteTemporizador` | (via service: `syncData`) |
| Horario | `getTimersEventos`, `findTimersEventosSala`, `findTimersActualesEmpresa` | — |
| EmpresasEventoTimersNew | `getEmpresas`, `getSalas`, `getTemporizadores`, `getEmpresasTimers`, `getTimersEventos`, `getTES`, `postTES`, `deleteTES`, `findTimersEventosEmpresa` | — |
