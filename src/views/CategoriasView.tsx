import { use, useState, useOptimistic, useActionState, Suspense, useCallback } from 'react'
import Swal from 'sweetalert2'
import { getCategorias, postCategoria, putCategoria, deleteCategoria } from '../services/service'
import { SubmitButton } from '../components/SubmitButton'
import type { Categoria } from '../types'

interface FormState {
  error: string | null
}

function CategoriasContent({
  promise,
  onRefresh,
}: {
  promise: Promise<Categoria[]>
  onRefresh: () => void
}) {
  const categorias = use(promise)
  const [editando, setEditando] = useState<Categoria | null>(null)
  const [optimisticCats, removeOptimistic] = useOptimistic(
    categorias,
    (state, id: number) => state.filter((c) => c.idCategoria !== id)
  )

  const formAction = useCallback(
    async (_prev: FormState, formData: FormData): Promise<FormState> => {
      const nombre = (formData.get('categoria') as string).trim()
      const duracion = Number(formData.get('duracion'))

      const duplicado = categorias.some(
        (c) => c.categoria.toLowerCase() === nombre.toLowerCase() && c.idCategoria !== editando?.idCategoria
      )
      if (duplicado) return { error: 'Ya existe una categoría con ese nombre' }

      try {
        if (editando) {
          await putCategoria({ ...editando, categoria: nombre, duracion })
        } else {
          await postCategoria({ categoria: nombre, duracion })
        }
        setEditando(null)
        onRefresh()
        return { error: null }
      } catch {
        return { error: 'Error al guardar la categoría' }
      }
    },
    [categorias, editando, onRefresh]
  )

  const [state, dispatchForm] = useActionState(formAction, { error: null })

  const handleDelete = async (id: number) => {
    const result = await Swal.fire({
      title: '¿Eliminar categoría?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
    })
    if (!result.isConfirmed) return
    removeOptimistic(id)
    await deleteCategoria(id)
    onRefresh()
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Categorías de timer</h1>

      <form action={dispatchForm} className="flex flex-col gap-3 mb-8 p-4 border rounded bg-slate-50">
        <h2 className="font-semibold">{editando ? 'Editar categoría' : 'Nueva categoría'}</h2>
        <div className="flex gap-3">
          <input
            key={editando?.idCategoria ?? 'new'}
            name="categoria"
            placeholder="Nombre"
            defaultValue={editando?.categoria ?? ''}
            required
            className="flex-1 border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          <input
            name="duracion"
            type="number"
            placeholder="Minutos"
            min={1}
            defaultValue={editando?.duracion ?? ''}
            required
            className="w-28 border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          <SubmitButton label={editando ? 'Actualizar' : 'Crear'} />
          {editando && (
            <button type="button" onClick={() => setEditando(null)} className="px-3 py-2 border rounded hover:bg-slate-200">
              Cancelar
            </button>
          )}
        </div>
        {state.error && <p role="alert" className="text-red-600 text-sm">{state.error}</p>}
      </form>

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-slate-100">
            <th className="text-left p-2 border">Nombre</th>
            <th className="text-left p-2 border">Duración (min)</th>
            <th className="p-2 border">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {optimisticCats.map((cat) => (
            <tr key={cat.idCategoria} className="hover:bg-slate-50">
              <td className="p-2 border">{cat.categoria}</td>
              <td className="p-2 border">{cat.duracion}</td>
              <td className="p-2 border text-center">
                <button onClick={() => setEditando(cat)} className="text-blue-700 hover:underline mr-3 text-xs">Editar</button>
                <button onClick={() => handleDelete(cat.idCategoria)} className="text-red-600 hover:underline text-xs">Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function CategoriasView() {
  const [promise, setPromise] = useState(() => getCategorias())
  const refresh = () => setPromise(getCategorias())

  return (
    <Suspense fallback={<p className="p-4">Cargando categorías...</p>}>
      <CategoriasContent promise={promise} onRefresh={refresh} />
    </Suspense>
  )
}
