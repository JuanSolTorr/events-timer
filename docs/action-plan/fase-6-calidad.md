# Fase 6 — Calidad, tests y produccion

> Duracion estimada: 2 jornadas
> Prerequisito: Fases 4 y 5 completadas. La app funciona end-to-end contra la API de testing.
> Esta es la ultima fase antes del despliegue a produccion.

---

## Criterio de entrada

- Las 8 vistas renderizan sin errores en `npm run dev`.
- El countdown funciona en tiempo real.
- `npm run build` pasa (aunque puede haber advertencias de bundle size).

## Criterio de salida

- [ ] Cobertura de tests > 60% en `src/utils/` y `src/services/`.
- [ ] `npm run test` pasa con todos los tests en verde.
- [ ] `npm run lint` pasa sin errores ni advertencias.
- [ ] `npm run build` produce `dist/` sin advertencias de Vite.
- [ ] Lighthouse Accessibility > 85 en la vista `/` y en `/categorias`.
- [ ] No hay `console.error` en la consola del navegador en ninguna vista.

---

## Paso 6.1 — Configurar Vitest

Instalar dependencias de testing:

```bash
npm install --save-dev vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
```

Actualizar `vite.config.ts` para incluir la configuracion de Vitest:

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler', {}]],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.ts',
  },
})
```

Crear `src/test-setup.ts`:

```typescript
// src/test-setup.ts
import '@testing-library/jest-dom'
```

Anadir el script de test a `package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

---

## Paso 6.2 — Tests unitarios de utilidades

Crear `src/utils/formatTime.test.ts`:

```typescript
// src/utils/formatTime.test.ts
import { describe, it, expect } from 'vitest'
import { formatTime } from './formatTime'

describe('formatTime', () => {
  it('devuelve 00:00 para 0 segundos', () => {
    expect(formatTime(0)).toBe('00:00')
  })

  it('devuelve 00:00 para valores negativos', () => {
    expect(formatTime(-5)).toBe('00:00')
  })

  it('devuelve 01:00 para 60 segundos', () => {
    expect(formatTime(60)).toBe('01:00')
  })

  it('devuelve 01:30 para 90 segundos', () => {
    expect(formatTime(90)).toBe('01:30')
  })

  it('devuelve 59:59 para 3599 segundos', () => {
    expect(formatTime(3599)).toBe('59:59')
  })

  it('cap a 59:59 para valores superiores a 3599', () => {
    expect(formatTime(9999)).toBe('59:59')
  })

  it('formatea correctamente un valor de un digito en segundos', () => {
    expect(formatTime(65)).toBe('01:05')
  })
})
```

Crear `src/utils/timezone.test.ts`:

```typescript
// src/utils/timezone.test.ts
import { describe, it, expect } from 'vitest'
import { timerYaPaso, parseTimerInicio, TIMEZONE } from './timezone'

describe('timezone helpers', () => {
  it('TIMEZONE es Europe/Madrid', () => {
    expect(TIMEZONE).toBe('Europe/Madrid')
  })

  it('parseTimerInicio devuelve un DateTime valido en zona Madrid', () => {
    const dt = parseTimerInicio('2025-01-23T10:05:00.000')
    expect(dt.zoneName).toBe('Europe/Madrid')
    expect(dt.hour).toBe(10)
    expect(dt.minute).toBe(5)
  })

  it('timerYaPaso devuelve true para un timer en el pasado', () => {
    // Timer hace 2 horas, duracion 15 min: ya paso
    const hace2h = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    expect(timerYaPaso(hace2h, 15)).toBe(true)
  })

  it('timerYaPaso devuelve false para un timer en el futuro', () => {
    // Timer en 2 horas, duracion 15 min: no ha pasado
    const en2h = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
    expect(timerYaPaso(en2h, 15)).toBe(false)
  })
})
```

---

## Paso 6.3 — Tests unitarios de authService

Crear `src/services/authService.test.ts`:

```typescript
// src/services/authService.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock de service.ts para no hacer llamadas HTTP reales
vi.mock('./service', () => ({
  generateToken: vi.fn().mockResolvedValue('fake-jwt-token'),
}))

// Mock de socketClient para evitar conexiones reales
vi.mock('./socketClient', () => ({
  disconnectSocket: vi.fn(),
}))

import { login, logout, getToken, isAuthenticated } from './authService'

describe('authService', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('login almacena el token en localStorage', async () => {
    await login({ userName: 'admin', password: '1234' })
    expect(localStorage.getItem('token')).toBe('fake-jwt-token')
  })

  it('logout elimina el token de localStorage', async () => {
    await login({ userName: 'admin', password: '1234' })
    logout()
    expect(localStorage.getItem('token')).toBeNull()
  })

  it('getToken devuelve null cuando no hay token', () => {
    expect(getToken()).toBeNull()
  })

  it('isAuthenticated devuelve false cuando no hay token', () => {
    expect(isAuthenticated()).toBe(false)
  })

  it('isAuthenticated devuelve true despues de login', async () => {
    await login({ userName: 'admin', password: '1234' })
    expect(isAuthenticated()).toBe(true)
  })
})
```

---

## Paso 6.4 — Test de componente Tiempo

Crear `src/components/Tiempo.test.tsx`:

```typescript
// src/components/Tiempo.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Tiempo } from './Tiempo'

describe('Tiempo', () => {
  it('muestra 00:00 cuando secondsRemaining es 0', () => {
    render(<Tiempo secondsRemaining={0} />)
    expect(screen.getByText('00:00')).toBeInTheDocument()
  })

  it('muestra el tiempo formateado correctamente', () => {
    render(<Tiempo secondsRemaining={90} />)
    expect(screen.getByText('01:30')).toBeInTheDocument()
  })

  it('usa color rojo cuando secondsRemaining <= 60', () => {
    const { container } = render(<Tiempo secondsRemaining={30} />)
    const el = container.firstChild as HTMLElement
    expect(el.style.color).toBe('rgb(220, 53, 69)')  // #dc3545
  })

  it('usa color verde cuando secondsRemaining > 60', () => {
    const { container } = render(<Tiempo secondsRemaining={120} />)
    const el = container.firstChild as HTMLElement
    expect(el.style.color).toBe('rgb(25, 135, 84)')  // #198754
  })

  it('tiene aria-live=polite para accesibilidad', () => {
    render(<Tiempo secondsRemaining={90} />)
    const el = screen.getByRole('generic')
    expect(el).toHaveAttribute('aria-live', 'polite')
  })
})
```

---

## Paso 6.5 — Test de integracion del AuthContext

Crear `src/context/AuthContext.test.tsx`:

```typescript
// src/context/AuthContext.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider } from './AuthContext'
import { useAuth } from '../hooks/useAuth'

vi.mock('../services/authService', () => ({
  login: vi.fn().mockResolvedValue(undefined),
  logout: vi.fn(),
  getToken: vi.fn().mockReturnValue(null),
  isAuthenticated: vi.fn().mockReturnValue(false),
}))

vi.mock('../services/socketClient', () => ({
  disconnectSocket: vi.fn(),
}))

function TestComponent() {
  const { isAuthenticated, login, logout } = useAuth()
  return (
    <div>
      <span data-testid="auth-status">
        {isAuthenticated ? 'autenticado' : 'no-autenticado'}
      </span>
      <button onClick={() => login({ userName: 'u', password: 'p' })}>
        Login
      </button>
      <button onClick={logout}>Logout</button>
    </div>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('empieza como no autenticado', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )
    expect(screen.getByTestId('auth-status').textContent).toBe('no-autenticado')
  })

  it('cambia a autenticado despues de login', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )
    await act(() => userEvent.click(screen.getByText('Login')))
    expect(screen.getByTestId('auth-status').textContent).toBe('autenticado')
  })

  it('vuelve a no autenticado despues de logout', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )
    await act(() => userEvent.click(screen.getByText('Login')))
    await act(() => userEvent.click(screen.getByText('Logout')))
    expect(screen.getByTestId('auth-status').textContent).toBe('no-autenticado')
  })
})
```

---

## Paso 6.6 — Linting y formateo

Instalar Prettier:

```bash
npm install --save-dev prettier eslint-config-prettier
```

Crear `.prettierrc` en la raiz:

```json
{
  "semi": false,
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "trailingComma": "es5"
}
```

Anadir scripts a `package.json`:

```json
{
  "scripts": {
    "format": "prettier --write src/",
    "format:check": "prettier --check src/"
  }
}
```

Verificar que `eslint.config.ts` (o `.js`) incluye `eslint-config-prettier` al final de la lista para que no haya conflictos entre ESLint y Prettier:

```typescript
// eslint.config.ts — anadir al final del array de configs
import prettierConfig from 'eslint-config-prettier'
// ...
export default [
  // ...tus otras configs...
  prettierConfig,
]
```

Instalar plugin de accesibilidad:

```bash
npm install --save-dev eslint-plugin-jsx-a11y
```

Ejecutar linter y corregir todos los problemas antes de continuar:

```bash
npm run lint
npm run format
npm run lint   # debe pasar sin errores tras el format
```

---

## Paso 6.7 — Accesibilidad

Checklist obligatorio (verificar manualmente en el navegador y con las herramientas de desarrollo):

- [ ] Todos los `<img>` tienen atributo `alt` descriptivo (no vacio excepto en imagenes decorativas).
- [ ] Todos los campos de formulario tienen `<label>` asociado via `htmlFor` + `id`.
- [ ] Los modales `<dialog>` cierran con la tecla `Escape` (comportamiento nativo del elemento `<dialog>`).
- [ ] El foco se mueve al interior del `<dialog>` al abrirse (comportamiento nativo).
- [ ] Los botones de accion destructiva tienen texto descriptivo (no solo iconos).
- [ ] El componente `Tiempo` tiene `aria-live="polite"` y `aria-label` con el tiempo formateado.
- [ ] El selector de sala en `TimerView` tiene `<label>` visible asociado.
- [ ] La navegacion del `Menu` usa `<nav>` con `<NavLink>` (elementos semanticos correctos).

Ejecutar Lighthouse en Chrome DevTools (modo Accessibility) en las rutas `/` y `/categorias`. El score debe ser > 85.

---

## Paso 6.8 — Build de produccion

Configurar `vite.config.ts` para produccion:

```typescript
// vite.config.ts (seccion adicional)
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler', {}]],
      },
    }),
  ],
  build: {
    sourcemap: mode !== 'production',
    rollupOptions: {
      output: {
        manualChunks: {
          // Separa las dependencias pesadas en chunks propios
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['bootstrap', 'sweetalert2'],
          utils: ['luxon', 'axios', 'socket.io-client'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.ts',
  },
}))
```

Ejecutar el build de produccion:

```bash
npm run build
```

Verificar el output:

```
dist/
├── index.html
└── assets/
    ├── vendor-[hash].js
    ├── router-[hash].js
    ├── ui-[hash].js
    ├── utils-[hash].js
    └── index-[hash].css
```

Hacer un preview local del build de produccion para detectar problemas antes de subir a Azure:

```bash
npm run preview
```

Navegar a `http://localhost:4173` y verificar que la app funciona igual que en dev.

---

## Paso 6.9 — Verificacion end-to-end

Checklist final antes del despliegue:

- [ ] `npm run test` — todos los tests en verde.
- [ ] `npm run test:coverage` — cobertura > 60% en `utils/` y `services/`.
- [ ] `npm run lint` — sin errores ni advertencias.
- [ ] `npm run format:check` — sin diferencias de formato.
- [ ] `npm run build` — sin errores ni advertencias de Vite.
- [ ] `npm run preview` — app funciona con el build de produccion.
- [ ] Abrir consola del navegador en cada una de las 8 vistas: sin `console.error`.
- [ ] Lighthouse Accessibility > 85 en `/` y `/categorias`.
- [ ] El countdown funciona en tiempo real (probar con el sync server de testing).
- [ ] El login funciona contra la API de testing.
- [ ] `syncData` se emite al crear/editar/borrar categorias y temporizadores.

---

## Al cerrar la fase

```bash
git add -A
git commit -m "fase-6: tests, linting, accesibilidad y build de produccion listos"
git tag v1.0-produccion
```

Comunicar al equipo que el proyecto esta listo para despliegue en Azure App Service.
