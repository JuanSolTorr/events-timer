# ANTIPATTERNS — Lo que NO se hace en React 19 (y por qué)

> Lista de anti-patrones recurrentes con justificación, daño concreto que causan y alternativa correcta. Si te sorprendes haciendo algo de esta lista, párate y revisa.

---

## 1. `useEffect` para fetching de datos al montar

```tsx
// MAL
function User({ id }) {
  const [user, setUser] = useState(null);
  useEffect(() => {
    fetch(`/api/users/${id}`).then(r => r.json()).then(setUser);
  }, [id]);
  // ...
}
```

**Por qué es malo:**
- Sin cache: cada montaje refetchea.
- Sin dedupe: dos componentes pidiendo `/api/users/1` lanzan dos requests.
- Sin retries, sin manejo de error decente, sin estado `loading` consistente.
- Race conditions: si `id` cambia rápido, el `setUser` puede llegar fuera de orden.
- No revalida en focus, no invalida en mutación, no integra con Suspense.

**Alternativa correcta:**
- **SPA:** `useQuery` de TanStack Query.
- **Next App Router:** Server Component que hace `fetch` directo, o `use(fetchPromise)`.
- **React Router 7:** `loader` de la ruta.

---

## 2. `useEffect` para sincronizar estado derivado

```tsx
// MAL
const [firstName, setFirstName] = useState('');
const [lastName, setLastName] = useState('');
const [fullName, setFullName] = useState('');
useEffect(() => { setFullName(`${firstName} ${lastName}`); }, [firstName, lastName]);
```

**Por qué es malo:** doble render, fuente de bugs de sincronización, estado redundante.

**Alternativa:** **calcula durante el render.**
```tsx
const fullName = `${firstName} ${lastName}`;
```
Si el cálculo es realmente caro, `useMemo`. Si no, déjalo plano.

Referencia: [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect).

---

## 3. `forwardRef` en React 19

```tsx
// MAL (React 19)
const Input = forwardRef<HTMLInputElement, Props>((props, ref) => (
  <input ref={ref} {...props} />
));
```

**Por qué es malo:** en React 19, `ref` ya es una prop normal. `forwardRef` añade un wrapper innecesario, complica los tipos y va camino a deprecación.

**Alternativa:**
```tsx
function Input({ ref, ...props }: Props & { ref?: Ref<HTMLInputElement> }) {
  return <input ref={ref} {...props} />;
}
```

---

## 4. Redux por defecto

**Por qué es malo (por defecto):**
- Boilerplate alto (actions, reducers, selectors, middleware).
- Mezcla server state y client state en un mismo store, lo que se gestiona mucho mejor por separado.
- TanStack Query resuelve el 90% de los casos para los que la gente usaba Redux.

**Cuándo SÍ Redux Toolkit (RTK):**
- Equipo ya lo domina y migrar no aporta valor.
- Estado cliente con muchas mutaciones cruzadas, time-travel debugging valioso, undo/redo complejo.

**Alternativa por defecto:** TanStack Query para servidor + `useState`/`useReducer` para local + Zustand si necesitas global cliente real.

---

## 5. Memoización prematura (`useMemo`/`useCallback`/`React.memo` por reflejo)

**Por qué es malo:**
- Cada `useMemo` añade trabajo: comparar deps, ocupar memoria.
- Suele no aportar nada si el cálculo es trivial o si los hijos no son `React.memo`.
- Da falsa sensación de optimización.

**Cuándo SÍ:**
- Cálculo demostrablemente caro (perfilado con DevTools Profiler).
- Referencia estable necesaria para una dep de `useEffect` o un `React.memo` aguas abajo.

**Regla:** primero perfila, luego memoiza. Nunca al revés.

---

## 6. Importar moment.js o lodash entero

```tsx
// MAL
import moment from 'moment';
import _ from 'lodash';
```

**Por qué es malo:**
- moment: ~290 KB, sin tree-shaking, **proyecto en mantenimiento** (los propios autores recomiendan migrar).
- lodash entero: trae todo aunque uses una función.

**Alternativa:**
- Fechas: `Intl.DateTimeFormat` nativo + `date-fns` o `dayjs` si necesitas manipulación.
- Lodash: `import debounce from 'lodash/debounce'` (subpath) o `lodash-es`, o reimplementa la utility (suelen ser 5 líneas).

---

## 7. Manejar fetch sin abort en cambios de input

```tsx
// MAL
useEffect(() => { fetch(`/search?q=${q}`).then(...); }, [q]);
```

**Por qué es malo:** si el usuario teclea rápido, las respuestas pueden llegar en cualquier orden y la última en pintar puede ser la más vieja.

**Alternativa:** `AbortController` + `signal`, o usar TanStack Query (lo hace solo), o usar el `loader` del router (idem).

---

## 8. Mutar estado directamente

```tsx
// MAL
items.push(newItem);
setItems(items);
```

**Por qué es malo:** React compara referencias para decidir si re-renderiza. Si mutas, la referencia es la misma y React puede no detectar el cambio.

**Alternativa:**
```tsx
setItems(prev => [...prev, newItem]);
// o con Immer si la estructura es compleja:
setItems(produce(draft => { draft.push(newItem); }));
```

---

## 9. Usar índice del array como `key` en listas reordenables

```tsx
// MAL si la lista se reordena, filtra o inserta en medio
items.map((it, i) => <Row key={i} item={it} />);
```

**Por qué es malo:** React asume estabilidad por `key`. Si reordenas, el estado interno de los componentes hijos (focus, inputs no controlados, animaciones) se queda asociado al índice viejo y los hijos se confunden.

**Alternativa:** una clave estable del propio dato (`it.id`).
```tsx
items.map(it => <Row key={it.id} item={it} />);
```
Solo usar índice si la lista es **inmutable y nunca se reordena**.

---

## 10. Lógica en el render que dispara cambios de estado

```tsx
// MAL
function Comp({ value }) {
  if (value > 10) setSomething(true);   // setState durante render
  return <>...</>;
}
```

**Por qué es malo:** loop infinito o warning de React. El render debe ser puro.

**Alternativa:** mueve la lógica a un `useEffect` o, mejor, **deriva durante el render** y olvídate del estado.

---

## 11. `dangerouslySetInnerHTML` con contenido no sanitizado

**Por qué es malo:** XSS directo. Cualquier `<script>` en el HTML se ejecuta.

**Alternativa:**
- Renderiza con JSX siempre que puedas.
- Si tienes que renderizar HTML externo (markdown, CMS), pasa por un sanitizador (`DOMPurify`) antes.
- Mejor: convierte markdown → React elements con un parser (`react-markdown`).

---

## 12. Guardar tokens de auth en `localStorage`

**Por qué es malo:** `localStorage` es accesible a cualquier JS de la página. Un XSS exfiltra todos los tokens.

**Alternativa:** cookies `HttpOnly; Secure; SameSite=Lax` emitidas por el backend. El JS del cliente nunca toca el token.

---

## 13. Componentes que reciben 12+ props (god component)

**Por qué es malo:**
- Imposible de leer.
- Cada cambio rompe múltiples sitios.
- Suele indicar que faltan abstracciones (composición, contexto, slot props).

**Alternativa:**
- **Composición:** `<Dialog><Dialog.Header /><Dialog.Body /></Dialog>`.
- **Slot pattern:** `<Card header={...} footer={...} />`.
- Separar en sub-componentes con responsabilidad clara.

---

## 14. CSS-in-JS con runtime en proyectos nuevos

(styled-components, Emotion)

**Por qué es malo en 2026:**
- Coste de runtime para parsear y aplicar estilos.
- Mala integración con Server Components (necesitan workarounds).
- Tailwind y CSS Modules cubren el caso sin coste runtime.

**Alternativa:** Tailwind, CSS Modules, vanilla-extract (CSS-in-TS sin runtime).

---

## 15. Ignorar `key` warnings y warnings de React en general

**Por qué es malo:** los warnings de React son una de las pocas señales fiables de bugs latentes. Ignorarlos es desactivar el detector de humo.

**Alternativa:** trata los warnings de React como errores. Si uno aparece en consola, se arregla antes de seguir.

---

## 16. Importar todo desde una sola barrel file en proyectos grandes

```tsx
// MAL en src/components/index.ts
export * from './Button';
export * from './Card';
export * from './Modal';
// ... 200 exports
```

**Por qué puede ser malo:**
- Suele romper tree-shaking si los módulos tienen side effects.
- Builds más lentos.
- Cycles ocultos.

**Alternativa:** imports directos al archivo. Si haces barrels, mantén archivos pequeños y `"sideEffects": false` en `package.json`.

---

## 17. `any` en TypeScript

**Por qué es malo:** desactiva el chequeo de tipos en cadena. Cada `any` se propaga.

**Alternativa:**
- `unknown` + narrowing con `typeof`/`instanceof`/zod.
- Tipos genéricos.
- Si realmente necesitas escapar el sistema de tipos, comenta el porqué.

---

## 18. `useEffect` con un array de dependencias vacío para "ejecutar solo al montar"

```tsx
// SOSPECHOSO
useEffect(() => {
  doSomethingWith(propX);
}, []); // ignora propX
```

**Por qué es malo:**
- Usa `propX` pero no lo declara como dep → bug latente cuando `propX` cambie.
- ESLint `react-hooks/exhaustive-deps` te lo gritará; si lo silencias, vas a tropezar.

**Alternativa:** declara todas las deps reales o reescribe la lógica para que no las necesite. Si de verdad solo debe ejecutarse al montar y no depende de props, asegúrate de que es así moviendo la lógica fuera del componente.

---

## 19. Romper la regla de Hooks

```tsx
// MAL
if (loggedIn) {
  const [x, setX] = useState(0);   // hook condicional
}
```

**Por qué es malo:** los hooks dependen del orden de llamada. Llamarlos condicionalmente corrompe el estado interno de React.

**Alternativa:** extrae a un componente hijo que solo se renderiza cuando se cumple la condición. El hook va dentro de ese hijo.

---

## 20. Bundles sin code splitting en apps grandes

**Por qué es malo:** la primera carga incluye todo el código de la app, aunque el usuario solo abra una pantalla. LCP se hunde, INP también.

**Alternativa:**
- `React.lazy(() => import('./PaginaPesada'))` + `<Suspense>`.
- Splits por ruta de fábrica con Vite, Next.js, RR7.
- Mide con `vite-bundle-visualizer` o `next-bundle-analyzer`.

---

## 21. Tests que comprueban el HTML interno (snapshot brittle)

```tsx
// MAL
expect(container.innerHTML).toMatchSnapshot();
```

**Por qué es malo:** cualquier cambio de markup rompe el test sin que haya un bug real. Los snapshots se actualizan a ciegas y dejan de aportar señal.

**Alternativa:** Testing Library con queries semánticas (`getByRole`, `getByLabelText`, `getByText`). Testea **comportamiento**, no estructura.

---

## 22. Mockear todo en tests (incluido lo que estás probando)

**Por qué es malo:** terminas testeando los mocks, no el código.

**Alternativa:**
- Mockea **el límite** (red con MSW, time con `vi.useFakeTimers`), no las funciones del propio módulo.
- Si tienes que mockear una función interna para que el test pase, normalmente el diseño está mal.

---

## 23. Olvidar focus management en SPAs

**Por qué es malo:** en navegación entre rutas SPA, el focus no se mueve solo. Los usuarios de teclado y screen reader se pierden.

**Alternativa:**
- Al cambiar de ruta, mueve el focus al `<h1>` de la nueva página.
- Anuncia el cambio con un `<div role="status" aria-live="polite">`.
- En modales: trampa de focus dentro + devolver focus al disparador al cerrar (Radix lo hace solo).

---

## 24. Imágenes sin dimensiones (CLS)

```html
<!-- MAL -->
<img src="/hero.jpg" alt="..." />
```

**Por qué es malo:** sin `width`/`height` o `aspect-ratio`, el navegador no reserva espacio y el layout se mueve al cargar → mal CLS.

**Alternativa:** `<img width="..." height="..." />` o CSS `aspect-ratio`, o el `<Image>` del meta-framework (Next.js, Astro) que lo gestiona.

---

## 25. Polling agresivo en lugar de WebSocket/SSE/invalidación

```tsx
// MAL
useEffect(() => {
  const id = setInterval(() => refetch(), 1000);
  return () => clearInterval(id);
}, []);
```

**Por qué es malo:** carga el backend, consume batería del cliente, escala mal.

**Alternativa:**
- **Server-Sent Events** o **WebSocket** para push real.
- **Invalidación reactiva** tras mutaciones (TanStack Query: `queryClient.invalidateQueries`).
- Polling solo si no hay alternativa, y con `refetchInterval` razonable (≥ 10 s).

---

## Reglas de oro para no caer en la lista

1. **Si te sorprendes escribiendo `useEffect`, párate y pregunta:** ¿es derivación, es fetching, es sincronización con un sistema externo? Solo el último justifica `useEffect`.
2. **Memoiza solo después de medir.**
3. **Lee la doc oficial antes de copiar un patrón viejo de Stack Overflow.** React 19 cambió muchas cosas que llevaban 8 años igual.
4. **Cualquier librería pesada (> 20 KB) tiene que pagar su sitio en el bundle.**
5. **Si un test es frágil, normalmente es el test, no el componente.**
