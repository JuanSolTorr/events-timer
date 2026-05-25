import { DateTime } from 'luxon'

export const TIMEZONE = 'Europe/Madrid'

export function parseTimerInicio(isoString: string): DateTime {
  return DateTime.fromISO(isoString, { zone: TIMEZONE })
}

export function ahora(): DateTime {
  return DateTime.now().setZone(TIMEZONE)
}

export function timerYaPaso(inicio: string, duracionMinutos: number): boolean {
  const fin = parseTimerInicio(inicio).plus({ minutes: duracionMinutos })
  return fin < ahora()
}
