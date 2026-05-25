# Code Review — Dev A Changes (Phases 0–4)

**Date:** 2026-05-25
**Reviewer:** Senior Code Quality Agent (orchestrated by Principal Staff Engineer)
**Scope:** All source changes introduced by Dev A across phases 0 through 4, covering infrastructure setup, service layer, context layer, and CRUD views.
**Branch reviewed:** `diego`

---

## Summary Table

| # | Severity | File | One-line Description |
|---|----------|------|----------------------|
| 1 | CRITICAL | `src/context/TimerContext.tsx:27` | Socket listeners lost after re-login — timer UI dead for the rest of the session |
| 2 | HIGH | `src/views/TemporizadoresView.tsx:20` | `esFechaFutura` ignores timezone — comparison wrong for non-Madrid users |
| 3 | HIGH | `src/views/CategoriasView.tsx:62` | Optimistic delete has no rollback — item vanishes permanently on API failure |
| 4 | HIGH | `src/views/EmpresasEventoView.tsx:34` | Events dropdown chicken-and-egg — impossible to create first TES assignment |
| 5 | MEDIUM | `src/services/httpClient.ts:22` | 401 handler: wrong navigation + no socket cleanup + double error propagation |
| 6 | MEDIUM | `src/views/LoginView.tsx:44` | `handleIncrement` Promise discarded silently — no user feedback on failure |
| 7 | MEDIUM | `src/services/service.ts:20` | `generateToken` generic doesn't coerce response shape — stores `[object Object]` |
| 8 | LOW | `src/index.css:1` | `overflow:hidden` removed from body — may cause unwanted body-level scrollbar |
| 9 | LOW | `src/views/EmpresasEventoView.tsx:47` | `!idEvento` rejects valid `id=0` — falsy check too broad |
| 10 | LOW | `src/services/authService.ts:21` | No JWT expiry check — expired token passes `ProtectedRoute` on page load |

---

## Findings

---

### Finding 1 — CRITICAL

**`[CRITICAL]`** `src/context/TimerContext.tsx:27`

**Title:** Socket listeners lost after re-login

**Description:**
`useEffect([])` runs exactly once when `TimerProvider` first mounts. On logout, `disconnectSocket()` nulls the socket singleton. On re-login, `getSocket()` creates a fresh socket instance — but `TimerProvider` never unmounts and remounts, so the effect never re-runs. The new socket instance never receives the `timerID` and `envio` listeners. As a result, the entire timer countdown UI is dead for the remainder of the browser session without a full page reload.

**Failure scenario:**
1. User logs in — timer works.
2. User logs out — `disconnectSocket()` nulls the singleton.
3. User logs in again — new socket is created internally, but `TimerProvider` is already mounted and its `useEffect` has already run. The `timerID` and `envio` event handlers are never attached to the new socket.
4. Timer view shows no updates. Session is broken until hard refresh.

**Suggested fix:**
Add the socket instance (or a stable identity token from it) to the `useEffect` dependency array. When logout nulls the singleton and login creates a new one, trigger a context-level reconnect that re-registers all listeners. Alternatively, unmount `TimerProvider` on logout (e.g., by rendering it conditionally inside the authenticated route tree) so React remounts it naturally on re-login.

---

### Finding 2 — HIGH

**`[HIGH]`** `src/views/TemporizadoresView.tsx:20`

**Title:** `esFechaFutura` ignores timezone

**Description:**
`DateTime.fromISO(value)` parses the ISO string using the browser's local timezone. `ahora()` returns a `DateTime` in `Europe/Madrid`. When both values are compared, a user in UTC+0 or UTC+2 during DST will get a result offset by one or two hours relative to the Madrid reference, causing timers to be shown as active when they have expired, or as expired when they have not started yet.

**Failure scenario:**
A timer scheduled for `2026-05-25T22:00:00` Madrid time is parsed by a browser in UTC as `2026-05-25T22:00:00Z` (equivalent to `2026-05-26T00:00:00` Madrid time). `esFechaFutura` incorrectly evaluates to `true` two hours after the timer has already started.

**Suggested fix:**
```ts
DateTime.fromISO(value, { zone: TIMEZONE })
```
Pass `{ zone: TIMEZONE }` (where `TIMEZONE = 'Europe/Madrid'`) as the second argument so parsing always anchors to the application's reference timezone, regardless of the browser's local setting.

---

### Finding 3 — HIGH

**`[HIGH]`** `src/views/CategoriasView.tsx:62` (same pattern in all 5 CRUD views)

**Title:** Optimistic delete has no rollback

**Description:**
`removeOptimistic(id)` is called synchronously before `await deleteXxx(id)`. If the API call throws — network error, 500, 403 — the item has already been removed from local state. There is no try/catch to restore the item, nor any mechanism to re-fetch on failure. The user sees the item disappear permanently and must reload the page to recover it.

**Failure scenario:**
1. User clicks delete on a category.
2. `removeOptimistic(id)` fires — category vanishes from the list.
3. `deleteCategoria(id)` throws a 500.
4. No error boundary or catch block restores state.
5. Category is gone from the UI; still exists in the DB. User has no way to know without reloading.

**Suggested fix:**
Capture the current list before the optimistic update, then restore it in a `catch` block:
```ts
const snapshot = [...items];
removeOptimistic(id);
try {
  await deleteXxx(id);
} catch (err) {
  setItems(snapshot);
  showErrorToast('No se pudo eliminar el elemento.');
}
```
Apply this pattern consistently across all five CRUD views.

---

### Finding 4 — HIGH

**`[HIGH]`** `src/views/EmpresasEventoView.tsx:34`

**Title:** Events dropdown chicken-and-egg on fresh database

**Description:**
The events dropdown is populated from `timerEventos`, which is the result of a join query on the TES (timer-empresa-subevento) table. On a fresh database with zero TES rows, `timerEventos` returns an empty array, so the dropdown is always empty. Form validation then always fails because no event can be selected — making it impossible to create the very first TES assignment, even when events exist in the events table.

**Failure scenario:**
Fresh environment setup: events are seeded, empresas are seeded, but no TES rows exist yet. Operator opens `EmpresasEventoView`, attempts to create the first assignment, finds the events dropdown empty, cannot proceed. The only workaround is a direct DB insert.

**Suggested fix:**
Populate the events dropdown from the raw events table (not from the TES join result). The TES join result should only be used to pre-populate or filter the form when editing an existing assignment, not when creating a new one.

---

### Finding 5 — MEDIUM

**`[MEDIUM]`** `src/services/httpClient.ts:22`

**Title:** 401 handler: wrong navigation + no socket cleanup + double error propagation

**Description:**
Three independent problems exist in the same 401 interceptor:

1. `window.location.href = '/login'` triggers a full page reload. This bypasses React Router's navigation stack, loses all in-memory application state, and prevents any graceful teardown logic from running.
2. `disconnectSocket()` is not called before redirect. The stale socket connection lingers until the browser unloads the page, potentially receiving and attempting to process events against an unauthenticated session.
3. `Promise.reject(error)` is still returned after the redirect is initiated. The calling code's `catch` block fires concurrently with the navigation, producing a misleading error toast or console error that the user sees for a fraction of a second before the page reloads.

**Suggested fix:**
Replace `window.location.href` with React Router's `navigate('/login')` (inject the router navigate function into the interceptor via a module-level ref or a small helper). Call `disconnectSocket()` before navigating. Return a never-resolving Promise (or swallow the rejection) so the caller's catch does not also fire:
```ts
disconnectSocket();
navigate('/login');
return new Promise(() => {}); // intentionally never resolves
```

---

### Finding 6 — MEDIUM

**`[MEDIUM]`** `src/views/LoginView.tsx:44`

**Title:** `handleIncrement` Promise discarded silently

**Description:**
The `onClick` handler is `() => handleIncrement(1)`. `handleIncrement` is an `async` function that calls `updateIncreaseTimers`. The returned Promise is discarded — no `await`, no `.catch()`. If `updateIncreaseTimers` rejects (network error, validation failure, 500), the error is swallowed silently. The user clicks the "+1 min" button and nothing happens with no indication of failure.

**Failure scenario:**
Network drops momentarily. User clicks "+1 min". `updateIncreaseTimers` throws. React sees an unhandled Promise rejection (may appear in the browser console but not in the UI). User is left with no feedback.

**Suggested fix:**
```ts
onClick={() => {
  handleIncrement(1).catch((err) => {
    showErrorToast('No se pudo añadir tiempo. Inténtalo de nuevo.');
    console.error(err);
  });
}}
```
Or, if the component already has an error boundary, ensure `handleIncrement` re-throws so the boundary catches it.

---

### Finding 7 — MEDIUM

**`[MEDIUM]`** `src/services/service.ts:20`

**Title:** `generateToken` generic doesn't coerce response shape

**Description:**
`httpClient.post<string>('Auth/Login', credentials)` applies the `<string>` generic at compile time only — TypeScript erases it at runtime. Axios returns whatever the API actually sends. If the API returns `{ "token": "eyJ..." }`, then `data` at runtime is a plain object. `localStorage.setItem(TOKEN_KEY, token)` stores the string `"[object Object]"`. Every subsequent API call then sends `Authorization: Bearer [object Object]`, causing all authenticated requests to fail with 401.

**Failure scenario:**
Login appears to succeed (no error thrown). User is redirected to the admin panel. First API call returns 401. User is redirected back to login. The cycle repeats indefinitely because the broken token is re-read and re-sent on every attempt.

**Suggested fix:**
Define a typed response interface and extract the token explicitly:
```ts
interface LoginResponse { token: string; }
const { data } = await httpClient.post<LoginResponse>('Auth/Login', credentials);
localStorage.setItem(TOKEN_KEY, data.token);
```

---

### Finding 8 — LOW

**`[LOW]`** `src/index.css:1`

**Title:** `overflow:hidden` removed from body

**Description:**
The previous codebase set `body { overflow: hidden }` to prevent the root element from scrolling independently of the admin layout shell. The new `index.css` only contains Tailwind `@theme` token declarations. Tailwind's preflight resets `margin` and `padding` on body but does not reset `overflow`. Without the explicit `overflow: hidden`, any content overflow in the admin layout may cause an unwanted vertical scrollbar on the `<body>` element itself, breaking the intended fixed-chrome layout.

**Suggested fix:**
Add an explicit body overflow rule back to `index.css`:
```css
body {
  overflow: hidden;
}
```
Or apply the equivalent Tailwind utility to the root layout component: `<body className="overflow-hidden">`.

---

### Finding 9 — LOW

**`[LOW]`** `src/views/EmpresasEventoView.tsx:47`

**Title:** `!idEvento` rejects valid `id=0`

**Description:**
The validation guard uses `!idEvento` to check whether an event has been selected. JavaScript's `!` operator evaluates `0` as falsy. If any event in the database has `idEvento = 0` (zero-indexed primary key, legacy data, or a future schema change), the form will refuse to submit with "Selecciona todos los campos" even though the user has made a valid selection.

**Suggested fix:**
Use an explicit null/undefined check:
```ts
if (idEvento === null || idEvento === undefined) { ... }
```
Or, if the field is always a number after selection:
```ts
if (idEvento == null) { ... }
```

---

### Finding 10 — LOW

**`[LOW]`** `src/services/authService.ts:21`

**Title:** No JWT expiry check in `isAuthenticated`

**Description:**
`isAuthenticated()` returns `true` as long as a token string exists in `localStorage`. It does not decode the JWT or check the `exp` claim. A user with a valid-looking but expired token will pass `ProtectedRoute` on page load. The admin panel renders briefly (flash of authenticated content), then the first API call returns 401 and the interceptor redirects to `/login`. This produces a poor UX and a potential information-disclosure flash of protected UI.

**Suggested fix:**
Decode the JWT payload (without a library, using `atob` on the second Base64 segment) and compare `exp` against `Date.now() / 1000`:
```ts
function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp < Date.now() / 1000;
  } catch {
    return true; // malformed token → treat as expired
  }
}

export function isAuthenticated(): boolean {
  const token = localStorage.getItem(TOKEN_KEY);
  return !!token && !isTokenExpired(token);
}
```

---

## Integration Risk Summary

The three CRITICAL and HIGH findings that carry the highest cross-team risk before Dev B and Dev C begin their phases are:

**Finding 1 (CRITICAL — socket re-registration)** must be resolved before any developer touches the timer view or real-time event logic. Dev B or Dev C building on top of an unreliable socket lifecycle will produce bugs that are extremely difficult to attribute and reproduce.

**Finding 7 (MEDIUM escalated — token storage)** is a silent breakage point. If the API returns an object rather than a bare string, every authenticated session is broken from the moment of login. This should be confirmed against the real API contract immediately — if the API already returns a bare string, the risk is low; if it returns an object, it is effectively CRITICAL.

**Finding 3 (HIGH — optimistic delete without rollback)** affects all five CRUD views that Dev B or Dev C may extend. Adding rollback logic after those views have been forked or extended will require coordinated changes across multiple branches. Fix before the branch split, not after.

Findings 2, 4, and 5 are also recommended for resolution before integration, as they affect date-sensitive filtering, onboarding flows on fresh environments, and session teardown — all of which will surface immediately during any cross-phase integration testing.

---

*This document was produced by the Senior Code Quality Agent as part of the engineering quality gate for phases 0–4. No source files were modified. All line numbers reference the state of branch `diego` as of 2026-05-25.*
