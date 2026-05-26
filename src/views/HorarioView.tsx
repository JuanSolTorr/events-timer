import { Suspense, use } from 'react'
import {
  getCategorias,
  getEmpresas,
  getSalas,
  getTES,
  getTemporizadores,
} from '../services/service'
import { HorarioActualEmpresaPopUp } from '../components/HorarioActualEmpresaPopUp'
import { parseTimerInicio } from '../utils/timezone'
import type { Categoria, Empresa, Sala, TiempoEmpresaSala, Timer } from '../types'

const horarioPromise = Promise.all([
  getSalas(),
  getTemporizadores(),
  getCategorias(),
  getEmpresas(),
  getTES(),
])

function isDescanso(nombre: string): boolean {
  return nombre.toLowerCase().includes('descanso')
}

function HorarioContent() {
  const [salas, timers, categorias, empresas, tes] = use(horarioPromise) as [
    Sala[],
    Timer[],
    Categoria[],
    Empresa[],
    TiempoEmpresaSala[],
  ]

  const categoriasById = new Map(categorias.map((c) => [c.idCategoria, c]))
  const empresasById = new Map(empresas.map((e) => [e.idEmpresa, e]))
  const timersOrdenados = [...timers].sort(
    (a, b) => parseTimerInicio(a.inicio).toMillis() - parseTimerInicio(b.inicio).toMillis()
  )

  const asignacionesPorSala = new Map<number, Map<number, number>>()
  tes.forEach((registro) => {
    if (!asignacionesPorSala.has(registro.idSala)) {
      asignacionesPorSala.set(registro.idSala, new Map())
    }
    asignacionesPorSala.get(registro.idSala)!.set(registro.idTimer, registro.idEmpresa)
  })

  return (
    <div className="max-w-5xl mx-auto p-6 text-[var(--color-text)]">
      {salas.map((sala) => (
        <section key={sala.idSala} className="mb-8">
          <h2 className="text-xl font-semibold border-b pb-2 mb-4">{sala.sala}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-[var(--color-surface-muted)]">
                  <th className="text-left p-2 border border-[var(--color-border-subtle)]">Hora</th>
                  <th className="text-left p-2 border border-[var(--color-border-subtle)]">Empresa</th>
                  <th className="text-left p-2 border border-[var(--color-border-subtle)]">Categoría</th>
                  <th className="p-2 border border-[var(--color-border-subtle)]">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {timersOrdenados.map((timer) => {
                  const categoria = categoriasById.get(timer.idCategoria)
                  const nombreCategoria = categoria?.categoria ?? 'Sin categoria'
                  const idEmpresa = asignacionesPorSala.get(sala.idSala)?.get(timer.idTemporizador)
                  const empresa = idEmpresa ? empresasById.get(idEmpresa) : null
                  const esDescanso = !empresa && isDescanso(nombreCategoria)
                  const nombreEmpresa = empresa?.empresa ?? (esDescanso ? nombreCategoria : 'Sin asignar')

                  return (
                    <tr key={`${sala.idSala}-${timer.idTemporizador}`} className="hover:bg-[var(--color-surface-muted)]">
                      <td className="p-2 border border-[var(--color-border-subtle)]">
                        {parseTimerInicio(timer.inicio).toFormat('HH:mm')}
                      </td>
                      <td className="p-2 border border-[var(--color-border-subtle)]">{nombreEmpresa}</td>
                      <td className="p-2 border border-[var(--color-border-subtle)]">{nombreCategoria}</td>
                      <td className="p-2 border border-[var(--color-border-subtle)] text-center">
                        {empresa ? (
                          <HorarioActualEmpresaPopUp
                            idEmpresa={empresa.idEmpresa}
                            nombreEmpresa={empresa.empresa}
                          />
                        ) : (
                          <span className="text-xs text-[var(--color-text-muted)]">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  )
}

export function HorarioView() {
  return (
    <Suspense fallback={<p className="p-4">Cargando horario...</p>}>
      <HorarioContent />
    </Suspense>
  )
}
