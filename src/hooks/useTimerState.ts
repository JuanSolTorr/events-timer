import { use } from 'react'
import { TimerContext } from '../context/TimerContext'

export function useTimerState() {
  const ctx = use(TimerContext)
  if (!ctx) {
    throw new Error('useTimerState debe usarse dentro de <TimerProvider>')
  }
  return ctx
}
