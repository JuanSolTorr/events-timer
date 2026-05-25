# Plan de Migración — events-timer a React 19 moderno

> **Proyecto:** Sistema de temporizadores para el Foro de Empleo de Tajamar  
> **Repositorio actual:** `events-timer` (scaffold Vite + React 19, contenido vacío)  
> **Referencia legacy:** `AppTimersFinal-master/` documentada en `DOCUMENTACION-COMPLETA.md`  
> **Fecha de planificación:** 2026-05-25  
> **Estado del scaffold:** React 19.2.6 instalado, `src/` vacío (solo `.gitkeep` en subcarpetas)

---

## Resumen ejecutivo

El repositorio `events-timer` es un **scaffold limpio de Vite + React 19** que debe recibir la reescritura completa de la aplicación legacy `AppTimersFinal-master`. No se trata de una actualización incremental de dependencias: es una migración-reescritura que aprovecha el lienzo en blanco para corregir todas las deudas técnicas documentadas y adoptar el modelo de React 19 de forma nativa desde el día 1.

El plan se estructura en **6 fases** con criterios de entrada/salida medibles. Las fases 1–3 son bloqueantes entre sí; las fases 4 y 5 se pueden paralelizar parcialmente.

---

## Inventario del estado actual

| Dimensión | Legacy (`AppTimersFinal-master`) | Scaffold actual (`events-timer`) |
|---|---|---|
| Versión React | 18.2 | 19.2.6 (instalado) |
| Bundler | Create React App (CRA) asumido | Vite 8 |
| Tipado | Sin TypeScript | Sin TypeScript (a añadir) |
| Enrutamiento | React Router 6.4 | No instalado |
| HTTP | Axios 1.2 | No instalado |
| Tiempo real | Socket.IO Client 4.5 | No instalado |
| UI | Bootstrap 5.2 | No instalado |
| Fechas | Luxon 3.7 | No instalado |
| Alertas | SweetAlert2 11 | No instalado |
| Tests | Sin evidencia | Sin tests |
| Lint | Sin evidencia de config | ESLint 10 configurado |
| Estado global | `localStorage` + props drilling | No existe |
| Auth | JWT en `localStorage` | No existe |

---

## Fase 0 — Preparación y auditoría

**Duración estimada:** 0.5 jornada  
**Paralizable con:** nada (bloquea todo lo demás)

### Tareas

- [ ] Leer y anotar `DOCUMENTACION-COMPLETA.md` en su totalidad (ya realizado en esta planificación)
- [ ] Revisar código fuente de `AppTimersFinal-master/src/` completo (componentes, `service.js`, `Router.js`, `Global.js`)
- [ ] Revisar `syncServerTimers-master/index.js` completo
- [ ] Documentar todas las deudas técnicas en `docs/tech-debt.md`
- [ ] Confirmar URLs de producción y entornos (`.env` de destino)
- [ ] Verificar acceso a la API REST .NET en testing y producción
- [ ] Confirmar stack objetivo con el equipo (ver `docs/architecture-target.md`)

### Criterio de entrada

- Acceso de lectura al código legacy completo.

### Criterio de salida

- [ ] `docs/tech-debt.md` completo y priorizado
- [ ] Decisiones de stack documentadas en `docs/architecture-target.md`
- [ ] URLs de entorno confirmadas y listadas

---

## Fase 1 — Infraestructura base del proyecto

**Duración estimada:** 1 jornada  
**Paralizable con:** nada (bloquea fases 2–6)

### Objetivo

Transformar el scaffold vacío en un proyecto con toda la infraestructura técnica que las fases posteriores necesitan: TypeScript, enrutamiento, cliente HTTP, Socket.IO, estilos y variables de entorno.

### Tareas

#### 1.1 TypeScript
- [ ] Instalar `typescript`, `@types/node`
- [ ] Generar `tsconfig.json` con `strict: true`, `target: ES2022`, `lib: ["ES2022", "DOM"]`
- [ ] Renombrar `main.jsx` → `main.tsx`, `App.jsx` → `App.tsx`
- [ ] Actualizar `vite.config.js` para soporte TypeScript
- [ ] Actualizar `eslint.config.js` con `@typescript-eslint/eslint-plugin` y reglas estrictas
- [ ] Renombrar `eslint.config.js` → `eslint.config.ts`

#### 1.2 Variables de entorno
- [ ] Crear `.env.development` con `VITE_API_URL`, `VITE_SOCKET_URL`
- [ ] Crear `.env.production` con las URLs de Azure
- [ ] Crear `src/config/env.ts` que valide y exporte las variables con tipos

```typescript
// src/config/env.ts
export const config = {
  apiUrl: import.meta.env.VITE_API_URL as string,
  socketUrl: import.meta.env.VITE_SOCKET_URL as string,
} as const
```

#### 1.3 Dependencias de producción
- [ ] `npm install react-router-dom@7` (React Router 7, compatible con React 19)
- [ ] `npm install axios@1`
- [ ] `npm install socket.io-client@4`
- [ ] `npm install luxon@3` + `@types/luxon`
- [ ] `npm install sweetalert2@11`
- [ ] Decidir librería CSS: **Tailwind CSS 4** (recomendado sobre Bootstrap 5 — ver `architecture-target.md`) O mantener `bootstrap@5.3` + `@types/bootstrap`

#### 1.4 Enrutamiento base
- [ ] Crear `src/router/index.tsx` con `createBrowserRouter` (React Router v7 Data API)
- [ ] Definir las 8 rutas documentadas: `/`, `/login`, `/horario`, `/salas`, `/empresas`, `/categorias`, `/temporizadores`, `/empresastimersnew`
- [ ] Proteger rutas de administración con un `ProtectedRoute` que comprueba el token

#### 1.5 Estructura de carpetas
- [ ] Crear estructura definitiva (ver `architecture-target.md`):
  ```
  src/
  ├── components/      # Componentes reutilizables (Tiempo, Menu, etc.)
  ├── views/           # Páginas/vistas (una por ruta)
  ├── context/         # React Contexts + proveedores
  ├── services/        # service.ts (HTTP + Socket.IO)
  ├── hooks/           # Custom hooks (useSocket, useAuth, useTimers)
  ├── types/           # Interfaces y tipos TypeScript
  ├── config/          # Configuración de entorno
  └── utils/           # Funciones puras (formateo de tiempo, etc.)
  ```
- [ ] Eliminar los `.gitkeep` tras crear los primeros archivos en cada carpeta

#### 1.6 HTML base
- [ ] Actualizar `index.html`: `lang="es"`, título `"Timers Tajamar"`, favicon correcto

### Criterio de entrada

- Fase 0 completada (deuda documentada, stack decidido)

### Criterio de salida

- [ ] `npm run build` sin errores
- [ ] `npm run lint` sin errores
- [ ] Todas las dependencias instaladas y el scaffold arranca en dev (`npm run dev`)
- [ ] Enrutamiento vacío funciona (rutas 404 redirigen a `/`)
- [ ] Variables de entorno cargadas correctamente en dev

---

## Fase 2 — Capa de servicios y tipos

**Duración estimada:** 1 jornada  
**Paralizable con:** nada (bloquea fase 3)

### Objetivo

Construir la única capa de acceso a datos del frontend: `service.ts`, los tipos TypeScript de todos los modelos, y el cliente Socket.IO centralizado. Los componentes **nunca** llaman directamente a Axios ni al socket.

### Tareas

#### 2.1 Tipos de dominio (`src/types/`)
- [ ] Crear `src/types/index.ts` con interfaces para todos los modelos documentados:

```typescript
export interface Timer {
  idTemporizador: number
  inicio: string        // ISO 8601
  idCategoria: number
  pausa: boolean
}

export interface Categoria {
  idCategoria: number
  categoria: string
  duracion: number      // minutos
}

export interface Empresa {
  idEmpresa: number
  empresa: string
  imagen: string
}

export interface Sala {
  idSala: number
  sala: string
}

export interface TiempoEmpresaSala {
  uniqueId: number
  idTimer: number
  idEmpresa: number
  idSala: number
  idEvento: number
}

export interface TimerEvento {
  uniqueId: number
  idEmpresa: number
  idTimer: number
  idSala: number
  idEvento: number
  idCategoria: number
  inicio: string
  pausa: boolean
  categoria: string
  duracion: number
  sala: string
  evento: string
  inicioEvento: string
  finEvento: string
  empresa: string
  imagen: string
}

export interface LoginCredentials {
  userName: string
  password: string
}

export interface AuthToken {
  token: string
}
```

#### 2.2 Cliente HTTP (`src/services/httpClient.ts`)
- [ ] Crear instancia Axios con `baseURL` desde `config/env.ts`
- [ ] Interceptor de request que inyecta `Authorization: Bearer <token>` desde `localStorage` si existe
- [ ] Interceptor de response que captura 401 y redirige a `/login`
- [ ] Tipado genérico de todos los métodos (`get<T>`, `post<T>`, etc.)

#### 2.3 Capa de servicios (`src/services/service.ts`)
- [ ] Migrar todos los métodos de `service.js` legacy con tipado TypeScript estricto:
  - `generateToken(credentials: LoginCredentials): Promise<string>`
  - `getSalas(): Promise<Sala[]>`, `getSala(id: number): Promise<Sala>`, `postSala`, `putSala`, `deleteSala`
  - `getEmpresas(): Promise<Empresa[]>`, etc. (CRUD completo)
  - `getCategorias(): Promise<Categoria[]>`, etc.
  - `getTemporizadores(): Promise<Timer[]>`, etc.
  - `getTES(): Promise<TiempoEmpresaSala[]>`, `postTES`, `deleteTES`
  - `getTimersEventos(): Promise<TimerEvento[]>`
  - `findTimersEventosSala(idSala: number): Promise<TimerEvento[]>`
  - `findTimersActualesEmpresa(idEmpresa: number): Promise<TimerEvento[]>`
  - `findTimersEventosEmpresa(idEmpresa: number): Promise<TimerEvento[]>`
  - `getEmpresasTimers(): Promise<Empresa[]>`
  - `updateIncreaseTimers(minutes: number): Promise<void>`
- [ ] **Corregir bug de timezone:** el método `updateIncreaseTimers` debe usar Luxon con zona `Europe/Madrid` de forma consistente, igual que el evento `vamos` del sync server

#### 2.4 Cliente Socket.IO (`src/services/socketClient.ts`)
- [ ] Crear singleton de `socket.io-client` con `config.socketUrl`
- [ ] Exportar función `getSocket()` que retorna la instancia única
- [ ] Tipar los eventos del servidor: `timerID` (number), `envio` (number)
- [ ] Tipar los eventos del cliente: `vamos`, `syncData`, `panic`

#### 2.5 Gestión de autenticación (`src/services/authService.ts`)
- [ ] `login(credentials): Promise<void>` — llama a `generateToken`, guarda token en `localStorage`
- [ ] `logout(): void` — limpia `localStorage`, desconecta socket
- [ ] `getToken(): string | null`
- [ ] `isAuthenticated(): boolean`

### Criterio de entrada

- Fase 1 completada (TypeScript + dependencias instaladas)

### Criterio de salida

- [ ] `npm run build` sin errores TypeScript
- [ ] Todos los tipos de dominio definidos y exportados desde `src/types/index.ts`
- [ ] `service.ts` tiene al menos los mismos métodos que el `service.js` legacy
- [ ] `socketClient.ts` conecta al servidor de prueba sin errores en consola
- [ ] No hay `any` implícitos en la capa de servicios

---

## Fase 3 — Context y estado global

**Duración estimada:** 0.5 jornada  
**Paralizable con:** nada (bloquea fase 4)

### Objetivo

Definir los dos contextos React que eliminan el prop drilling documentado en el legacy: autenticación y estado del timer en tiempo real.

### Tareas

#### 3.1 AuthContext (`src/context/AuthContext.tsx`)
- [ ] Usar el nuevo hook `use()` de React 19 para consumir el contexto (en lugar de `useContext`)
- [ ] Estado: `token: string | null`, `isAuthenticated: boolean`
- [ ] Acciones: `login(credentials)`, `logout()`
- [ ] Proveedor: `AuthProvider` que envuelve la aplicación en `main.tsx`
- [ ] Hook de consumo: `useAuth()` que lanza error si se usa fuera del proveedor

#### 3.2 TimerContext (`src/context/TimerContext.tsx`)
- [ ] Estado compartido del countdown en tiempo real:
  - `currentTimerId: number | null` — ID recibido del evento `timerID`
  - `secondsRemaining: number` — recibido del evento `envio`
  - `isRunning: boolean`
  - `selectedSalaId: number | null` — sala seleccionada por el usuario
- [ ] El proveedor gestiona la suscripción al socket (un único listener en toda la app)
- [ ] Hook de consumo: `useTimerState()`

#### 3.3 Integración en `main.tsx`
- [ ] Envolver `RouterProvider` con `AuthProvider` y `TimerProvider`

```tsx
// main.tsx final
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <TimerProvider>
        <RouterProvider router={router} />
      </TimerProvider>
    </AuthProvider>
  </StrictMode>
)
```

### Criterio de entrada

- Fase 2 completada (servicios y tipos disponibles)

### Criterio de salida

- [ ] `useAuth()` y `useTimerState()` disponibles y consumibles desde cualquier componente
- [ ] El socket NO se instancia más de una vez en toda la app
- [ ] `npm run build` sin errores

---

## Fase 4 — Vistas de administración (CRUD)

**Duración estimada:** 3–4 jornadas  
**Paralizable con:** Fase 5 (en jornadas distintas)

### Objetivo

Implementar las 6 vistas de administración: Login, Categorias, Empresas, Salas, Temporizadores y EmpresasEventoTimersNew.

### Tareas por vista

#### 4.1 Login (`src/views/LoginView.tsx`)
- [ ] Formulario controlado con `useState` para `userName` y `password`
- [ ] Usar `useTransition` de React 19 para gestionar el estado de carga del login (sin `isLoading` manual)
- [ ] Usar `useActionState` de React 19 para el manejo de errores del formulario
- [ ] Al autenticar con éxito: guardar token via `useAuth().login()` y redirigir a `/`
- [ ] Botón "Iniciar Evento" visible solo si `isAuthenticated`: emite `vamos` al socket
- [ ] Botón de incremento de tiempo: llama a `service.updateIncreaseTimers(n)`
- [ ] NO exponer el botón `panic` ni el evento `start` (deprecated)

#### 4.2 Categorias (`src/views/CategoriasView.tsx`)
- [ ] Tabla de categorías con nombre y duración
- [ ] Formulario inline de creación/edición
- [ ] Validación: sin duplicados por nombre (comprobación en cliente antes de POST)
- [ ] Confirmación de borrado con SweetAlert2
- [ ] Usar `useOptimistic` de React 19 para actualización optimista de la lista
- [ ] Emitir `syncData` tras cada mutación (vía `service.ts`)

#### 4.3 Empresas (`src/views/EmpresasView.tsx`)
- [ ] Lista con logo de empresa (`<img>` con `loading="lazy"`)
- [ ] CRUD completo con confirmación de borrado
- [ ] Usar `useOptimistic` para feedback inmediato

#### 4.4 Salas (`src/views/SalasView.tsx`)
- [ ] Lista de salas, crear/renombrar/eliminar
- [ ] Popup de formulario con `<dialog>` nativo (accesible, sin Bootstrap modal)

#### 4.5 Temporizadores (`src/views/TemporizadoresView.tsx`)
- [ ] Lista ordenada por `inicio` (usar Luxon `DateTime.fromISO`)
- [ ] Formulario: `datetime-local` input para inicio + selector de categoría
- [ ] Validación de fecha futura antes de POST
- [ ] Emitir `syncData` tras cada mutación

#### 4.6 EmpresasEventoTimersNew (`src/views/EmpresasEventoTimersNewView.tsx`)
- [ ] Vista de asignación empresa-sala-timer-evento
- [ ] Selectores de empresa, sala, timer, evento
- [ ] Tabla de asignaciones actuales con botón de eliminar
- [ ] **Eliminar `EmpresasEventoTimers.js` legacy** — solo existe la versión `New`

#### 4.7 Menu (`src/components/Menu.tsx`)
- [ ] Barra de navegación con `<NavLink>` de React Router
- [ ] Muestra opciones de administración solo si `useAuth().isAuthenticated`
- [ ] Botón de logout que llama a `useAuth().logout()`

### Criterio de entrada

- Fase 3 completada (contextos disponibles)
- Fase 2 completada (servicios disponibles)

### Criterio de salida

- [ ] Las 6 vistas renderizan sin errores en dev
- [ ] El CRUD de cada entidad funciona contra la API de testing
- [ ] `syncData` se emite en todas las mutaciones que lo requieren
- [ ] No hay `console.error` ni errores de tipo TypeScript
- [ ] `npm run lint` sin advertencias

---

## Fase 5 — Vista pública del countdown (TimerView)

**Duración estimada:** 1.5 jornadas  
**Paralizable con:** Fase 4 (parcialmente)

### Objetivo

Implementar la vista principal que ven los asistentes al foro: countdown en tiempo real vía Socket.IO, selector de sala, empresa actual y próximos turnos.

### Tareas

#### 5.1 TimerView (`src/views/TimerView.tsx`)
- [ ] Consumir `useTimerState()` para obtener `currentTimerId` y `secondsRemaining`
- [ ] Selector de sala: `<select>` que actualiza `selectedSalaId` en el contexto
- [ ] Filtrar `TimerEvento[]` por `selectedSalaId` y `currentTimerId` para obtener empresa actual
- [ ] Mostrar: logo de empresa + nombre + sala actual
- [ ] Mostrar próximos 2 turnos (llamada a `findTimersActualesEmpresa` o filtro local)
- [ ] Pantalla completa optimizada para proyector (tipografía grande, contraste alto)

#### 5.2 Componente Tiempo (`src/components/Tiempo.tsx`)
- [ ] Recibe `secondsRemaining: number`
- [ ] Formatea a `MM:SS` (función pura en `src/utils/formatTime.ts`)
- [ ] Muestra en rojo cuando `secondsRemaining <= 60`
- [ ] Muestra `00:00` cuando `secondsRemaining <= 0`

#### 5.3 Componente HorarioActualEmpresaPopUp (`src/components/HorarioActualEmpresaPopUp.tsx`)
- [ ] Popup (usando `<dialog>`) con los 2 próximos turnos de una empresa
- [ ] Llama a `findTimersActualesEmpresa(idEmpresa)` al abrirse

#### 5.4 Vista Horario (`src/views/HorarioView.tsx`)
- [ ] Agenda de timers por sala
- [ ] Integra `HorarioActualEmpresaPopUp` para el detalle de empresa

### Criterio de entrada

- Fase 3 completada (TimerContext disponible con datos del socket)
- Fase 2 completada (servicios disponibles)

### Criterio de salida

- [ ] El countdown actualiza en tiempo real (recibe `timerID` y `envio` del socket)
- [ ] El selector de sala filtra correctamente la empresa mostrada
- [ ] El componente `Tiempo` pasa de verde a rojo en el último minuto
- [ ] La vista funciona sin autenticación (es pública)

---

## Fase 6 — Calidad, pruebas y preparacion para produccion

**Duración estimada:** 2 jornadas  
**Paralizable con:** nada (fase final, bloquea el despliegue)

### Tareas

#### 6.1 Tests unitarios
- [ ] Instalar `vitest`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`
- [ ] Configurar Vitest en `vite.config.ts`
- [ ] Test unitario de `formatTime.ts` (casos: 0s, 60s, 3599s, valores negativos)
- [ ] Test unitario de `authService.ts` (mock de `localStorage`)
- [ ] Test de componente `Tiempo.tsx` (renderiza MM:SS, cambia color en < 60s)
- [ ] Test de integración del `AuthContext` (login / logout / isAuthenticated)

#### 6.2 Linting y formateo
- [ ] Instalar `prettier` + `eslint-config-prettier`
- [ ] Crear `.prettierrc` con configuración del proyecto
- [ ] `npm run lint` debe pasar sin errores ni advertencias
- [ ] Habilitar reglas TypeScript estrictas (`@typescript-eslint/strict`)

#### 6.3 Build de produccion
- [ ] `npm run build` produce `dist/` sin warnings
- [ ] Verificar que las variables de entorno de producción están correctas en Azure
- [ ] Configurar `vite.config.ts` con `base`, `sourcemap: false` en producción
- [ ] Revisar `Content-Security-Policy` en el HTML generado (mitigar XSS)

#### 6.4 Accesibilidad
- [ ] Instalar `eslint-plugin-jsx-a11y`
- [ ] Verificar que todos los `<img>` tienen `alt`
- [ ] Verificar que los formularios tienen `<label>` asociados
- [ ] Verificar que los modales `<dialog>` gestionan el foco correctamente

#### 6.5 Documentacion final
- [ ] Actualizar `README.md` con instrucciones de desarrollo y despliegue
- [ ] Actualizar `docs/` con cualquier cambio respecto al plan inicial

### Criterio de entrada

- Fases 4 y 5 completadas
- La app funciona end-to-end contra la API de testing

### Criterio de salida

- [ ] Cobertura de tests > 60% en `utils/` y `services/`
- [ ] `npm run lint` y `npm run test` pasan en CI
- [ ] `npm run build` produce bundle sin errores
- [ ] Lighthouse Accessibility > 85
- [ ] No hay errores `console.error` en la consola del navegador en ninguna vista

---

## Estrategia de rollback

Dado que `events-timer` es un repositorio nuevo y el código legacy vive en `AppTimersFinal-master/` (repositorio o carpeta separada), el riesgo de rollback es bajo:

| Escenario | Accion de rollback |
|---|---|
| Una fase produce regresión grave | `git revert` del commit de esa fase o reset al tag del hito anterior |
| La API de producción no es compatible con los nuevos tipos | Ajustar `src/types/index.ts` — no hay impacto en producción hasta el despliegue |
| El bundle de producción no carga en Azure | Mantener el deploy del legacy en paralelo hasta que el nuevo pase los smoke tests |
| Socket.IO 4.x no conecta con el sync server | Verificar que las versiones de cliente y servidor son compatibles; la documentación confirma socket.io 4.5 en el servidor |

**Recomendación:** etiquetar con un tag de git al terminar cada fase (`v0.1-infra`, `v0.2-services`, etc.) para facilitar rollback granular.

---

## Resumen de dependencias entre fases

```
Fase 0 (Auditoría)
    └── Fase 1 (Infraestructura base)
            └── Fase 2 (Servicios y tipos)
                    └── Fase 3 (Context y estado global)
                            ├── Fase 4 (Vistas CRUD)     ─┐
                            └── Fase 5 (TimerView)        ├── Fase 6 (Calidad y prod)
                                                          ─┘
```

Las fases 4 y 5 se pueden trabajar en paralelo si hay dos desarrolladores disponibles, ya que ambas dependen de las fases 2 y 3 pero son independientes entre sí.

---

## Tabla de esfuerzo total estimado

| Fase | Nombre | Esfuerzo estimado |
|---|---|---|
| 0 | Auditoría | 0.5 jornada |
| 1 | Infraestructura base | 1 jornada |
| 2 | Servicios y tipos | 1 jornada |
| 3 | Context y estado global | 0.5 jornada |
| 4 | Vistas CRUD | 3–4 jornadas |
| 5 | Vista countdown | 1.5 jornadas |
| 6 | Calidad y produccion | 2 jornadas |
| **Total** | | **9.5–10.5 jornadas** |

> Esfuerzo calculado para un desarrollador con conocimiento de React y TypeScript. Con dos desarrolladores en paralelo en fases 4+5, el calendario se reduce a ~7 jornadas.
