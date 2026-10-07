import { fetchJson } from './http'
import { translateToEnglish } from './translate'
import type { FoodResult } from './types'
import { isPlausible, roundResult } from './validate'

// Documentazione: https://fdc.nal.usda.gov/api-guide
const SEARCH_URL = 'https://api.nal.usda.gov/fdc/v1/foods/search'

/** Chiave gratuita da https://fdc.nal.usda.gov/api-key-signup; DEMO_KEY ha limiti molto bassi. */
export const USDA_API_KEY = import.meta.env.VITE_USDA_API_KEY || 'DEMO_KEY'

export interface UsdaNutrient {
  nutrientId?: number
  nutrientNumber?: string
  nutrientName?: string
  unitName?: string
  value?: number
}

export interface UsdaFood {
  fdcId: number
  description?: string
  dataType?: string
  foodNutrients?: UsdaNutrient[]
}

// Id (e numero storico) dei nutrienti in FoodData Central.
const ENERGY_KCAL_IDS = [1008, 2047, 2048] // Energy; Energy (Atwater General / Specific Factors)
const ENERGY_KJ = { id: 1062, number: '268' }
const PROTEIN = { id: 1003, number: '203' }
const FAT = { id: 1004, number: '204' } // Total lipid (fat)
const CARBS = { id: 1005, number: '205' } // Carbohydrate, by difference
const CARBS_BY_SUMMATION = { id: 1050, number: '205.2' }

function value(nutrients: UsdaNutrient[], n: { id: number; number: string }): number | null {
  const found = nutrients.find((x) => x.nutrientId === n.id || x.nutrientNumber === n.number)
  return typeof found?.value === 'number' && Number.isFinite(found.value) ? found.value : null
}

function energyKcal(nutrients: UsdaNutrient[]): number | null {
  for (const id of ENERGY_KCAL_IDS) {
    const found = nutrients.find((x) => x.nutrientId === id && x.unitName?.toUpperCase() === 'KCAL')
    if (typeof found?.value === 'number') return found.value
  }
  const kj = value(nutrients, ENERGY_KJ)
  return kj != null ? kj / 4.184 : null
}

/** I dati Foundation e SR Legacy sono espressi per 100 g. */
export function usdaFoodToResult(f: UsdaFood): FoodResult | null {
  const nutrients = f.foodNutrients ?? []
  const kcal = energyKcal(nutrients)
  const protein = value(nutrients, PROTEIN)
  const fat = value(nutrients, FAT)
  const carbs = value(nutrients, CARBS) ?? value(nutrients, CARBS_BY_SUMMATION)
  if (kcal == null || protein == null || fat == null || carbs == null) return null
  const description = (f.description ?? '').trim()
  const result = roundResult({
    id: `usda:${f.fdcId}`,
    name: (description.charAt(0).toUpperCase() + description.slice(1)).slice(0, 200),
    brand: null,
    source: 'usda',
    kcal100: kcal,
    protein100: protein,
    carbs100: carbs,
    fat100: fat,
    servingGrams: null,
    barcode: null,
    imageUrl: null,
  })
  return isPlausible(result) ? result : null
}

/** 3ª fonte: alimenti generici con valori verificati (dataset Foundation e SR Legacy). */
export async function searchUsda(query: string, signal?: AbortSignal): Promise<FoodResult[]> {
  const { text } = translateToEnglish(query)
  if (!text) return []
  const params = new URLSearchParams({
    query: text,
    dataType: 'Foundation,SR Legacy',
    pageSize: '20',
    api_key: USDA_API_KEY,
  })
  const body = (await fetchJson(`${SEARCH_URL}?${params}`, { signal })) as { foods?: UsdaFood[] } | null
  return (body?.foods ?? []).map(usdaFoodToResult).filter((r): r is FoodResult => r !== null)
}
