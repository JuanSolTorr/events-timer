# Fase 5 — Vista publica del countdown (TimerView)

> Duracion estimada: 1.5 jornadas
> Prerequisito: Fase 3 completada (TimerContext con datos del socket disponible).
> Paralelizable con: Fase 4 si hay dos desarrolladores.

---

## Criterio de entrada

- `useTimerState()` esta disponible y el socket recibe `timerID` y `envio` del sync server.
- `src/services/service.ts` tiene `getSalas()`, `getTimersEventos()`, `findTimersActualesEmpresa()`.
- `src/utils/timezone.ts` existe con `parseTimerInicio` y `ahora()`.

## Criterio de salida

- [ ] El countdown actualiza cada segundo en tiempo real cuando el sync server emite `timerID` y `envio`.
- [ ] El componente `Tiempo` muestra el numero en rojo cuando `secondsRemaining <= 60`.
- [ ] El selector de sala filtra correctamente la empresa que se muestra.
- [ ] La vista `/` es accesible sin autenticacion (no redirige a `/login`).
- [ ] La vista `/horario` carga la agenda de timers por sala.
- [ ] `npm run build` pasa sin errores.

---

## Utilidades previas a crear

### formatTime.ts

Crear `src/utils/formatTime.ts` antes de los componentes porque `Tiempo.tsx` lo importa:

```typescript
// src/utils/formatTime.ts

/**
 * Convierte segundos a formato "MM:SS".
 * - Valores negativos o cero devuelven "00:00".
 * - Valores > 3599 devuelven "59:59" (cap a 59 minutos 59 segundos).
 *
 * Esta funcion es pura (sin efectos secundarios) y testeable de forma aislada.
 */
export function formatTime(totalSeconds: number): string {
  if (totalSeconds <= 0) return '00:00'
  const capped = Math.min(totalSeconds, 3599)
  const minutes = Math.floor(capped / 60)
  const seconds = capped % 60
  const mm = String(minutes).padStart(2, '0')
  const ss = String(seconds).padStart(2, '0')
  return `${mm}:${ss}`
}
```

---

## Componente 5.1 — Tiempo (`src/components/Tiempo.tsx`)

Componente de display puro. Recibe los segundos, formatea y cambia el color cuando queda poco tiempo.

- Recibe `secondsRemaining: number` por props.
- Usa `formatTime` de `src/utils/formatTime.ts`.
- Muestra el texto en rojo cuando `secondsRemaining <= 60` y en verde el resto del tiempo.
- Muestra `00:00` cuando `secondsRemaining <= 0`.
- Incluye `aria-live="polite"` para que los lectores de pantalla anuncien los cambios (aunque esta vista es principalmente visual).

```typescript
// src/components/Tiempo.tsx
import { formatTime } from '../utils/formatTime'

interface TiempoProps {
  secondsRemaining: number
  warningThreshold?: number   // defecto: 60 segundos
}

export function Tiempo({
  secondsRemaining,
  warningThreshold = 60,
}: TiempoProps) {
  const isWarning = secondsRemaining > 0 && secondsRemaining <= warningThreshold
  const color = isWarning ? '#dc3545' : '#198754'   // Bootstrap danger / success

  return (
    <div
      aria-live="polite"
      aria-label={`Tiempo restante: ${formatTime(secondsRemaining)}`}
      style={{
        fontFamily: 'monospace',
        fontSize: '4rem',
        fontWeight: 'bold',
        color,
        lineHeight: 1,
      }}
    >
      {formatTime(secondsRemaining)}
    </div>
  )
}
```

---

## Componente 5.2 — HorarioActualEmpresaPopUp (`src/components/HorarioActualEmpresaPopUp.tsx`)

Popup que muestra los 2 proximos turnos de una empresa. Se abre desde la vista Horario al hacer clic en una empresa.

- Recibe `idEmpresa: number` y `nombreEmpresa: string` por props.
- Llama a `findTimersActualesEmpresa(idEmpresa)` cuando se abre (lazy: no antes).
- Usa `<dialog>` nativo para el popup (accesible por defecto).
- Muestra la hora de inicio formateada con Luxon en zona `Europe/Madrid`.

```typescript
// src/components/HorarioActualEmpresaPopUp.tsx
import { useRef, useState, use, Suspense } from 'react'
import { findTimersActualesEmpresa } from '../services/service'
import { parseTimerInicio } from '../utils/timezone'
import type { TimerEvento } from '../types'

interface Props {
  idEmpresa: number
  nombreEmpresa: string
}

export function HorarioActualEmpresaPopUp({ idEmpresa, nombreEmpresa }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [promise, setPromise] = useState<Promise<TimerEvento[]> | null>(null)

  function abrir() {
    setPromise(findTimersActualesEmpresa(idEmpresa))
    dialogRef.current?.showModal()
  }

  function cerrar() {
    dialogRef.current?.close()
    setPromise(null)
  }

  return (
    <>
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        onClick={abrir}
      >
        Ver turnos
      </button>

      <dialog ref={dialogRef} style={{ minWidth: '320px' }}>
        <h2 className="h5">{nombreEmpresa}</h2>
        {promise && (
          <Suspense fallback={<p>Cargando...</p>}>
            <TurnosList promise={promise} />
          </Suspense>
        )}
        <button
          type="button"
          className="btn btn-sm btn-secondary mt-2"
          onClick={cerrar}
        >
          Cerrar
        </button>
      </dialog>
    </>
  )
}

function TurnosList({ promise }: { promise: Promise<TimerEvento[]> }) {
  const turnos = use(promise)

  if (turnos.length === 0) {
    return <p>No hay turnos proximos para esta empresa.</p>
  }

  return (
    <ul className="list-group">
      {turnos.map((t) => (
        <li key={t.uniqueId} className="list-group-item">
          <strong>{t.sala}</strong> —{' '}
          {parseTimerInicio(t.inicio).toFormat('HH:mm')} ({t.categoria})
        </li>
      ))}
    </ul>
  )
}
```

---

## Vista 5.3 — HorarioView (`src/views/HorarioView.tsx`)

Agenda de timers por sala. Vista protegida (requiere autenticacion).

Funcionalidad:
- Carga todos los `TimerEvento[]` con `getTimersEventos()`.
- Agrupa los eventos por sala.
- Para cada sala, muestra la lista de empresas ordenadas por hora de inicio.
- Cada empresa tiene un boton que abre `HorarioActualEmpresaPopUp`.
- Muestra la hora de inicio formateada con `parseTimerInicio(t.inicio).toFormat('HH:mm')`.

```typescript
// src/views/HorarioView.tsx
import { use, Suspense } from 'react'
import { getTimersEventos } from '../services/service'
import { HorarioActualEmpresaPopUp } from '../components/HorarioActualEmpresaPopUp'
import { parseTimerInicio } from '../utils/timezone'
import type { TimerEvento } from '../types'

const eventosPromise = getTimersEventos()

function HorarioContent() {
  const eventos = use(eventosPromise)

  // Agrupa por sala
  const porSala = eventos.reduce<Record<string, TimerEvento[]>>((acc, ev) => {
    if (!acc[ev.sala]) acc[ev.sala] = []
    acc[ev.sala].push(ev)
    return acc
  }, {})

  // Ordena cada sala por hora de inicio
  Object.values(porSala).forEach((lista) =>
    lista.sort(
      (a, b) =>
        parseTimerInicio(a.inicio).toMillis() -
        parseTimerInicio(b.inicio).toMillis()
    )
  )

  return (
    <div className="container mt-4">
      {Object.entries(porSala).map(([sala, turnosSala]) => (
        <section key={sala} className="mb-4">
          <h2 className="h4 border-bottom pb-1">{sala}</h2>
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Hora</th>
                <th>Empresa</th>
                <th>Categoria</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {turnosSala.map((t) => (
                <tr key={t.uniqueId}>
                  <td>{parseTimerInicio(t.inicio).toFormat('HH:mm')}</td>
                  <td>{t.empresa}</td>
                  <td>{t.categoria}</td>
                  <td>
                    <HorarioActualEmpresaPopUp
                      idEmpresa={t.idEmpresa}
                      nombreEmpresa={t.empresa}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  )
}

export function HorarioView() {
  return (
    <>
      <title>Horario — Timers Tajamar</title>
      <Suspense fallback={<p className="p-4">Cargando horario...</p>}>
        <HorarioContent />
      </Suspense>
    </>
  )
}
```

---

## Vista 5.4 — TimerView (`src/views/TimerView.tsx`)

Vista principal que ven los asistentes al foro en pantalla grande. Es la unica vista publica (no requiere autenticacion).

Funcionalidad:
- Consume `useTimerState()` para `currentTimerId` y `secondsRemaining`.
- Selector de sala: `<select>` que llama a `setSelectedSalaId` del contexto.
- Filtra los `TimerEvento[]` por `selectedSalaId` y `currentTimerId` para obtener la empresa actual.
- Muestra: logo de empresa + nombre + sala seleccionada.
- Muestra el componente `Tiempo` con los segundos restantes.
- Muestra los proximos 2 turnos de la sala seleccionada (filtro local sobre `TimerEvento[]`).
- La sala seleccionada se persiste en la URL como `?sala=2` usando `useSearchParams`, para que al recargar la pagina se mantenga la seleccion.
- Disenado para pantalla completa: tipografia grande, fondo oscuro, contraste alto.

```typescript
// src/views/TimerView.tsx
import { use, Suspense } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getSalas, getTimersEventos } from '../services/service'
import { useTimerState } from '../hooks/useTimerState'
import { Tiempo } from '../components/Tiempo'
import { parseTimerInicio, ahora } from '../utils/timezone'
import type { Sala, TimerEvento } from '../types'

const salasPromise = getSalas()
const eventosPromise = getTimersEventos()

function TimerContent() {
  const salas = use(salasPromise)
  const eventos = use(eventosPromise)
  const { currentTimerId, secondsRemaining, selectedSalaId, setSelectedSalaId } =
    useTimerState()
  const [searchParams, setSearchParams] = useSearchParams()

  // Leer sala de la URL al montar
  const salaIdFromUrl = searchParams.get('sala')
    ? Number(searchParams.get('sala'))
    : null

  // Usar la URL como fuente de verdad si el contexto no tiene sala seleccionada
  const salaActiva = selectedSalaId ?? salaIdFromUrl ?? null

  function handleSalaChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = Number(e.target.value) || null
    setSelectedSalaId(id)
    setSearchParams(id ? { sala: String(id) } : {})
  }

  // Empresa actualmente en pantalla
  const eventoActual = eventos.find(
    (ev) =>
      ev.idSala === salaActiva &&
      ev.idTimer === currentTimerId
  ) ?? null

  // Proximos 2 turnos de la sala seleccionada (excluyendo el actual)
  const proximos = eventos
    .filter(
      (ev) =>
        ev.idSala === salaActiva &&
        ev.idTimer !== currentTimerId &&
        !parseTimerInicio(ev.inicio).plus({ minutes: ev.duracion }).isBefore(ahora())
    )
    .sort(
      (a, b) =>
        parseTimerInicio(a.inicio).toMillis() -
        parseTimerInicio(b.inicio).toMillis()
    )
    .slice(0, 2)

  return (
    <div
      className="d-flex flex-column align-items-center justify-content-center vh-100 bg-dark text-white"
      style={{ gap: '2rem' }}
    >
      <title>Timers en directo — Foro de Empleo Tajamar</title>

      {/* Selector de sala */}
      <div>
        <label htmlFor="sala-select" className="form-label text-white">
          Sala:
        </label>
        <select
          id="sala-select"
          className="form-select"
          value={salaActiva ?? ''}
          onChange={handleSalaChange}
        >
          <option value="">-- Selecciona una sala --</option>
          {salas.map((s: Sala) => (
            <option key={s.idSala} value={s.idSala}>
              {s.sala}
            </option>
          ))}
        </select>
      </div>

      {/* Empresa actual */}
      {eventoActual ? (
        <div className="text-center">
          {eventoActual.imagen && (
            <img
              src={eventoActual.imagen}
              alt={`Logo de ${eventoActual.empresa}`}
              style={{ maxHeight: '120px', objectFit: 'contain' }}
              loading="lazy"
            />
          )}
          <h1 className="display-4 mt-2">{eventoActual.empresa}</h1>
          <p className="lead">{eventoActual.sala}</p>
        </div>
      ) : (
        <p className="lead">
          {salaActiva ? 'Sin turno activo' : 'Selecciona una sala'}
        </p>
      )}

      {/* Countdown */}
      <Tiempo secondsRemaining={secondsRemaining} />

      {/* Proximos turnos */}
      {proximos.length > 0 && (
        <div className="text-center">
          <h2 className="h5 text-secondary">Proximos turnos</h2>
          <ul className="list-unstyled">
            {proximos.map((t) => (
              <li key={t.uniqueId}>
                {parseTimerInicio(t.inicio).toFormat('HH:mm')} — {t.empresa}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export function TimerView() {
  return (
    <Suspense
      fallback={
        <div className="d-flex align-items-center justify-content-center vh-100 bg-dark text-white">
          Cargando...
        </div>
      }
    >
      <TimerContent />
    </Suspense>
  )
}
```

---

## Verificacion final

```bash
npm run build   # sin errores
npm run dev
```

Prueba manual:

1. Ir a `http://localhost:5173` sin autenticarse: debe cargar la vista con el selector de sala.
2. Seleccionar una sala: la URL cambia a `?sala=N`.
3. Recargar la pagina: la sala sigue seleccionada (se lee de la URL).
4. Verificar que el componente `Tiempo` muestra `00:00` cuando no hay countdown activo.
5. Si el sync server esta accesible: emitir `vamos` desde la vista de Login autenticada y verificar que el countdown actualiza en tiempo real en la TimerView abierta en otra pestana.
6. En el ultimo minuto de un timer: el numero del countdown debe cambiar de verde a rojo.

---

## Al cerrar la fase

```bash
git add src/views/TimerView.tsx src/views/HorarioView.tsx \
        src/components/Tiempo.tsx src/components/HorarioActualEmpresaPopUp.tsx \
        src/utils/formatTime.ts
git commit -m "fase-5: TimerView publica, Tiempo, HorarioView, HorarioActualEmpresaPopUp"
git tag v0.5-timerview
```
