import { useActionState, useTransition, useEffect, useCallback } from 'react'
import Swal from 'sweetalert2'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getSocket } from '../services/socketClient'
import { updateIncreaseTimers } from '../services/service'
import { SubmitButton } from '../components/SubmitButton'

interface LoginState {
  error: string | null
}

export function LoginView() {
  const { isAuthenticated, login } = useAuth()
  const navigate = useNavigate()
  const [startPending, startTransition] = useTransition()

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true })
  }, [isAuthenticated, navigate])

  const loginAction = useCallback(
    async (_prev: LoginState, formData: FormData): Promise<LoginState> => {
      try {
        await login({
          userName: formData.get('userName') as string,
          password: formData.get('password') as string,
        })
        return { error: null }
      } catch {
        return { error: 'Usuario o contraseña incorrectos' }
      }
    },
    [login]
  )

  const [state, formAction] = useActionState(loginAction, { error: null })

  const handleIniciarEvento = () => {
    startTransition(() => {
      getSocket().emit('vamos')
    })
  }

  const handleIncrement = async (minutes: number) => {
    try {
      await updateIncreaseTimers(minutes)
      Swal.fire({
        icon: 'success',
        title: 'Timers ajustados',
        text: `Se han desplazado ${minutes} minutos.`,
        timer: 1200,
        showConfirmButton: false,
      })
    } catch {
      Swal.fire({
        icon: 'error',
        title: 'No se pudo ajustar',
        text: 'Revisa la sesión y vuelve a intentarlo.',
      })
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-16">
      <h1 className="text-2xl font-bold mb-6">Acceso administrador</h1>

      {!isAuthenticated && (
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="userName" className="text-sm font-medium">Usuario</label>
            <input
              id="userName"
              name="userName"
              type="text"
              required
              className="border border-slate-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-sm font-medium">Contraseña</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="border border-slate-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
          {state.error && (
            <p role="alert" className="text-red-600 text-sm">{state.error}</p>
          )}
          <SubmitButton label="Entrar" labelPending="Entrando..." />
        </form>
      )}

      {isAuthenticated && (
        <div className="flex flex-col gap-4 mt-4">
          <button
            onClick={handleIniciarEvento}
            disabled={startPending}
            className="px-4 py-3 bg-green-700 text-white rounded font-bold hover:bg-green-800 disabled:opacity-50"
          >
            {startPending ? 'Iniciando...' : '▶ Iniciar Evento (Vamos)'}
          </button>

          <div className="flex gap-2">
            <button
              onClick={() => handleIncrement(1)}
              className="flex-1 px-3 py-2 bg-slate-200 rounded hover:bg-slate-300 text-sm"
            >
              +1 min
            </button>
            <button
              onClick={() => handleIncrement(5)}
              className="flex-1 px-3 py-2 bg-slate-200 rounded hover:bg-slate-300 text-sm"
            >
              +5 min
            </button>
            <button
              onClick={() => handleIncrement(-1)}
              className="flex-1 px-3 py-2 bg-slate-200 rounded hover:bg-slate-300 text-sm"
            >
              -1 min
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
