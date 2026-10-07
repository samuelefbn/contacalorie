import { round } from '../nutrition'
import type { FoodResult } from './types'

/** Converte numeri o stringhe ("1,5") in numero; null se assente o non valido. */
export function toNumber(v: unknown): number | null {
  const n = typeof v === 'string' ? Number.parseFloat(v.replace(',', '.')) : typeof v === 'number' ? v : NaN
  return Number.isFinite(n) ? n : null
}

/**
 * Porzione in grammi: prima `serving_quantity` (già in grammi per Open Food Facts),
 * poi il testo di `serving_size` come "30 g", "125g", "250 ml (1 bicchiere)".
 */
export function servingGrams(quantity: unknown, size?: unknown): number | null {
  const fromText = typeof size === 'string' ? size.match(/(\d+(?:[.,]\d+)?)\s*(?:g|gr|ml)\b/i)?.[1] : undefined
  const g = toNumber(quantity) ?? toNumber(fromText)
  return g != null && g > 0 && g <= 2000 ? round(g) : null
}

const MAX_KCAL_100G = 950 // il grasso puro ne ha circa 900

/**
 * Scarta i valori non credibili: kcal mancanti o fuori scala, macro negativi o oltre 100 g
 * per 100 g, somma dei macro oltre 100 g, o kcal molto più basse di quanto i macro impongono.
 */
export function isPlausible(r: Pick<FoodResult, 'name' | 'kcal100' | 'protein100' | 'carbs100' | 'fat100'>): boolean {
  if (!r.name.trim()) return false
  const values = [r.kcal100, r.protein100, r.carbs100, r.fat100]
  if (values.some((v) => !Number.isFinite(v) || v < 0)) return false
  if (r.kcal100 > MAX_KCAL_100G) return false
  if (r.protein100 > 100 || r.carbs100 > 100 || r.fat100 > 100) return false
  if (r.protein100 + r.carbs100 + r.fat100 > 105) return false // tolleranza per arrotondamenti
  // Le kcal possono superare la stima dai macro (alcol, fibre), ma non esserne una frazione.
  const atwater = r.protein100 * 4 + r.carbs100 * 4 + r.fat100 * 9
  if (atwater > 40 && r.kcal100 < atwater * 0.5) return false
  return true
}

/** Arrotonda i valori in modo uniforme per tutte le fonti. */
export function roundResult(r: FoodResult): FoodResult {
  return {
    ...r,
    kcal100: round(r.kcal100),
    protein100: round(r.protein100, 1),
    carbs100: round(r.carbs100, 1),
    fat100: round(r.fat100, 1),
  }
}
