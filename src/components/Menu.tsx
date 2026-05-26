import { useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function Menu() {
  const { isAuthenticated, logout } = useAuth()
  useEffect(() => {
    document.documentElement.dataset.theme = ''
    try {
      localStorage.removeItem('theme')
    } catch {
      // Ignore storage errors
    }
  }, [])

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[var(--color-border-subtle)] bg-[linear-gradient(115deg,var(--color-surface),var(--color-surface-muted))] text-[var(--color-text)]">
      <div className="mx-auto flex flex-wrap items-center gap-3 px-4 py-3">
        <NavLink to="/" className="flex items-center gap-2 font-bold text-lg">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--color-link)] text-white text-sm">TT</span>
          <span className="tracking-wide">Timers Tajamar</span>
        </NavLink>
      <div className="flex flex-wrap gap-2 text-sm">
        <NavLink to="/" className={({ isActive }) => isActive ? 'rounded-full bg-[var(--color-link)] px-3 py-1 text-white' : 'rounded-full border border-[var(--color-border-subtle)] px-3 py-1 hover:bg-[var(--color-surface-muted)]'}>Cuenta atrás</NavLink>
        <NavLink to="/horario" className={({ isActive }) => isActive ? 'rounded-full bg-[var(--color-link)] px-3 py-1 text-white' : 'rounded-full border border-[var(--color-border-subtle)] px-3 py-1 hover:bg-[var(--color-surface-muted)]'}>Horario</NavLink>
        <NavLink to="/salas" className={({ isActive }) => isActive ? 'rounded-full bg-[var(--color-link)] px-3 py-1 text-white' : 'rounded-full border border-[var(--color-border-subtle)] px-3 py-1 hover:bg-[var(--color-surface-muted)]'}>Salas</NavLink>
        <NavLink to="/empresas" className={({ isActive }) => isActive ? 'rounded-full bg-[var(--color-link)] px-3 py-1 text-white' : 'rounded-full border border-[var(--color-border-subtle)] px-3 py-1 hover:bg-[var(--color-surface-muted)]'}>Empresas</NavLink>
        <NavLink to="/categorias" className={({ isActive }) => isActive ? 'rounded-full bg-[var(--color-link)] px-3 py-1 text-white' : 'rounded-full border border-[var(--color-border-subtle)] px-3 py-1 hover:bg-[var(--color-surface-muted)]'}>Categorías</NavLink>
        {isAuthenticated && (
          <NavLink to="/temporizadores" className={({ isActive }) => isActive ? 'rounded-full bg-[var(--color-link)] px-3 py-1 text-white' : 'rounded-full border border-[var(--color-border-subtle)] px-3 py-1 hover:bg-[var(--color-surface-muted)]'}>Temporizadores</NavLink>
        )}
        <NavLink to="/empresastimersnew" className={({ isActive }) => isActive ? 'rounded-full bg-[var(--color-link)] px-3 py-1 text-white' : 'rounded-full border border-[var(--color-border-subtle)] px-3 py-1 hover:bg-[var(--color-surface-muted)]'}>Seguimiento Empresas</NavLink>
        <NavLink to="/login" className={({ isActive }) => isActive ? 'rounded-full bg-[var(--color-link)] px-3 py-1 text-white' : 'rounded-full border border-[var(--color-border-subtle)] px-3 py-1 hover:bg-[var(--color-surface-muted)]'}>Administrador</NavLink>
      </div>
      <div className="flex-1" />
      {isAuthenticated && (
        <button
          onClick={logout}
          className="rounded-full border border-[var(--color-border-subtle)] px-3 py-1 text-sm hover:bg-[var(--color-surface-muted)]"
        >
          Salir
        </button>
      )}
      </div>
    </nav>
  )
}
