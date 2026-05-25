import { NavLink } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function Menu() {
  const { isAuthenticated, logout } = useAuth()

  return (
    <nav className="bg-slate-900 text-white px-4 py-3 flex flex-wrap items-center gap-4">
      <NavLink to="/" className="font-bold text-lg hover:text-blue-400">
        Timers Tajamar
      </NavLink>
      {isAuthenticated && (
        <>
          <div className="flex flex-wrap gap-3 text-sm">
            <NavLink to="/horario"        className={({ isActive }) => isActive ? 'text-blue-400' : 'hover:text-blue-400'}>Horario</NavLink>
            <NavLink to="/salas"          className={({ isActive }) => isActive ? 'text-blue-400' : 'hover:text-blue-400'}>Salas</NavLink>
            <NavLink to="/empresas"       className={({ isActive }) => isActive ? 'text-blue-400' : 'hover:text-blue-400'}>Empresas</NavLink>
            <NavLink to="/categorias"     className={({ isActive }) => isActive ? 'text-blue-400' : 'hover:text-blue-400'}>Categorías</NavLink>
            <NavLink to="/temporizadores" className={({ isActive }) => isActive ? 'text-blue-400' : 'hover:text-blue-400'}>Temporizadores</NavLink>
            <NavLink to="/empresastimersnew" className={({ isActive }) => isActive ? 'text-blue-400' : 'hover:text-blue-400'}>Asignaciones</NavLink>
          </div>
          <button
            onClick={logout}
            className="ml-auto px-3 py-1 border border-white rounded text-sm hover:bg-white hover:text-slate-900"
          >
            Salir
          </button>
        </>
      )}
    </nav>
  )
}
