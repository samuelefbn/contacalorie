import type { FoodResult } from './types'
import { formatFoodLabel } from './display'
import { usdaToItalian } from './usdaToItalian'
import { isPlausible, roundResult } from './validate'

// Modulo puro (senza import.meta.env): usato sia dall'app sia dallo script che genera il dataset.

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
  /** Categoria USDA, es. "Fruits and Fruit Juices" (usata per categoria e prodotti trasformati). */
  foodCategory?: string
  foodNutrients?: UsdaNutrient[]
}

export const USDA_SEARCH_URL = 'https://api.nal.usda.gov/fdc/v1/foods/search'
export const USDA_DATA_TYPES = 'Foundation,SR Legacy'

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

/** Valori per 100 g (Foundation e SR Legacy sono espressi per 100 g); null se incompleti o incoerenti. */
export function usdaNutrients(f: UsdaFood): Pick<FoodResult, 'kcal100' | 'protein100' | 'carbs100' | 'fat100'> | null {
  const nutrients = f.foodNutrients ?? []
  const kcal = energyKcal(nutrients)
  const protein = value(nutrients, PROTEIN)
  const fat = value(nutrients, FAT)
  const carbs = value(nutrients, CARBS) ?? value(nutrients, CARBS_BY_SUMMATION)
  if (kcal == null || protein == null || fat == null || carbs == null) return null
  return { kcal100: kcal, protein100: protein, carbs100: carbs, fat100: fat }
}

/**
 * Converte una voce USDA in risultato con nome italiano strutturato. Restituisce null se i
 * nutrienti sono incompleti o incoerenti, o se la descrizione non è traducibile (mai inglese in UI).
 */
export function usdaFoodToResult(f: UsdaFood): FoodResult | null {
  const n = usdaNutrients(f)
  if (!n) return null
  const t = usdaToItalian(f.description ?? '', f.foodCategory)
  if (!t) return null
  const result = roundResult({
    id: `usda:${f.fdcId}`,
    name: formatFoodLabel(t.display),
    brand: null,
    source: 'usda',
    kind: 'generic',
    ...n,
    servingGrams: null,
    barcode: null,
    imageUrl: null,
    fdcId: f.fdcId,
    dataType: f.dataType,
    display: t.display,
    isPrimitive: t.isPrimitive,
  })
  return isPlausible(result) ? result : null
}
