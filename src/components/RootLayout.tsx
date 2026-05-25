import { Outlet } from 'react-router-dom'
import { Menu } from './Menu'

export function RootLayout() {
  return (
    <>
      <Menu />
      <main className="p-4">
        <Outlet />
      </main>
    </>
  )
}
