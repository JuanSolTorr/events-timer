import { use, useState, useOptimistic, useActionState, Suspense, useCallback } from 'react'
import Swal from 'sweetalert2'
import { getEmpresas, postEmpresa, putEmpresa, deleteEmpresa } from '../services/service'
import { SubmitButton } from '../components/SubmitButton'
import { useAuth } from '../hooks/useAuth'
import type { Empresa } from '../types'

interface FormState {
  error: string | null
}

function EmpresasContent({
  promise,
  onRefresh,
  canEdit,
}: {
  promise: Promise<Empresa[]>
  onRefresh: () => void
  canEdit: boolean
}) {
  const empresas = use(promise)
  const [editando, setEditando] = useState<Empresa | null>(null)
  const [optimisticEmpresas, removeOptimistic] = useOptimistic(
    empresas,
    (state, id: number) => state.filter((e) => e.idEmpresa !== id)
  )

  const formAction = useCallback(
    async (_prev: FormState, formData: FormData): Promise<FormState> => {
      const nombre = (formData.get('empresa') as string).trim()
      try {
        if (editando) {
          await putEmpresa(editando.idEmpresa, nombre)
        } else {
          await postEmpresa(nombre)
        }
        setEditando(null)
        onRefresh()
        return { error: null }
      } catch {
        return { error: 'Error al guardar la empresa' }
      }
    },
    [editando, onRefresh]
  )

  const [state, dispatchForm] = useActionState(formAction, { error: null })

  const handleDelete = async (id: number, nombre: string) => {
    const result = await Swal.fire({
      title: `¿Eliminar ${nombre}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
    })
    if (!result.isConfirmed) return
    removeOptimistic(id)
    await deleteEmpresa(id)
    onRefresh()
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Empresas</h1>
      {canEdit && (
        <form action={dispatchForm} className="flex gap-3 mb-8 p-4 border rounded bg-slate-50 items-end">
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-sm font-medium">{editando ? 'Editar nombre' : 'Nueva empresa'}</label>
            <input
              key={editando?.idEmpresa ?? 'new'}
              name="empresa"
              placeholder="Nombre de la empresa"
              defaultValue={editando?.empresa ?? ''}
              required
              className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
          <SubmitButton label={editando ? 'Actualizar' : 'Crear'} />
          {editando && (
            <button type="button" onClick={() => setEditando(null)} className="px-3 py-2 border rounded hover:bg-slate-200">
              Cancelar
            </button>
          )}
          {state.error && <p role="alert" className="text-red-600 text-sm">{state.error}</p>}
        </form>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {optimisticEmpresas.map((emp) => (
          <div key={emp.idEmpresa} className="border rounded p-3 flex flex-col gap-2 bg-white">
            {emp.imagen && (
              <img
                src={emp.imagen}
                alt={`Logo de ${emp.empresa}`}
                loading="lazy"
                className="h-10 object-contain self-start"
              />
            )}
            <span className="text-sm font-medium">{emp.empresa}</span>
            {canEdit && (
              <div className="flex gap-2 text-xs">
                <button onClick={() => setEditando(emp)} className="text-blue-700 hover:underline">Editar</button>
                <button onClick={() => handleDelete(emp.idEmpresa, emp.empresa)} className="text-red-600 hover:underline">Eliminar</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export function EmpresasView() {
  const { isAuthenticated } = useAuth()
  const [promise, setPromise] = useState(() => getEmpresas())
  const refresh = () => setPromise(getEmpresas())

  return (
    <Suspense fallback={<p className="p-4">Cargando empresas...</p>}>
      <EmpresasContent promise={promise} onRefresh={refresh} canEdit={isAuthenticated} />
    </Suspense>
  )
}
