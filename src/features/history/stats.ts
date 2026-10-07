import type { Entry, Nutrients } from '../../types'
import { sumNutrients, round } from '../../lib/nutrition'

export interface DayTotals extends Nutrients {
  date: string
  logged: boolean
}

/** Totali per ciascun giorno richiesto (anche quelli senza voci, con logged=false). */
export function dailyTotals(days: string[], entries: Entry[]): DayTotals[] {
  const byDay = new Map<string, Entry[]>()
  for (const e of entries) byDay.set(e.date, [...(byDay.get(e.date) ?? []), e])
  return days.map((date) => {
    const list = byDay.get(date) ?? []
    return { date, logged: list.length > 0, ...sumNutrients(list) }
  })
}

/** Media sui soli giorni registrati (un giorno vuoto non è un giorno a 0 kcal). */
export function average(days: DayTotals[]): (Nutrients & { count: number }) | null {
  const logged = days.filter((d) => d.logged)
  if (logged.length === 0) return null
  const t = sumNutrients(logged)
  const n = logged.length
  return { kcal: round(t.kcal / n), protein: round(t.protein / n, 1), carbs: round(t.carbs / n, 1), fat: round(t.fat / n, 1), count: n }
}

/** Raggruppa in settimane di 7 giorni a ritroso dall'ultimo giorno (la più recente per prima). */
export function weeks(days: DayTotals[]): DayTotals[][] {
  const out: DayTotals[][] = []
  for (let end = days.length; end > 0; end -= 7) out.push(days.slice(Math.max(0, end - 7), end))
  return out
}
