import { formatTime } from '../utils/formatTime'

interface TiempoProps {
  secondsRemaining: number
  warningThreshold?: number
}

export function Tiempo({
  secondsRemaining,
  warningThreshold = 60,
}: TiempoProps) {
  const isWarning = secondsRemaining > 0 && secondsRemaining <= warningThreshold
  const textColor = isWarning ? 'text-red-600' : 'text-green-600'

  return (
    <div
      aria-live="polite"
      aria-label={`Tiempo restante: ${formatTime(secondsRemaining)}`}
      className={`font-mono text-6xl font-bold leading-none ${textColor}`}
    >
      {formatTime(secondsRemaining)}
    </div>
  )
}
