/** Fonti esterne di dati nutrizionali. */
export type ExternalSource = 'off' | 'usda'

/** Risultato normalizzato di una ricerca, qualunque sia la fonte. Valori per 100 g. */
export interface FoodResult {
  /** Identificativo stabile, prefissato dalla fonte (es. "off:8076800195057", "usda:171688"). */
  id: string
  name: string
  brand: string | null
  source: ExternalSource
  kcal100: number
  protein100: number
  carbs100: number
  fat100: number
  /** Porzione indicata dal produttore, se disponibile. */
  servingGrams: number | null
  barcode: string | null
  imageUrl: string | null
}

export const SOURCE_LABEL: Record<ExternalSource, string> = {
  off: 'Open Food Facts',
  usda: 'USDA',
}
