import { createBrowserRouter, Navigate } from 'react-router-dom'
import { RootLayout } from '../components/RootLayout'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { TimerView } from '../views/TimerView'
import { LoginView } from '../views/LoginView'
import { HorarioView } from '../views/HorarioView'
import { SalasView } from '../views/SalasView'
import { EmpresasView } from '../views/EmpresasView'
import { CategoriasView } from '../views/CategoriasView'
import { TemporizadoresView } from '../views/TemporizadoresView'
import { EmpresasEventoView } from '../views/EmpresasEventoView'

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/', element: <TimerView /> },
      { path: '/login', element: <LoginView /> },
      {
        element: <ProtectedRoute />,
        children: [
          { path: '/horario',           element: <HorarioView /> },
          { path: '/salas',             element: <SalasView /> },
          { path: '/empresas',          element: <EmpresasView /> },
          { path: '/categorias',        element: <CategoriasView /> },
          { path: '/temporizadores',    element: <TemporizadoresView /> },
          { path: '/empresastimersnew', element: <EmpresasEventoView /> },
        ],
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
