# Arquitectura Objetivo — events-timer tras la migración

> **Versión objetivo:** React 19.2.x + Vite 8 + TypeScript 5 + React Router 7  
> **Tipo de aplicación:** SPA cliente (no SSR) desplegada en Azure App Service

---

## 1. Vista general del sistema

La arquitectura del sistema completo no cambia. Este documento describe únicamente la arquitectura del frontend (`events-timer`). Las otras piezas (API REST .NET, Sync Server Node.js, SQL Server) se mantienen sin modificar.

```
┌──────────────────────────────────────────────────────────────────┐
│                     CLIENTE (events-timer)                       │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │                     React 19 SPA                         │    │
│  │                                                          │    │
│  │  AuthProvider ──► TimerProvider ──► RouterProvider       │    │
│  │                          │                               │    │
│  │              ┌───────────┴────────────┐                  │    │
│  │              │                        │                  │    │
│  │         Views (8 rutas)         Components               │    │
│  │              │                        │                  │    │
│  │         Custom Hooks            (Tiempo, Menu,           │    │
│  │              │                   HorarioPopUp...)        │    │
│  │              │                                           │    │
│  │         Services Layer                                   │    │
│  │    ┌─────────┴──────────┐                               │    │
│  │    │                    │                               │    │
│  │ service.ts         socketClient.ts                      │    │
│  │  (axios)           (socket.io-client)                   │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────┬──────────────────────┬───────────────────────┘
                  │ REST (axios)          │ Socket.IO
                  ▼                       ▼
         API REST (.NET)        Sync Server (Node.js)
         apitimers.azure        timertajamarback.azure
                  │                       │
                  └──────────┬────────────┘
                             ▼
                       SQL Server (Azure)
```

---

## 2. Estructura de carpetas objetivo

```
events-timer/
├── public/
│   └── favicon.svg
├── src/
│   ├── main.tsx                    # Entry point, montaje de providers
│   ├── App.tsx                     # (puede eliminarse si RouterProvider va directo)
│   │
│   ├── config/
│   │   └── env.ts                  # Variables de entorno validadas y tipadas
│   │
│   ├── types/
│   │   └── index.ts                # Interfaces de dominio (Timer, Empresa, etc.)
│   │
│   ├── services/
│   │   ├── httpClient.ts           # Instancia Axios con interceptores
│   │   ├── service.ts              # Todos los métodos de acceso a la API REST
│   │   ├── socketClient.ts         # Singleton Socket.IO client
│   │   └── authService.ts          # login(), logout(), getToken(), isAuthenticated()
│   │
│   ├── context/
│   │   ├── AuthContext.tsx         # Contexto de autenticacion (token, login, logout)
│   │   └── TimerContext.tsx        # Contexto de countdown (timerID, segundos, sala)
│   │
│   ├── hooks/
│   │   ├── useAuth.ts              # Wrapper de use(AuthContext)
│   │   ├── useTimerState.ts        # Wrapper de use(TimerContext)
│   │   └── useTimerEventos.ts      # Fetch de TimerEvento[] (datos de la vista JOIN)
│   │
│   ├── views/                      # Una vista por ruta (pages)
│   │   ├── TimerView.tsx           # / — countdown público
│   │   ├── LoginView.tsx           # /login
│   │   ├── HorarioView.tsx         # /horario
│   │   ├── SalasView.tsx           # /salas
│   │   ├── EmpresasView.tsx        # /empresas
│   │   ├── CategoriasView.tsx      # /categorias
│   │   ├── TemporizadoresView.tsx  # /temporizadores
│   │   └── EmpresasEventoView.tsx  # /empresastimersnew
│   │
│   ├── components/                 # Componentes reutilizables
│   │   ├── Menu.tsx
│   │   ├── Tiempo.tsx
│   │   ├── SubmitButton.tsx
│   │   ├── ProtectedRoute.tsx
│   │   └── HorarioActualEmpresaPopUp.tsx
│   │
│   ├── utils/
│   │   ├── formatTime.ts           # segundos → "MM:SS" (función pura, testeable)
│   │   └── timezone.ts             # Helpers de Luxon con zona Europe/Madrid
│   │
│   └── router/
│       └── index.tsx               # createBrowserRouter, rutas, loaders
│
├── docs/                           # Esta documentacion
├── .env.development
├── .env.production
├── index.html
├── vite.config.ts
├── tsconfig.json
├── eslint.config.ts
└── package.json
```

---

## 3. Modelo de componentes

### Principios

1. **Vistas** (`views/`): componentes de página, uno por ruta. Orquestan llamadas a servicios y reparten datos a los componentes hijo. No tienen lógica de UI compleja.
2. **Componentes** (`components/`): elementos reutilizables sin conocimiento de las rutas ni de los servicios. Reciben datos por props y emiten eventos por callbacks.
3. **Hooks** (`hooks/`): encapsulan lógica con estado (fetch, formularios, socket). Las vistas los consumen; los componentes no.
4. **Contextos** (`context/`): estado global mínimo. Solo lo que múltiples ramas del árbol necesitan: autenticación y estado del countdown. Todo lo demás es estado local.

### Jerarquía en TimerView (vista más compleja)

```
TimerView (view)
  ├── <title> (metadata nativa React 19)
  ├── SalaSelector (component) — props: salas[], selectedId, onChange
  │     └── consume: getSalas() via useTimerEventos()
  ├── EmpresaActual (component) — props: empresa, sala, segundosRestantes
  │     ├── <img> logo con loading="lazy"
  │     └── Tiempo (component) — props: seconds, warningThreshold
  └── ProximosTurnos (component) — props: timerEventos[]
```

### Jerarquía en CategoriasView (CRUD típico)

```
CategoriasView (view)
  ├── <title>
  ├── [Suspense + use(Promise)] — carga de categorías
  │     └── ListaCategorias (component)
  │           ├── useOptimistic — borrado optimista
  │           └── CategoriaItem (component) — props: categoria, onDelete
  └── CrearCategoriaForm (component)
        ├── useActionState — manejo de submit
        └── SubmitButton (component) — useFormStatus
```

---

## 4. Gestion de estado

### Estado global (Context)

| Contexto | Estado | Quien lo consume |
|---|---|---|
| `AuthContext` | `token`, `isAuthenticated` | Menu, ProtectedRoute, LoginView, httpClient |
| `TimerContext` | `currentTimerId`, `secondsRemaining`, `isRunning`, `selectedSalaId` | TimerView, EmpresaActual, ProximosTurnos |

### Estado de servidor (fetch)

No se introduce una librería de caché de datos (react-query, SWR) en la migración inicial para minimizar la complejidad. Se usa `use(Promise)` + Suspense para la carga inicial y recarga manual tras mutaciones. Si el proyecto crece, añadir `@tanstack/react-query` en una segunda iteración.

### Estado local

Todo lo demás: campos de formulario, estado de modales, selección temporal. Se gestiona con `useState` o `useReducer` dentro del componente que lo necesita.

### Estado de URL

La sala seleccionada en `TimerView` se puede persistir en la URL como query param (`?sala=2`) usando React Router `useSearchParams`, para que al recargar la página se mantenga la selección.

---

## 5. Enrutamiento (React Router 7)

### Configuracion objetivo

```typescript
// src/router/index.tsx
import { createBrowserRouter } from 'react-router-dom'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { TimerView } from '../views/TimerView'
import { LoginView } from '../views/LoginView'
// ... resto de imports

export const router = createBrowserRouter([
  {
    path: '/',
    element: <TimerView />,
  },
  {
    path: '/login',
    element: <LoginView />,
  },
  {
    element: <ProtectedRoute />,   // wrapper con comprobacion de token
    children: [
      { path: '/horario',          element: <HorarioView /> },
      { path: '/salas',            element: <SalasView /> },
      { path: '/empresas',         element: <EmpresasView /> },
      { path: '/categorias',       element: <CategoriasView /> },
      { path: '/temporizadores',   element: <TemporizadoresView /> },
      { path: '/empresastimersnew', element: <EmpresasEventoView /> },
    ],
  },
])
```

### Ruta legacy eliminada

La ruta a `EmpresasEventoTimers` (versión antigua) no se crea. Solo existe `/empresastimersnew` con la versión `EmpresasEventoTimersNew`.

---

## 6. Capa de servicios

### Principio

Un único módulo `service.ts` centraliza todas las llamadas HTTP. Ninguna vista ni componente importa Axios directamente. Este principio ya existía en el legacy y se mantiene.

### Diferencias respecto al legacy

| Aspecto | Legacy | Objetivo |
|---|---|---|
| Tipado | Sin tipos | TypeScript estricto, genéricos en Axios |
| Manejo de errores | try/catch manual en componentes | Interceptor de respuesta en `httpClient.ts` |
| Timezone | Inconsistente (Luxon en `vamos`, `new Date()` en `continuarTimers`) | Luxon + `Europe/Madrid` de forma consistente en el cliente |
| Auth | JWT pegado manualmente en algunos headers | Interceptor de request inyecta Bearer token automáticamente |
| Socket | Instancia creada ad hoc en componentes | Singleton exportado desde `socketClient.ts` |

---

## 7. Gestion de fechas y timezone

### Problema heredado

El sync server usa dos mecanismos distintos para calcular el tiempo:
- `vamos` → Luxon con zona `Europe/Madrid`
- `continuarTimers()` → `new Date()` + suma manual de 60 minutos (UTC sin zona explícita)

Este bug está en el **servidor**, fuera del alcance de esta migración del frontend. Sin embargo, el cliente debe ser consciente de él.

### Decision para el cliente

El cliente siempre usa Luxon con zona `Europe/Madrid` para:
- Mostrar fechas de inicio de timers en la vista Horario
- Calcular si un timer ya pasó o está por venir
- Mostrar la hora actual en el panel de Login

```typescript
// src/utils/timezone.ts
import { DateTime } from 'luxon'

export const TIMEZONE = 'Europe/Madrid'

export function parseTimerInicio(isoString: string): DateTime {
  return DateTime.fromISO(isoString, { zone: TIMEZONE })
}

export function ahora(): DateTime {
  return DateTime.now().setZone(TIMEZONE)
}

export function timerYaPaso(inicio: string, duracionMinutos: number): boolean {
  const fin = parseTimerInicio(inicio).plus({ minutes: duracionMinutos })
  return fin < ahora()
}
```

El bug de timezone en el servidor queda documentado como deuda técnica del servidor (ver `tech-debt.md`).

---

## 8. Gestion de autenticacion

### Flujo

```
LoginView
    │ useActionState(loginAction)
    ▼
authService.login(credentials)
    │ POST Auth/Login → JWT
    ▼
localStorage.setItem('token', jwt)
    │
AuthContext.setToken(jwt)
    │
ProtectedRoute verifica isAuthenticated
    │
Redirección a /horario (o la ruta de destino)
```

### Consideraciones de seguridad

- JWT almacenado en `localStorage` (igual que el legacy). Es el menor de los males para una SPA sin SSR. La alternativa (httpOnly cookie) requiere cambios en la API .NET.
- El token **no** se decodifica en el cliente para extraer roles; solo se comprueba su existencia.
- Al expirar (401 del servidor), el interceptor de `httpClient.ts` limpia `localStorage` y redirige a `/login`.
- Las contraseñas en texto plano están en la base de datos (deuda del backend, ver `tech-debt.md`).

---

## 9. Tiempo real (Socket.IO)

### Patron de suscripcion

Un único proveedor (`TimerProvider`) monta los listeners del socket cuando la app arranca y los desmonta al destruirse. Ningún otro componente suscribe eventos del socket directamente.

```typescript
// context/TimerContext.tsx
import { createContext, useState, useEffect, type ReactNode } from 'react'
import { getSocket } from '../services/socketClient'

// ...

export function TimerProvider({ children }: { children: ReactNode }) {
  const [currentTimerId, setCurrentTimerId] = useState<number | null>(null)
  const [secondsRemaining, setSecondsRemaining] = useState(0)

  useEffect(() => {
    const socket = getSocket()
    socket.on('timerID', setCurrentTimerId)
    socket.on('envio', setSecondsRemaining)

    return () => {
      socket.off('timerID', setCurrentTimerId)
      socket.off('envio', setSecondsRemaining)
    }
  }, [])

  // ...
}
```

Este patrón garantiza que no haya múltiples listeners duplicados (bug común en el legacy cuando componentes individuales se suscriben y desmontan sin limpiar).

---

## 10. Estilos — Decision entre Bootstrap y Tailwind

### Opcion A: Mantener Bootstrap 5.3 (menor esfuerzo)

- Instalar `bootstrap@5.3`
- Importar en `main.tsx`: `import 'bootstrap/dist/css/bootstrap.min.css'`
- Migrar clases directamente del legacy
- Menor curva de aprendizaje, mayor fidelidad visual con el original
- Peso de bundle: ~20KB CSS gzip

### Opcion B: Tailwind CSS 4 (recomendado para proyectos nuevos)

- Instalar `tailwindcss@4` (nueva arquitectura basada en CSS nativo, sin config JS)
- Utility-first: clases directamente en JSX, sin hojas de estilo separadas
- Mejor soporte para el tema oscuro/pantalla completa de `TimerView`
- Peso de bundle: solo las clases usadas (típicamente 5–15KB gzip)
- Mayor curva de aprendizaje si el equipo no lo conoce

### Recomendacion

**Usar Bootstrap 5.3** para esta migración (prioridad es la funcionalidad, no el rediseño visual). Documenta en `tech-debt.md` la migración futura a Tailwind si se decide.

---

## 11. Herramientas de desarrollo

| Herramienta | Version | Proposito |
|---|---|---|
| Vite | 8.x | Bundler, HMR en dev |
| TypeScript | 5.x | Tipado estático |
| ESLint | 10.x | Linting (ya configurado) |
| Prettier | 3.x | Formateo de código |
| Vitest | 3.x | Tests unitarios y de componente |
| @testing-library/react | 16.x | Tests de componente |
| babel-plugin-react-compiler | latest | React Compiler opt-in |

---

## 12. Variables de entorno

| Variable | Dev | Produccion |
|---|---|---|
| `VITE_API_URL` | `https://apitimerstesting.azurewebsites.net/` | `https://apitimers.azurewebsites.net/` |
| `VITE_SOCKET_URL` | `https://timertajamarback.azurewebsites.net/` | `https://timertajamarback.azurewebsites.net/` |

> El frontend de testing (`apitimerstesting`) ya apunta a la API de testing. La URL del sync server es la misma en ambos entornos según la documentación.
