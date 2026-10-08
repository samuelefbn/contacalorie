import type { DisplayCategory } from './display'
import type { Portion } from './types'

/** Voce del dataset generico incluso nell'app (generato da scripts/build-generic-foods.ts). */
export interface GenericFood {
  id: string
  /** Nome italiano strutturato: "Categoria - Nome base, taglio (dettagli)". */
  category: DisplayCategory
  baseName: string
  cut?: string
  details: string[]
  /** Alimento semplice (non trasformato). */
  isPrimitive: boolean
  synonyms: string[]
  state: string | null
  kcal100: number
  protein100: number
  carbs100: number
  fat100: number
  source: 'USDA'
  fdcId: number
  /** Descrizione originale USDA, per verificare la corrispondenza. */
  usdaDescription: string
  dataType: string
  portions: Portion[]
}

export interface GenericFoodsDataset {
  /** Data di generazione (ISO); null finché lo script non è stato eseguito. */
  generatedAt: string | null
  source: string
  dataTypes: string[]
  count: number
  foods: GenericFood[]
}
