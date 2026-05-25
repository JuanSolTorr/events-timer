/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import { getSocket } from '../services/socketClient'

interface TimerContextValue {
  currentTimerId: number | null
  secondsRemaining: number
  isRunning: boolean
  selectedSalaId: number | null
  setSelectedSalaId: (id: number | null) => void
}

export const TimerContext = createContext<TimerContextValue | null>(null)

export function TimerProvider({ children }: { children: ReactNode }) {
  const [currentTimerId, setCurrentTimerId] = useState<number | null>(null)
  const [secondsRemaining, setSecondsRemaining] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [selectedSalaId, setSelectedSalaId] = useState<number | null>(null)

  useEffect(() => {
    const socket = getSocket()

    const handleTimerId = (id: number) => {
      setCurrentTimerId(id)
      setIsRunning(true)
    }

    const handleEnvio = (seconds: number) => {
      setSecondsRemaining(seconds)
      if (seconds <= 0) setIsRunning(false)
    }

    socket.on('timerID', handleTimerId)
    socket.on('envio', handleEnvio)

    return () => {
      socket.off('timerID', handleTimerId)
      socket.off('envio', handleEnvio)
    }
  }, [])

  const handleSetSelectedSala = useCallback((id: number | null) => {
    setSelectedSalaId(id)
  }, [])

  return (
    <TimerContext.Provider
      value={{
        currentTimerId,
        secondsRemaining,
        isRunning,
        selectedSalaId,
        setSelectedSalaId: handleSetSelectedSala,
      }}
    >
      {children}
    </TimerContext.Provider>
  )
}
