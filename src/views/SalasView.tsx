import { use, useState, useRef, useOptimistic, useActionState, Suspense, useCallback } from 'react'
import Swal from 'sweetalert2'
import { getSalas, postSala, putSala, deleteSala } from '../services/service'
import { SubmitButton } from '../components/SubmitButton'
import type { Sala } from '../types'

interface FormState {
  error: string | null
}

function SalasContent({
  promise,
  onRefresh,
}: {
  promise: Promise<Sala[]>
  onRefresh: () => void
}) {
  const salas = use(promise)
  const [editando, setEditando] = useState<Sala | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [optimisticSalas, removeOptimistic] = useOptimistic(
    salas,
    (state, id: number) => state.filter((s) => s.idSala !== id)
  )

  const abrirDialog = (sala?: Sala) => {
    setEditando(sala ?? null)
    dialogRef.current?.showModal()
  }
  const cerrarDialog = () => {
    setEditando(null)
    dialogRef.current?.close()
  }

  const formAction = useCallback(
    async (_prev: FormState, formData: FormData): Promise<FormState> => {
      const nombre = (formData.get('sala') as string).trim()
      try {
        if (editando) {
          await putSala(editando.idSala, nombre)
        } else {
          await postSala(nombre)
        }
        cerrarDialog()
        onRefresh()
        return { error: null }
      } catch {
        return { error: 'Error al guardar la sala' }
      }
    },
    [editando, onRefresh]
  )

  const [state, dispatchForm] = useActionState(formAction, { error: null })

  const handleDelete = async (id: number, nombre: string) => {
    const result = await Swal.fire({
      title: `¿Eliminar "${nombre}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
    })
    if (!result.isConfirmed) return
    removeOptimistic(id)
    await deleteSala(id)
    onRefresh()
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Salas</h1>
        <button
          onClick={() => abrirDialog()}
          className="px-4 py-2 bg-blue-700 text-white rounded hover:bg-blue-800"
        >
          + Nueva sala
        </button>
      </div>

      <ul className="flex flex-col gap-2">
        {optimisticSalas.map((sala) => (
          <li key={sala.idSala} className="flex justify-between items-center p-3 border rounded bg-white">
            <span>{sala.sala}</span>
            <div className="flex gap-3 text-sm">
              <button onClick={() => abrirDialog(sala)} className="text-blue-700 hover:underline">Editar</button>
              <button onClick={() => handleDelete(sala.idSala, sala.sala)} className="text-red-600 hover:underline">Eliminar</button>
            </div>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialogRef}
        className="rounded-lg p-6 shadow-xl w-full max-w-sm backdrop:bg-black/40"
      >
        <h2 className="font-semibold text-lg mb-4">{editando ? 'Editar sala' : 'Nueva sala'}</h2>
        <form action={dispatchForm} className="flex flex-col gap-4">
          <input
            key={editando?.idSala ?? 'new'}
            name="sala"
            placeholder="Nombre de la sala"
            defaultValue={editando?.sala ?? ''}
            required
            className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          {state.error && <p role="alert" className="text-red-600 text-sm">{state.error}</p>}
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={cerrarDialog} className="px-4 py-2 border rounded hover:bg-slate-100">
              Cancelar
            </button>
            <SubmitButton label={editando ? 'Actualizar' : 'Crear'} />
          </div>
        </form>
      </dialog>
    </div>
  )
}

export function SalasView() {
  const [promise, setPromise] = useState(() => getSalas())
  const refresh = () => setPromise(getSalas())

  return (
    <Suspense fallback={<p className="p-4">Cargando salas...</p>}>
      <SalasContent promise={promise} onRefresh={refresh} />
    </Suspense>
  )
}
