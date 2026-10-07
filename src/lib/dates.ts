/** Le date del diario sono stringhe locali YYYY-MM-DD (mai UTC, per evitare slittamenti di fuso). */

const pad = (n: number) => String(n).padStart(2, '0')

export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function todayKey(): string {
  return toDateKey(new Date())
}

export function addDays(key: string, days: number): string {
  const d = parseDateKey(key)
  d.setDate(d.getDate() + days)
  return toDateKey(d)
}

export function isValidDateKey(key: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(key) && toDateKey(parseDateKey(key)) === key
}

/** Elenco di `days` date consecutive che terminano con `endKey` (incluso). */
export function lastNDays(endKey: string, days: number): string[] {
  return Array.from({ length: days }, (_, i) => addDays(endKey, i - days + 1))
}

const longFmt = new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
const shortFmt = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' })

export function formatDayLabel(key: string, today = todayKey()): string {
  if (key === today) return 'Oggi'
  if (key === addDays(today, -1)) return 'Ieri'
  if (key === addDays(today, 1)) return 'Domani'
  const label = longFmt.format(parseDateKey(key))
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function formatShortDate(key: string): string {
  return shortFmt.format(parseDateKey(key))
}
