# DECISIONS — Cómo elegir el *shape* del proyecto React

> Árbol de decisión para la primera elección crítica: ¿Vite SPA, Next.js, React Router 7 framework, o Astro? Esta es la decisión más cara de revertir. No empieces a teclear sin haberla tomado conscientemente.

---

## 1. Las cuatro opciones realistas en 2026

| Opción | Para qué brilla | Cuándo NO |
|---|---|---|
| **Vite + React** (SPA pura) | Apps internas detrás de login, dashboards B2B, herramientas back-office, prototipos rápidos. Cero SSR, todo cliente. | SEO importa. *Time-to-content* importa. Hay mucho contenido que cambia. |
| **Next.js App Router** | Productos consumer, marketing sites con app detrás, SaaS multi-tenant público, e-commerce. Server Components + Server Actions + caching del framework. | App puramente interna sin SEO ni SSR. Equipo sin experiencia con RSC y plazos cortos. |
| **React Router 7** (framework mode) | Apps de producto donde quieres SSR/SSG sin la complejidad del modelo de caching de Next. Continuidad de Remix. | Marketing-heavy con muchos requisitos de SEO específicos donde Next ya tiene plantillas. |
| **Astro con islas React** | Sitios mayormente estáticos con islas interactivas: blogs, docs, marketing, e-commerce ligero. Mínimo JS al cliente. | App muy interactiva (dashboard, editor, chat). Astro no es para eso. |

---

## 2. Árbol de decisión

Responde en orden. La primera respuesta que aplique te lleva a la opción.

```
1. ¿La aplicación es mayormente estática (blog, docs, marketing, landing)
   con islas interactivas puntuales?
     SÍ → Astro con islas React. FIN.
     NO → 2

2. ¿Va detrás de login y no tiene SEO ni necesidad de SSR?
   (típico SaaS B2B interno, dashboard de back-office, panel de admin)
     SÍ → Vite + React (SPA). FIN.
     NO → 3

3. ¿Necesitas SSR/SSG, caching servidor, Server Components y el equipo
   está cómodo (o dispuesto a invertir) con el modelo de Next?
     SÍ → Next.js App Router. FIN.
     NO → 4

4. ¿Quieres SSR/SSG pero con un modelo más simple y predecible que el de Next,
   con loaders/actions explícitos, y vienes de Remix o te gusta su filosofía?
     SÍ → React Router 7 (framework mode). FIN.
     NO → Repasa los criterios desde el paso 1; algo no encaja.
```

---

## 3. Criterios que más pesan

### 3.1 SEO y *time-to-content*

- **SEO crítico** (público que llega de Google, redes sociales, comparadores) → SSR/SSG es no negociable. Next.js o Astro.
- **App detrás de login** → SEO irrelevante. Vite SPA está perfecto.
- **Mixto** (landing pública + app autenticada) → Next.js cubre los dos casos sin saltar de stack.

### 3.2 Naturaleza del contenido

- **Contenido editorial** (blog, docs, marketing) → Astro brilla: cero JS por defecto, islas solo donde hay interacción.
- **Contenido dinámico cacheable** (catálogo de e-commerce, listings) → Next.js + caching o RR7 framework.
- **App interactiva** (editor, dashboard, chat) → Vite SPA o Next.js si además hay SEO.

### 3.3 Equipo

- **Equipo nuevo en React** → Vite SPA es lo más simple de aprender; menos magia.
- **Equipo con experiencia Remix** → React Router 7 framework mode es continuidad natural.
- **Equipo con experiencia Next.js** → Next.js App Router.
- **Equipo sin experiencia RSC** → cuidado con Next.js App Router; curva real, errores caros. Considera Pages Router temporal o RR7.

### 3.4 Plazos y madurez del producto

- **MVP en 4 semanas** sin SEO → Vite SPA + UI library *headless* + TanStack Query.
- **Producto a 3 años con SEO y crecimiento** → Next.js App Router.
- **Sitio editorial que crece** → Astro.

### 3.5 Despliegue y restricciones de infra

- **Despliegue serverless / edge** (Vercel, Cloudflare, Netlify) → Next.js, RR7, Astro encajan nativamente.
- **Despliegue en infraestructura propia / on-prem** → Vite SPA es más simple (servir estáticos detrás de cualquier servidor). Next.js y RR7 también funcionan en Node propio, pero con más configuración.
- **Edge runtime obligatorio** (latencia ultra-baja global) → Next.js y RR7 lo soportan; Vite SPA + CDN también, sin SSR.

### 3.6 Caching y revalidación

- Si necesitas **caching servidor declarativo** con revalidación por tags/paths, **Next.js** lo tiene de fábrica (con sus *gotchas* — léelos).
- Si prefieres **caching explícito en tu mano**, **RR7 framework** o **Vite SPA + TanStack Query** son más predecibles.

---

## 4. Anti-decisiones frecuentes

- **"Usemos Next.js porque todo el mundo lo usa"** — Si tu app es un dashboard interno B2B sin SEO, Next.js te añade complejidad operativa (build, deploy, caching, RSC vs client boundaries) sin valor. Vite SPA suele ser correcto.
- **"Empezamos con Vite y migramos a Next si hace falta"** — La migración no es trivial. Si sabes que vas a necesitar SSR, empieza con SSR.
- **"Astro con React para todo"** — Astro es para sitios mayormente estáticos. Una app muy interactiva en Astro es luchar contra la herramienta.
- **"Mezclamos Next.js y React Router en el mismo proyecto"** — No. Elige uno y atente.
- **"Migramos a Next 15 / RR7 / Astro porque salió la nueva versión"** — Migrar tiene coste. Solo migras si la nueva versión resuelve un dolor medible.

---

## 5. Tabla resumen para decidir en 30 segundos

| Si tu producto es… | Empieza con… |
|---|---|
| SaaS B2B detrás de login, sin SEO | **Vite + React (SPA)** |
| E-commerce consumer público | **Next.js App Router** |
| Marketing site con app autenticada | **Next.js App Router** |
| Blog / documentación / landing | **Astro con islas React** |
| Producto SaaS público con SSR pero sin querer la complejidad de Next | **React Router 7 framework** |
| Dashboard interno enterprise | **Vite + React (SPA)** |
| App móvil web (PWA) | **Vite + React (SPA)** + Service Worker, o Next.js |
| Herramienta de back-office | **Vite + React (SPA)** |
| Prototipo / hackathon | **Vite + React (SPA)** |
| Editor o herramienta muy interactiva | **Vite + React (SPA)** o Next.js si además público |

---

## 6. Una vez elegido: lo que sigue

Pasa al stack por defecto en `STACK.md` y a los patrones en `PATTERNS.md`. Cualquier elección sigue siendo **React 19 estable** salvo declaración explícita del usuario.
