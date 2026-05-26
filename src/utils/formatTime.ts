/**
 * Format seconds into a human-readable time string.
 * - <= 0 -> "00:00"
 * - < 3600 -> "MM:SS"
 * - >= 3600 -> "HH:MM:SS"
 */
export function formatTime(totalSeconds: number): string {
  if (!isFinite(totalSeconds) || totalSeconds <= 0) return '00:00';
  const seconds = Math.floor(totalSeconds);
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  if (hrs > 0) return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  return `${pad(mins)}:${pad(secs)}`;
}

export default formatTime;
