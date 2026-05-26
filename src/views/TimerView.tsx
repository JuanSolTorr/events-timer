import { Suspense, use, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getSalas, getTimersEventos } from '../services/service'
import { useTimerState } from '../hooks/useTimerState'
import { Tiempo } from '../components/Tiempo'
import { parseTimerInicio, ahora } from '../utils/timezone'
import type { Sala, TimerEvento } from '../types'

const salasPromise = getSalas()
const eventosPromise = getTimersEventos()

function parseSalaParam(value: string | null): number | null {
  if (!value) return null
  const num = Number(value)
  return Number.isFinite(num) && num > 0 ? num : null
}

function sortByInicio(a: TimerEvento, b: TimerEvento): number {
  return parseTimerInicio(a.inicio).toMillis() - parseTimerInicio(b.inicio).toMillis()
}

function TimerContent() {
  const salas = use(salasPromise)
  const eventos = use(eventosPromise)
  const { currentTimerId, secondsRemaining, selectedSalaId, setSelectedSalaId } =
    useTimerState()
  const [searchParams, setSearchParams] = useSearchParams()

  const urlSalaId = parseSalaParam(searchParams.get('sala'))
  const fallbackSalaId = salas[0]?.idSala ?? null
  const salaActiva = selectedSalaId ?? urlSalaId ?? fallbackSalaId
  const salaInfo = salaActiva ? salas.find((s) => s.idSala === salaActiva) : null

  useEffect(() => {
    if (salaActiva !== null && salaActiva !== selectedSalaId) {
      setSelectedSalaId(salaActiva)
    }
  }, [salaActiva, selectedSalaId, setSelectedSalaId])

  useEffect(() => {
    if (salaActiva !== null && urlSalaId !== salaActiva) {
      setSearchParams({ sala: String(salaActiva) }, { replace: true })
    }
  }, [salaActiva, urlSalaId, setSearchParams])

  const eventosSala = salaActiva ? eventos.filter((e) => e.idSala === salaActiva) : []
  const eventoActual = currentTimerId
    ? eventosSala.find((e) => e.idTimer === currentTimerId)
    : null

  const eventosSalaOrdenados = eventosSala.slice().sort(sortByInicio)
  const currentIndex = currentTimerId
    ? eventosSalaOrdenados.findIndex((e) => e.idTimer === currentTimerId)
    : -1
  const proximosTurnos = currentIndex >= 0
    ? eventosSalaOrdenados.slice(currentIndex + 1, currentIndex + 3)
    : eventosSalaOrdenados.slice(0, 2)

  return (
    <div className="min-h-screen bg-[var(--color-display-bg)] text-[var(--color-display-text)] px-6 py-8">
      <header className="max-w-5xl mx-auto mb-8 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-sm uppercase tracking-widest text-[var(--color-display-muted)]">
            Temporizador en vivo
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold">
            {salaInfo?.sala ?? 'Selecciona sala'}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <label htmlFor="sala" className="text-sm text-[var(--color-display-muted)]">
            Sala activa
          </label>
          <select
            id="sala"
            value={salaActiva ?? ''}
            onChange={(e) => {
              const next = Number(e.target.value) || null
              setSelectedSalaId(next)
              if (next) setSearchParams({ sala: String(next) }, { replace: true })
            }}
            className="bg-[var(--color-display-surface)] border border-[var(--color-border-subtle)] rounded px-3 py-2 text-sm"
          >
            <option value="" disabled>
              Selecciona una sala
            </option>
            {salas.map((s: Sala) => (
              <option key={s.idSala} value={s.idSala}>
                {s.sala}
              </option>
            ))}
          </select>
        </div>
      </header>

      <main className="max-w-5xl mx-auto grid gap-8 lg:grid-cols-[2fr,1fr]">
        <section className="bg-[var(--color-display-surface)] rounded-2xl p-6 shadow-lg">
          {eventoActual ? (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                <div className="flex items-center gap-4">
                  {eventoActual.imagen ? (
                    <img
                      src={eventoActual.imagen}
                      alt={`Logo de ${eventoActual.empresa}`}
                      className="h-16 w-16 rounded-full object-cover border border-[var(--color-border-subtle)]"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-[var(--color-surface-muted)] border border-[var(--color-border-subtle)]" />
                  )}
                  <div>
                    <p className="text-sm text-[var(--color-display-muted)]">Empresa actual</p>
                    <h2 className="text-2xl font-semibold">{eventoActual.empresa}</h2>
                    <p className="text-sm text-[var(--color-display-muted)]">{eventoActual.categoria}</p>
                  </div>
                </div>
                <Tiempo secondsRemaining={secondsRemaining} />
              </div>
              <div className="text-sm text-[var(--color-display-muted)]">
                Inicio programado:{' '}
                {parseTimerInicio(eventoActual.inicio).toFormat('HH:mm')}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 py-12">
              <p className="text-lg text-[var(--color-display-muted)]">Esperando al siguiente timer...</p>
              <Tiempo secondsRemaining={secondsRemaining} />
            </div>
          )}
        </section>

        <aside className="bg-[var(--color-display-surface)] rounded-2xl p-6 shadow-lg">
          <h3 className="text-lg font-semibold mb-4">Próximos turnos</h3>
          {proximosTurnos.length === 0 ? (
            <p className="text-sm text-[var(--color-display-muted)]">No hay turnos programados.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {proximosTurnos.map((t) => (
                <div key={t.uniqueId} className="border-b border-[var(--color-border-subtle)] pb-3">
                  <div className="text-sm text-[var(--color-display-muted)]">
                    {parseTimerInicio(t.inicio).toFormat('HH:mm')}
                  </div>
                  <div className="text-base font-semibold">{t.empresa}</div>
                  <div className="text-sm text-[var(--color-display-muted)]">{t.categoria}</div>
                </div>
              ))}
            </div>
          )}
        </aside>
      </main>
    </div>
  )
}

export function TimerView() {
  return (
    <Suspense fallback={<p className="p-6">Cargando timer...</p>}>
      <TimerContent />
    </Suspense>
  )
}
