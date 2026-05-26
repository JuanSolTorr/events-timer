import { useRef, useState, use, Suspense } from 'react'
import { findTimersActualesEmpresa } from '../services/service'
import { parseTimerInicio } from '../utils/timezone'
import type { TimerEvento } from '../types'

interface HorarioActualEmpresaPopUpProps {
  idEmpresa: number
  nombreEmpresa: string
}

export function HorarioActualEmpresaPopUp({
  idEmpresa,
  nombreEmpresa,
}: HorarioActualEmpresaPopUpProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [promise, setPromise] = useState<Promise<TimerEvento[]> | null>(null)

  const abrir = () => {
    setPromise(findTimersActualesEmpresa(idEmpresa))
    dialogRef.current?.showModal()
  }

  const cerrar = () => {
    dialogRef.current?.close()
    setPromise(null)
  }

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        className="px-2 py-1 text-xs border border-slate-300 rounded hover:bg-slate-100"
      >
        Ver turnos
      </button>

      <dialog
        ref={dialogRef}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg p-4 backdrop:bg-black/40 min-w-[320px]"
      >
        <h2 className="text-lg font-semibold mb-2">{nombreEmpresa}</h2>
        {promise && (
          <Suspense fallback={<p className="text-sm">Cargando...</p>}>
            <TurnosList promise={promise} />
          </Suspense>
        )}
        <button
          type="button"
          onClick={cerrar}
          className="mt-4 px-3 py-1 text-sm border rounded hover:bg-slate-100"
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
    return <p className="text-sm text-slate-600">No hay turnos próximos.</p>
  }

  return (
    <ul className="space-y-2">
      {turnos.map((t) => (
        <li key={t.uniqueId} className="text-sm">
          <strong>{t.sala}</strong> — {parseTimerInicio(t.inicio).toFormat('HH:mm')}{' '}
          <span className="text-slate-500">({t.categoria})</span>
        </li>
      ))}
    </ul>
  )
}
