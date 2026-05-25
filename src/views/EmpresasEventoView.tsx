import { use, useState, useOptimistic, useActionState, Suspense, useCallback } from 'react'
import Swal from 'sweetalert2'
import {
  getEmpresas,
  getSalas,
  getTemporizadores,
  getTimersEventos,
  postTES,
  deleteTES,
} from '../services/service'
import { parseTimerInicio } from '../utils/timezone'
import { SubmitButton } from '../components/SubmitButton'
import type { Empresa, Sala, Timer, TimerEvento } from '../types'

type ViewData = [Empresa[], Sala[], Timer[], TimerEvento[]]

interface FormState {
  error: string | null
}

function EmpresasEventoContent({
  promise,
  onRefresh,
}: {
  promise: Promise<ViewData>
  onRefresh: () => void
}) {
  const [empresas, salas, timers, timerEventos] = use(promise)
  const [optimisticTE, removeOptimistic] = useOptimistic(
    timerEventos,
    (state, id: number) => state.filter((te) => te.uniqueId !== id)
  )

  const idEventos = [...new Map(timerEventos.map((te) => [te.idEvento, te])).values()]

  const formAction = useCallback(
    async (_prev: FormState, formData: FormData): Promise<FormState> => {
      const idTimer = Number(formData.get('idTimer'))
      const idEmpresa = Number(formData.get('idEmpresa'))
      const idSala = Number(formData.get('idSala'))
      const idEvento = Number(formData.get('idEvento'))

      if (!idTimer || !idEmpresa || !idSala || !idEvento)
        return { error: 'Selecciona todos los campos' }

      try {
        await postTES({ uniqueId: 0, idTimer, idEmpresa, idSala, idEvento })
        onRefresh()
        return { error: null }
      } catch {
        return { error: 'Error al crear la asignación' }
      }
    },
    [onRefresh]
  )

  const [state, dispatchForm] = useActionState(formAction, { error: null })

  const handleDelete = async (id: number) => {
    const result = await Swal.fire({
      title: '¿Eliminar asignación?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
    })
    if (!result.isConfirmed) return
    removeOptimistic(id)
    await deleteTES(id)
    onRefresh()
  }

  const selectClass = 'border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm'

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Asignaciones empresa – sala – timer</h1>

      <form action={dispatchForm} className="flex flex-col gap-3 mb-8 p-4 border rounded bg-slate-50">
        <h2 className="font-semibold">Nueva asignación</h2>
        <div className="flex gap-3 flex-wrap">
          <select name="idEmpresa" required className={selectClass} defaultValue="">
            <option value="">Empresa...</option>
            {empresas.map((e) => (
              <option key={e.idEmpresa} value={e.idEmpresa}>{e.empresa}</option>
            ))}
          </select>
          <select name="idSala" required className={selectClass} defaultValue="">
            <option value="">Sala...</option>
            {salas.map((s) => (
              <option key={s.idSala} value={s.idSala}>{s.sala}</option>
            ))}
          </select>
          <select name="idTimer" required className={selectClass} defaultValue="">
            <option value="">Timer...</option>
            {timers.map((t) => (
              <option key={t.idTemporizador} value={t.idTemporizador}>
                {parseTimerInicio(t.inicio).toFormat('dd/MM HH:mm')}
              </option>
            ))}
          </select>
          <select name="idEvento" required className={selectClass} defaultValue="">
            <option value="">Evento...</option>
            {idEventos.map((te) => (
              <option key={te.idEvento} value={te.idEvento}>{te.evento}</option>
            ))}
          </select>
          <SubmitButton label="Asignar" />
        </div>
        {state.error && <p role="alert" className="text-red-600 text-sm">{state.error}</p>}
      </form>

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-slate-100">
            <th className="text-left p-2 border">Empresa</th>
            <th className="text-left p-2 border">Sala</th>
            <th className="text-left p-2 border">Inicio</th>
            <th className="text-left p-2 border">Evento</th>
            <th className="p-2 border">Acción</th>
          </tr>
        </thead>
        <tbody>
          {optimisticTE.map((te) => (
            <tr key={te.uniqueId} className="hover:bg-slate-50">
              <td className="p-2 border">{te.empresa}</td>
              <td className="p-2 border">{te.sala}</td>
              <td className="p-2 border">{parseTimerInicio(te.inicio).toFormat('dd/MM HH:mm')}</td>
              <td className="p-2 border">{te.evento}</td>
              <td className="p-2 border text-center">
                <button onClick={() => handleDelete(te.uniqueId)} className="text-red-600 hover:underline text-xs">
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function EmpresasEventoView() {
  const [promise, setPromise] = useState<Promise<ViewData>>(
    () => Promise.all([getEmpresas(), getSalas(), getTemporizadores(), getTimersEventos()])
  )
  const refresh = () =>
    setPromise(Promise.all([getEmpresas(), getSalas(), getTemporizadores(), getTimersEventos()]))

  return (
    <Suspense fallback={<p className="p-4">Cargando datos...</p>}>
      <EmpresasEventoContent promise={promise} onRefresh={refresh} />
    </Suspense>
  )
}
