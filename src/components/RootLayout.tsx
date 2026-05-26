import { Outlet } from 'react-router-dom'
import { Menu } from './Menu'

export function RootLayout() {
  return (
    <>
      <Menu />
      <main className="p-4 pt-20 min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
        <Outlet />
      </main>
    </>
  )
}
