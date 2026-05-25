# PATTERNS — React 19 patterns que sí se usan en 2026

> Patrones modernos de React 19 estable. Ejemplos en TS (`.tsx`); en JS (`.jsx`) quita las anotaciones de tipo. Cada patrón resuelve un problema concreto y reemplaza un anti-patrón previo.

---

## 1. Server Component que carga datos (Next.js App Router / RR7 framework)

**Problema:** mostrar una lista de pedidos del usuario sin enviar el cliente de BD al navegador ni `useState`/`useEffect`.

```tsx
// app/(app)/orders/page.tsx — Server Component (por defecto)
import { db } from "@/lib/db";
import { Suspense } from "react";
import { OrdersList } from "./OrdersList";
import { OrdersSkeleton } from "./OrdersSkeleton";

export default async function OrdersPage() {
  return (
    <main>
      <h1>Tus pedidos</h1>
      <Suspense fallback={<OrdersSkeleton />}>
        <OrdersList />
      </Suspense>
    </main>
  );
}

// app/(app)/orders/OrdersList.tsx — también RSC
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function OrdersList() {
  const session = await auth();
  const orders = await db.order.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  if (orders.length === 0) {
    return <p>Todavía no tienes pedidos.</p>;
  }

  return (
    <ul>
      {orders.map((o) => (
        <li key={o.id}>
          {o.reference} — {o.total} €
        </li>
      ))}
    </ul>
  );
}
```

**Por qué:** cero JS al cliente para esta vista, datos cargados en servidor, Suspense da fallback durante streaming. Reemplaza el patrón `useEffect + fetch + useState + loading + error`.

---

## 2. Server Action + `useActionState` + `useFormStatus`

**Problema:** formulario que crea un recurso con validación servidor, errores accesibles y *pending state*.

```tsx
// app/(app)/orders/new/actions.ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

const NewOrderSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().int().positive().max(100),
  note: z.string().max(280).optional(),
});

export type NewOrderState =
  | { status: "idle" }
  | { status: "error"; errors: Record<string, string> }
  | { status: "success" };

export async function createOrder(
  _prev: NewOrderState,
  formData: FormData
): Promise<NewOrderState> {
  const session = await auth();
  if (!session) return { status: "error", errors: { _form: "No autenticado" } };

  const raw = Object.fromEntries(formData);
  const parsed = NewOrderSchema.safeParse(raw);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      errors[issue.path.join(".")] = issue.message;
    }
    return { status: "error", errors };
  }

  await db.order.create({
    data: { ...parsed.data, userId: session.userId },
  });

  revalidatePath("/orders");
  redirect("/orders");
}
```

```tsx
// app/(app)/orders/new/NewOrderForm.tsx
"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createOrder, type NewOrderState } from "./actions";

const initialState: NewOrderState = { status: "idle" };

export function NewOrderForm() {
  const [state, formAction] = useActionState(createOrder, initialState);
  const hasErrors = state.status === "error";

  return (
    <form action={formAction} noValidate>
      <fieldset>
        <legend>Nuevo pedido</legend>

        <label htmlFor="productId">Producto</label>
        <input
          id="productId"
          name="productId"
          required
          aria-invalid={hasErrors && !!state.errors.productId}
          aria-describedby={hasErrors && state.errors.productId ? "err-productId" : undefined}
        />
        {hasErrors && state.errors.productId && (
          <p id="err-productId" role="alert">{state.errors.productId}</p>
        )}

        <label htmlFor="quantity">Cantidad</label>
        <input
          id="quantity"
          name="quantity"
          type="number"
          min={1}
          max={100}
          required
          aria-invalid={hasErrors && !!state.errors.quantity}
          aria-describedby={hasErrors && state.errors.quantity ? "err-quantity" : undefined}
        />
        {hasErrors && state.errors.quantity && (
          <p id="err-quantity" role="alert">{state.errors.quantity}</p>
        )}

        <SubmitButton />

        {hasErrors && state.errors._form && (
          <p role="alert">{state.errors._form}</p>
        )}
      </fieldset>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending}>
      {pending ? "Creando…" : "Crear pedido"}
    </button>
  );
}
```

**Por qué:** la mutación vive en el servidor (sin endpoint custom), validación con Zod, errores tipados y accesibles, *pending state* nativo. Funciona con JS desactivado en frameworks que lo soporten.

---

## 3. `useOptimistic` para UI optimista

**Problema:** marcar una tarea como completada con feedback inmediato; revertir si falla el servidor.

```tsx
"use client";

import { useOptimistic, useTransition } from "react";
import { toggleTodo } from "./actions";

type Todo = { id: string; text: string; done: boolean };

export function TodoList({ todos }: { todos: Todo[] }) {
  const [optimisticTodos, setOptimisticTodos] = useOptimistic(
    todos,
    (state, toggledId: string) =>
      state.map((t) => (t.id === toggledId ? { ...t, done: !t.done } : t))
  );
  const [isPending, startTransition] = useTransition();

  return (
    <ul>
      {optimisticTodos.map((t) => (
        <li key={t.id}>
          <label>
            <input
              type="checkbox"
              checked={t.done}
              onChange={() => {
                startTransition(async () => {
                  setOptimisticTodos(t.id);
                  await toggleTodo(t.id);
                });
              }}
            />
            <span style={{ textDecoration: t.done ? "line-through" : "none" }}>
              {t.text}
            </span>
          </label>
        </li>
      ))}
    </ul>
  );
}
```

**Por qué:** percepción de respuesta inmediata sin sacrificar la verdad del servidor. Si la acción falla, React revierte al estado real.

---

## 4. `use()` para leer una promesa o un contexto en render

**Problema:** leer un valor asíncrono o un contexto sin `useEffect`.

```tsx
"use client";

import { use, Suspense } from "react";

type Profile = { name: string; avatarUrl: string };

function ProfileCard({ profilePromise }: { profilePromise: Promise<Profile> }) {
  const profile = use(profilePromise); // suspende hasta que resuelve

  return (
    <article>
      <img src={profile.avatarUrl} alt="" width={64} height={64} />
      <p>{profile.name}</p>
    </article>
  );
}

export function ProfileSection({ profilePromise }: { profilePromise: Promise<Profile> }) {
  return (
    <Suspense fallback={<p role="status">Cargando perfil…</p>}>
      <ProfileCard profilePromise={profilePromise} />
    </Suspense>
  );
}
```

**Por qué:** `use()` permite leer promesas dentro del render. La promesa la crea el padre (típicamente un Server Component que la pasa como prop al cliente). Cero `useEffect` para datos.

---

## 5. `ref` como prop (sin `forwardRef`)

```tsx
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({ ref, children, ...props }: ButtonProps & { ref?: React.Ref<HTMLButtonElement> }) {
  return (
    <button ref={ref} {...props}>
      {children}
    </button>
  );
}

// Uso
const buttonRef = useRef<HTMLButtonElement>(null);
<Button ref={buttonRef}>Guardar</Button>;
```

**Por qué:** `forwardRef` queda como código legacy. En componentes nuevos, `ref` es una prop más.

---

## 6. Document metadata nativa

```tsx
// En cualquier componente, RSC o cliente
export function ProductPage({ product }: { product: Product }) {
  return (
    <>
      <title>{`${product.name} — Tienda`}</title>
      <meta name="description" content={product.shortDescription} />
      <link rel="canonical" href={`https://example.com/p/${product.slug}`} />

      <article>
        <h1>{product.name}</h1>
        {/* … */}
      </article>
    </>
  );
}
```

**Por qué:** React 19 sube estos elementos al `<head>` automáticamente. Reemplaza `react-helmet` en casi todos los casos.

---

## 7. Stylesheets con `precedence` y scripts deduplicados

```tsx
export function ChartCard() {
  return (
    <>
      <link rel="stylesheet" href="/css/chart.css" precedence="medium" />
      <script async src="https://cdn.example.com/analytics.js" />
      {/* React deduplica si otro componente importa el mismo src */}
      <div className="chart">{/* … */}</div>
    </>
  );
}
```

**Por qué:** orden determinístico de estilos y deduplicación nativa de scripts externos. Sin trucos.

---

## 8. Suspense + ErrorBoundary alrededor de carga asíncrona

```tsx
"use client";

import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { OrdersList } from "./OrdersList";
import { OrdersSkeleton } from "./OrdersSkeleton";

export function OrdersSection() {
  return (
    <ErrorBoundary
      fallbackRender={({ error, resetErrorBoundary }) => (
        <div role="alert">
          <p>No pudimos cargar tus pedidos: {error.message}</p>
          <button onClick={resetErrorBoundary}>Reintentar</button>
        </div>
      )}
    >
      <Suspense fallback={<OrdersSkeleton />}>
        <OrdersList />
      </Suspense>
    </ErrorBoundary>
  );
}
```

**Por qué:** estado de carga y de error tratados como parte del diseño, no como excepciones.

---

## 9. TanStack Query para datos en cliente

```tsx
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

type Order = { id: string; reference: string; total: number };

async function fetchOrders(): Promise<Order[]> {
  const res = await fetch("/api/orders");
  if (!res.ok) throw new Error("No se pudieron obtener pedidos");
  return res.json();
}

export function OrdersTable() {
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["orders"],
    queryFn: fetchOrders,
    staleTime: 30_000,
  });

  if (isPending) return <p role="status">Cargando…</p>;
  if (isError) {
    return (
      <div role="alert">
        <p>{error.message}</p>
        <button onClick={() => refetch()}>Reintentar</button>
      </div>
    );
  }

  return (
    <table>
      <caption>Tus pedidos</caption>
      <thead>
        <tr>
          <th scope="col">Referencia</th>
          <th scope="col">Total</th>
        </tr>
      </thead>
      <tbody>
        {data.map((o) => (
          <tr key={o.id}>
            <td>{o.reference}</td>
            <td>{o.total.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

**Por qué:** caché, revalidación, `isPending`/`isError` tipados, mutaciones con invalidación clara. Reemplaza el patrón manual `useState + useEffect + fetch`.

---

## 10. React Hook Form + Zod (form complejo en cliente)

```tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const Schema = z.object({
  name: z.string().min(1, "Obligatorio").max(80),
  email: z.string().email("Email inválido"),
  age: z.coerce.number().int().min(18, "Debes ser mayor de edad").max(120),
});
type FormValues = z.infer<typeof Schema>;

export function ProfileForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(Schema) });

  const onSubmit = async (values: FormValues) => {
    // POST a una API o llamada a Server Action
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <label htmlFor="name">Nombre</label>
      <input id="name" {...register("name")} aria-invalid={!!errors.name} aria-describedby={errors.name ? "err-name" : undefined} />
      {errors.name && <p id="err-name" role="alert">{errors.name.message}</p>}

      <label htmlFor="email">Email</label>
      <input id="email" type="email" autoComplete="email" {...register("email")} aria-invalid={!!errors.email} aria-describedby={errors.email ? "err-email" : undefined} />
      {errors.email && <p id="err-email" role="alert">{errors.email.message}</p>}

      <label htmlFor="age">Edad</label>
      <input id="age" type="number" inputMode="numeric" {...register("age")} aria-invalid={!!errors.age} aria-describedby={errors.age ? "err-age" : undefined} />
      {errors.age && <p id="err-age" role="alert">{errors.age.message}</p>}

      <button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
        {isSubmitting ? "Guardando…" : "Guardar"}
      </button>
    </form>
  );
}
```

**Por qué:** validación tipada con un único schema (cliente y servidor), errores accesibles, *autocomplete* nativo, `inputMode` correcto en móvil.

---

## 11. `useId` para asociar label con input

```tsx
import { useId } from "react";

export function PasswordField({ label }: { label: string }) {
  const id = useId();
  const helpId = `${id}-help`;
  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <input id={id} type="password" autoComplete="new-password" aria-describedby={helpId} />
      <p id={helpId}>Mínimo 12 caracteres, mezcla letras, números y símbolos.</p>
    </div>
  );
}
```

**Por qué:** ids únicos sin colisiones, asociación correcta para screen readers.

---

## 12. `useTransition` y `useDeferredValue` (mantener INP bajo)

```tsx
"use client";

import { useDeferredValue, useState, useTransition } from "react";

export function SearchableList({ items }: { items: string[] }) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query); // no bloquea la entrada del usuario
  const [isPending, startTransition] = useTransition();
  const [filtered, setFiltered] = useState(items);

  function onSearch(value: string) {
    setQuery(value);
    startTransition(() => {
      setFiltered(items.filter((i) => i.toLowerCase().includes(value.toLowerCase())));
    });
  }

  return (
    <div aria-busy={isPending}>
      <label htmlFor="q">Buscar</label>
      <input id="q" value={query} onChange={(e) => onSearch(e.target.value)} />
      <ul>{filtered.map((item) => <li key={item}>{item}</li>)}</ul>
      <p aria-live="polite">{deferredQuery && `${filtered.length} resultados`}</p>
    </div>
  );
}
```

**Por qué:** el usuario sigue escribiendo sin lag aunque el filtrado sea caro. INP estable.

---

## 13. Lazy code splitting

```tsx
import { lazy, Suspense } from "react";

const HeavyChart = lazy(() => import("./HeavyChart"));

export function Dashboard() {
  return (
    <>
      <h1>Panel</h1>
      <Suspense fallback={<div role="status">Cargando gráfico…</div>}>
        <HeavyChart />
      </Suspense>
    </>
  );
}
```

**Por qué:** mantener el bundle inicial pequeño; cargar componentes pesados solo cuando se necesitan.

---

## 14. Custom hook con estado modelado por unión discriminada

```tsx
"use client";

import { useEffect, useState } from "react";

type State<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: Error };

export function useSubscription<T>(
  subscribe: (onMessage: (data: T) => void, onError: (e: Error) => void) => () => void
) {
  const [state, setState] = useState<State<T>>({ status: "idle" });

  useEffect(() => {
    setState({ status: "loading" });
    const unsub = subscribe(
      (data) => setState({ status: "success", data }),
      (error) => setState({ status: "error", error })
    );
    return unsub;
  }, [subscribe]);

  return state;
}
```

**Por qué:** estados imposibles imposibles. El consumidor hace `switch` exhaustivo y TypeScript estrecha automáticamente.

---

## 15. Composición: pasar contenido en vez de configurar

```tsx
// ❌ Anti-patrón: muchas props de configuración
<Modal title="Guardar" body="¿Seguro?" cancelText="No" confirmText="Sí" />

// ✅ Composición
<Modal>
  <Modal.Title>Guardar</Modal.Title>
  <Modal.Body>¿Seguro?</Modal.Body>
  <Modal.Actions>
    <Button variant="ghost">No</Button>
    <Button variant="primary">Sí</Button>
  </Modal.Actions>
</Modal>
```

**Por qué:** flexibilidad sin explosión de props; ARIA correcto en cada subcomponente; el consumidor compone.

---

## 16. Streaming SSR con Suspense (Next.js App Router)

```tsx
// app/page.tsx — RSC
import { Suspense } from "react";
import { HeroSection } from "./HeroSection";        // rápido, render directo
import { RecommendedProducts } from "./Recommended"; // lento, espera DB
import { ProductsSkeleton } from "./ProductsSkeleton";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <Suspense fallback={<ProductsSkeleton />}>
        <RecommendedProducts />
      </Suspense>
    </>
  );
}
```

**Por qué:** el LCP no espera al endpoint más lento; el usuario ve la hero inmediatamente y el resto llega vía streaming.

---

## 17. Astro con isla React solo donde hace falta

```astro
---
// src/pages/index.astro
import Layout from "../layouts/Layout.astro";
import CounterIsland from "../components/CounterIsland.tsx";
const products = await loadProducts();
---
<Layout title="Catálogo">
  <h1>Productos</h1>
  <ul>
    {products.map((p) => <li>{p.name}</li>)}
  </ul>

  <CounterIsland client:idle initial={0} />
</Layout>
```

**Por qué:** página estática casi entera; solo el contador se hidrata como React en *idle*. JS al cliente mínimo.

---

## Referencia rápida de hooks React 19

| Hook | Para qué | Cuándo evitar |
|---|---|---|
| `useState` | Estado local | Datos de servidor, formularios complejos |
| `useReducer` | Estado complejo local con transiciones | Si un `useState` basta |
| `useEffect` | Sincronización con sistemas externos | Para cargar datos al montar |
| `useLayoutEffect` | Medir DOM antes de pintar | Si `useEffect` funciona |
| `useRef` | Acceso imperativo a DOM o valor mutable | Para estado que afecta al render |
| `useId` | IDs estables únicos | IDs hardcoded |
| `useTransition` | Marcar updates no urgentes | Updates síncronos prioritarios |
| `useDeferredValue` | Diferir un valor caro | Cuando no hay cálculo caro derivado |
| `useSyncExternalStore` | Suscribirse a store externo | Estado puramente local |
| `use(promise)` | Leer promesa en render | Side effects sin sincronización |
| `use(context)` | Leer contexto (puede ser condicional) | Si `useContext` ya está y funciona |
| `useActionState` | Estado de acción de formulario | Forms sin server action |
| `useFormStatus` | Pending state de form padre | Fuera de un `<form>` |
| `useOptimistic` | UI optimista durante mutación | Mutaciones que requieren confirmación visible |
