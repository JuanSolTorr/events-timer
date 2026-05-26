import { use, useState, useRef, useOptimistic, useActionState, Suspense, useCallback } from 'react'
import { DateTime } from 'luxon'
import Swal from 'sweetalert2'
import {
  getTemporizadores,
  getCategorias,
  postTemporizador,
  putTemporizador,
  deleteTemporizador,
} from '../services/service'
import { ahora, parseTimerInicio } from '../utils/timezone'
import { SubmitButton } from '../components/SubmitButton'
import { useAuth } from '../hooks/useAuth'
import type { Timer, Categoria } from '../types'

interface FormState {
  error: string | null
}

function esFechaFutura(value: string): boolean {
  return DateTime.fromISO(value) > ahora()
}

function formatInicio(isoString: string): string {
  return parseTimerInicio(isoString).toFormat('dd/MM/yyyy HH:mm')
}

function TemporizadoresContent({
  promise,
  onRefresh,
  canEdit,
}: {
  promise: Promise<[Timer[], Categoria[]]>
  onRefresh: () => void
  canEdit: boolean
}) {
  const [timers, categorias] = use(promise)
  const [editando, setEditando] = useState<Timer | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [optimisticTimers, removeOptimistic] = useOptimistic(
    [...timers].sort((a, b) =>
      parseTimerInicio(a.inicio) < parseTimerInicio(b.inicio) ? -1 : 1
    ),
    (state, id: number) => state.filter((t) => t.idTemporizador !== id)
  )

  const formAction = useCallback(
    async (_prev: FormState, formData: FormData): Promise<FormState> => {
      if (!editando) return { error: 'Selecciona un temporizador para editar' }
      const fecha = formData.get('fecha') as string
      const hora = formData.get('hora') as string
      const inicio = `${fecha}T${hora}`
      const idCategoria = Number(formData.get('idCategoria'))

      if (!esFechaFutura(inicio)) return { error: 'La fecha de inicio debe ser futura' }

      try {
        await putTemporizador({ ...editando, inicio, idCategoria })
        setEditando(null)
        dialogRef.current?.close()
        onRefresh()
        return { error: null }
      } catch {
        return { error: 'Error al guardar el temporizador' }
      }
    },
    [editando, onRefresh]
  )

  const [state, dispatchForm] = useActionState(formAction, { error: null })

  const handleDelete = async (id: number) => {
    const result = await Swal.fire({
      title: '¿Eliminar temporizador?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
    })
    if (!result.isConfirmed) return
    removeOptimistic(id)
    await deleteTemporizador(id)
    setEditando(null)
    dialogRef.current?.close()
    onRefresh()
  }

  const defaultFecha = editando
    ? parseTimerInicio(editando.inicio).toFormat('yyyy-MM-dd')
    : ''
  const defaultHora = editando
    ? parseTimerInicio(editando.inicio).toFormat('HH:mm')
    : ''

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Temporizadores</h1>
      {canEdit && (
        <dialog
          ref={dialogRef}
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg p-6 shadow-xl w-full max-w-md backdrop:bg-black/40"
        >
          <h2 className="text-xl font-semibold mb-4">Modificar temporizador</h2>
          <form action={dispatchForm} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Fecha de inicio</label>
              <input
                key={`${editando?.idTemporizador ?? 'edit'}-fecha`}
                name="fecha"
                type="date"
                defaultValue={defaultFecha}
                required
                className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Hora de inicio</label>
              <input
                key={`${editando?.idTemporizador ?? 'edit'}-hora`}
                name="hora"
                type="time"
                defaultValue={defaultHora}
                required
                className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Categoría</label>
              <select
                name="idCategoria"
                defaultValue={editando?.idCategoria ?? ''}
                required
                className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="">Categoría...</option>
                {categorias.map((cat) => (
                  <option key={cat.idCategoria} value={cat.idCategoria}>
                    {cat.categoria} ({cat.duracion} min)
                  </option>
                ))}
              </select>
            </div>
            {state.error && <p role="alert" className="text-red-600 text-sm">{state.error}</p>}
            <div className="flex flex-wrap gap-3 justify-between">
              <button
                type="button"
                onClick={() => editando && handleDelete(editando.idTemporizador)}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Eliminar temporizador
              </button>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditando(null)
                    dialogRef.current?.close()
                  }}
                  className="px-4 py-2 border rounded hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <SubmitButton label="Guardar temporizador" />
              </div>
            </div>
          </form>
        </dialog>
      )}

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-slate-100">
            <th className="text-left p-2 border">Inicio</th>
            <th className="text-left p-2 border">Categoría</th>
            <th className="text-left p-2 border">Pausa</th>
            {canEdit && <th className="p-2 border">Acciones</th>}
          </tr>
        </thead>
        <tbody>
          {optimisticTimers.map((timer) => {
            const cat = categorias.find((c) => c.idCategoria === timer.idCategoria)
            return (
              <tr key={timer.idTemporizador} className="hover:bg-slate-50">
                <td className="p-2 border">{formatInicio(timer.inicio)}</td>
                <td className="p-2 border">{cat?.categoria ?? timer.idCategoria}</td>
                <td className="p-2 border">{timer.pausa ? 'Sí' : 'No'}</td>
                {canEdit && (
                  <td className="p-2 border text-center">
                  <button
                    onClick={() => {
                      setEditando(timer)
                      dialogRef.current?.showModal()
                    }}
                    className="text-blue-700 hover:underline text-xs"
                  >
                    Modificar
                  </button>
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function TemporizadoresView() {
  const { isAuthenticated } = useAuth()
  const [promise, setPromise] = useState<Promise<[Timer[], Categoria[]]>>(
    () => Promise.all([getTemporizadores(), getCategorias()])
  )
  const refresh = () => setPromise(Promise.all([getTemporizadores(), getCategorias()]))

  return (
    <Suspense fallback={<p className="p-4">Cargando temporizadores...</p>}>
      <TemporizadoresContent promise={promise} onRefresh={refresh} canEdit={isAuthenticated} />
    </Suspense>
  )
}
