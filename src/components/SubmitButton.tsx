import { useFormStatus } from 'react-dom'

interface SubmitButtonProps {
  label: string
  labelPending?: string
  className?: string
}

export function SubmitButton({
  label,
  labelPending = 'Guardando...',
  className = 'px-4 py-2 bg-blue-700 text-white rounded hover:bg-blue-800 disabled:opacity-50 font-medium',
}: SubmitButtonProps) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? labelPending : label}
    </button>
  )
}
