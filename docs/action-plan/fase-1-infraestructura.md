# Fase 1 — Infraestructura base

> Duracion estimada: 1 jornada
> Prerequisito: Fase 0 completada (documentacion leida y comprendida).
> Bloquea: Fases 2, 3, 4, 5 y 6.

---

## Criterio de entrada

- `npm run dev` y `npm run lint` pasan en el scaffold actual sin errores.

## Criterio de salida

Los cuatro items siguientes deben pasar antes de avanzar a Fase 2:

- [ ] `npm run build` termina sin errores ni advertencias TypeScript.
- [ ] `npm run lint` termina sin errores.
- [ ] `npm run dev` arranca y el navegador muestra la app (aunque este vacia).
- [ ] Las rutas `/login` y `/` renderizan componentes placeholder sin errores en consola.

---

## Paso 1.1 — TypeScript

Instalar TypeScript y tipos de Node:

```bash
npm install --save-dev typescript @types/node
```

Crear `tsconfig.json` en la raiz del proyecto con configuracion strict:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true,
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

Crear `tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "noEmit": true
  },
  "include": ["vite.config.ts"]
}
```

Renombrar archivos de entrada:

```bash
# En PowerShell
Rename-Item src\main.jsx src\main.tsx
Rename-Item src\App.jsx src\App.tsx
```

Verificar que `vite.config.js` se llame `vite.config.ts` (si no, renombrarlo tambien):

```bash
Rename-Item vite.config.js vite.config.ts
```

Actualizar `vite.config.ts` para soporte de TypeScript, React Compiler y Tailwind CSS 4:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
    react({
      babel: {
        plugins: [
          ['babel-plugin-react-compiler', {}],
        ],
      },
    }),
  ],
})
```

> Nota: en Tailwind CSS v4 el plugin `@tailwindcss/vite` es todo-en-uno. No se usa `tailwindcss` + `postcss` como en v3. El plugin debe ir antes de `react()` en el array.

Instalar el React Compiler:

```bash
npm install --save-dev babel-plugin-react-compiler
```

Verificar que el linter funciona con TypeScript. Si `eslint.config.js` existe, revisar que incluye las reglas TypeScript:

```bash
npm install --save-dev @typescript-eslint/eslint-plugin @typescript-eslint/parser
```

---

## Paso 1.2 — Variables de entorno

Crear `.env.development` en la raiz del proyecto:

```
VITE_API_URL=https://apitimerstesting.azurewebsites.net/
VITE_SOCKET_URL=https://timertajamarback.azurewebsites.net/
```

Crear `.env.production` en la raiz del proyecto:

```
VITE_API_URL=https://apitimers.azurewebsites.net/
VITE_SOCKET_URL=https://timertajamarback.azurewebsites.net/
```

Anadir ambos archivos a `.gitignore` si contienen secretos futuros. Por ahora son URLs publicas, pero es buena practica excluirlos:

```
# .gitignore (añadir si no esta)
.env.development
.env.production
```

Crear `src/config/env.ts`:

```typescript
export const config = {
  apiUrl: import.meta.env.VITE_API_URL as string,
  socketUrl: import.meta.env.VITE_SOCKET_URL as string,
} as const

// Validacion en tiempo de carga (falla rapido si faltan variables)
if (!config.apiUrl) throw new Error('VITE_API_URL no esta definida')
if (!config.socketUrl) throw new Error('VITE_SOCKET_URL no esta definida')
```

---

## Paso 1.3 — Dependencias de produccion

Instalar todas las dependencias en un solo comando:

```bash
npm install react-router-dom@7 axios@1 socket.io-client@4 luxon@3 sweetalert2@11
```

Instalar Tailwind CSS 4 y su plugin de Vite:

```bash
npm install tailwindcss @tailwindcss/vite
```

Instalar tipos necesarios:

```bash
npm install --save-dev @types/luxon
```

Crear o reemplazar `src/index.css` con la directiva de importacion de Tailwind v4 y los tokens de tema del proyecto (ver seccion "Tokens de color" al final de este archivo):

```css
@import "tailwindcss";

@theme {
  /* tokens del proyecto — ver seccion al final */
}
```

> Nota: Tailwind CSS v4 no usa `@tailwind base;`, `@tailwind components;` ni `@tailwind utilities;`. La unica directiva necesaria es `@import "tailwindcss";`. La personalizacion del tema se hace en el bloque `@theme { }` dentro del CSS, no en `tailwind.config.js` (que ya no es necesario en v4).

Asegurarse de que `src/index.css` se importa en `src/main.tsx` (ver Paso 1.6).

---

## Paso 1.4 — Estructura de carpetas

Crear la estructura objetivo. Los `.gitkeep` existentes se eliminan al crear el primer archivo real en cada carpeta.

```bash
# En PowerShell, desde la raiz del proyecto
New-Item -ItemType Directory -Force src\config
New-Item -ItemType Directory -Force src\types
New-Item -ItemType Directory -Force src\services
New-Item -ItemType Directory -Force src\context
New-Item -ItemType Directory -Force src\hooks
New-Item -ItemType Directory -Force src\views
New-Item -ItemType Directory -Force src\components
New-Item -ItemType Directory -Force src\utils
New-Item -ItemType Directory -Force src\router
```

Estructura final esperada:

```
src/
├── main.tsx
├── App.tsx                  (puede eliminarse en pasos posteriores)
├── config/
│   └── env.ts
├── types/
│   └── index.ts             (Fase 2)
├── services/
│   ├── httpClient.ts        (Fase 2)
│   ├── service.ts           (Fase 2)
│   ├── socketClient.ts      (Fase 2)
│   └── authService.ts       (Fase 2)
├── context/
│   ├── AuthContext.tsx      (Fase 3)
│   └── TimerContext.tsx     (Fase 3)
├── hooks/
│   ├── useAuth.ts           (Fase 3)
│   └── useTimerState.ts     (Fase 3)
├── views/
│   ├── TimerView.tsx        (Fase 5)
│   ├── LoginView.tsx        (Fase 4)
│   ├── HorarioView.tsx      (Fase 5)
│   ├── SalasView.tsx        (Fase 4)
│   ├── EmpresasView.tsx     (Fase 4)
│   ├── CategoriasView.tsx   (Fase 4)
│   ├── TemporizadoresView.tsx (Fase 4)
│   └── EmpresasEventoView.tsx (Fase 4)
├── components/
│   ├── Menu.tsx             (Fase 4)
│   ├── Tiempo.tsx           (Fase 5)
│   ├── SubmitButton.tsx     (Fase 4)
│   ├── ProtectedRoute.tsx   (este paso)
│   └── HorarioActualEmpresaPopUp.tsx (Fase 5)
├── utils/
│   ├── formatTime.ts        (Fase 5)
│   └── timezone.ts          (Fase 2)
└── router/
    └── index.tsx            (este paso)
```

---

## Paso 1.5 — Enrutamiento base

Crear `src/components/ProtectedRoute.tsx` (placeholder que se completa en Fase 3):

```typescript
import { Navigate, Outlet } from 'react-router-dom'

export function ProtectedRoute() {
  const token = localStorage.getItem('token')
  if (!token) return <Navigate to="/login" replace />
  return <Outlet />
}
```

Crear `src/views/placeholder.tsx` mental: en esta fase basta con un componente vacio por ruta para que el router no explote. Crear los placeholders minimos:

```typescript
// src/views/TimerView.tsx
export function TimerView() {
  return <div>TimerView — placeholder Fase 5</div>
}

// src/views/LoginView.tsx
export function LoginView() {
  return <div>Login — placeholder Fase 4</div>
}

// Repetir para HorarioView, SalasView, EmpresasView,
// CategoriasView, TemporizadoresView, EmpresasEventoView
```

Crear `src/router/index.tsx`:

```typescript
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { TimerView } from '../views/TimerView'
import { LoginView } from '../views/LoginView'
import { HorarioView } from '../views/HorarioView'
import { SalasView } from '../views/SalasView'
import { EmpresasView } from '../views/EmpresasView'
import { CategoriasView } from '../views/CategoriasView'
import { TemporizadoresView } from '../views/TemporizadoresView'
import { EmpresasEventoView } from '../views/EmpresasEventoView'

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
    element: <ProtectedRoute />,
    children: [
      { path: '/horario',            element: <HorarioView /> },
      { path: '/salas',              element: <SalasView /> },
      { path: '/empresas',           element: <EmpresasView /> },
      { path: '/categorias',         element: <CategoriasView /> },
      { path: '/temporizadores',     element: <TemporizadoresView /> },
      { path: '/empresastimersnew',  element: <EmpresasEventoView /> },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
])
```

---

## Paso 1.6 — Actualizar main.tsx

```typescript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
)
```

> Se importa `./index.css` (que contiene `@import "tailwindcss"`) en lugar de la hoja de Bootstrap. Tailwind v4 inyecta sus estilos base, componentes y utilidades a traves de ese unico `@import`.

---

## Paso 1.7 — Actualizar index.html

Editar `index.html` en la raiz:

```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Timers Tajamar</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

---

## Verificacion final

Ejecutar en orden:

```bash
npm run lint    # debe pasar sin errores
npm run build   # debe producir dist/ sin errores TypeScript
npm run dev     # debe arrancar en http://localhost:5173
```

Navegar a `http://localhost:5173` → debe mostrar "TimerView — placeholder".
Navegar a `http://localhost:5173/login` → debe mostrar "Login — placeholder".
Navegar a `http://localhost:5173/salas` → debe redirigir a `/login` (no hay token).

---

## Tokens de color (propuesta inicial)

> Estos tokens son **placeholders profesionales** propuestos para el proyecto. Deben revisarse y aprobarse con los responsables del producto antes de la Fase 5 (TimerView). Si existen colores de marca oficiales de Tajamar, sustituir los valores hex por los correspondientes.

El bloque `@theme` va en `src/index.css`, despues de `@import "tailwindcss";`:

```css
@import "tailwindcss";

@theme {
  /* -------------------------------------------------------
     Color primario
     Azul corporativo de alta confianza. Usado en botones
     de accion principal, cabeceras de admin y acentos de UI.
     Contraste sobre blanco: 4.6:1 (pasa WCAG AA normal).
  ------------------------------------------------------- */
  --color-primary:         #1D4ED8; /* blue-700 Tailwind */
  --color-primary-hover:   #1E40AF; /* blue-800 — estado hover/activo */
  --color-primary-subtle:  #DBEAFE; /* blue-100 — fondos suaves, badges */

  /* -------------------------------------------------------
     Fondo oscuro TimerView
     Negro azulado que reduce fatiga visual en sala grande
     con proyector o pantalla de 40"+. Alto contraste con
     texto blanco (ratio > 15:1).
  ------------------------------------------------------- */
  --color-bg-dark:         #0F172A; /* slate-900 Tailwind */
  --color-bg-dark-surface: #1E293B; /* slate-800 — cards/paneles sobre fondo */

  /* -------------------------------------------------------
     Warning ultimo minuto
     Ambar saturado visible en sala con luz ambiente variable.
     Se combina siempre con icono y texto (no solo color)
     para cumplir WCAG 1.4.1.
     Contraste sobre bg-dark: 8.1:1 (pasa WCAG AAA).
  ------------------------------------------------------- */
  --color-warning:         #F59E0B; /* amber-400 Tailwind */
  --color-warning-strong:  #D97706; /* amber-500 — variante mas intensa si hace falta */

  /* -------------------------------------------------------
     Texto principal
     Blanco ligeramente suavizado para reducir halos en
     pantalla oscura. Contraste sobre bg-dark: 14.7:1.
  ------------------------------------------------------- */
  --color-text-primary:    #F1F5F9; /* slate-100 Tailwind */
  --color-text-secondary:  #94A3B8; /* slate-400 — metadatos, etiquetas secundarias */
  --color-text-on-primary: #FFFFFF; /* texto sobre botones de color primario */

  /* -------------------------------------------------------
     Estados semanticos (formularios y tablas de admin)
     Se usan junto a icono y texto, nunca solo por color.
  ------------------------------------------------------- */
  --color-success:         #16A34A; /* green-600 */
  --color-error:           #DC2626; /* red-600 */
  --color-info:            #0284C7; /* sky-600 */

  /* -------------------------------------------------------
     Fondos de administracion (vistas CRUD)
     Fondo claro neutro para no competir con los datos.
  ------------------------------------------------------- */
  --color-bg-admin:        #F8FAFC; /* slate-50 */
  --color-bg-admin-card:   #FFFFFF;
  --color-border:          #E2E8F0; /* slate-200 */
}
```

Razonamiento de cada decision:

| Token | Valor | Justificacion |
|---|---|---|
| `--color-primary` | `#1D4ED8` | Azul institucional de alta legibilidad. Contraste AA sobre blanco y sobre `bg-admin-card`. |
| `--color-bg-dark` | `#0F172A` | Slate-900: negro con matiz frio. Reduce fatiga en proyeccion larga. Evita el negro puro que genera halos en LCD. |
| `--color-warning` | `#F59E0B` | Ambar-400: visible con luz ambiental sin llegar a rojo (que se confundiria con error). Ratio > 8:1 sobre fondo oscuro. |
| `--color-text-primary` | `#F1F5F9` | Slate-100: blanco suavizado. Reduce el contraste extremo blanco puro / negro puro que fatiga en sesiones largas. |

Para usar los tokens en clases de Tailwind, en v4 los custom properties de `@theme` se convierten automaticamente en clases utilitarias: `bg-[--color-bg-dark]`, `text-[--color-warning]`, o directamente como valores de CSS custom property en estilos en linea cuando la clase utilitaria no existe todavia.

---

## Al cerrar la fase

```bash
git add -A
git commit -m "fase-1: infraestructura base — TS, dependencias, router, env"
git tag v0.1-infra
```
