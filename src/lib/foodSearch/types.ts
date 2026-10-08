import type { Portion } from '../../types'
import type { GenericFoodDisplay } from './display'

/** Fonti esterne di dati nutrizionali. */
export type ExternalSource = 'off' | 'usda'

/** Alimento generico (sfuso: frutta, carne, cereali…) o prodotto confezionato con marca. */
export type FoodKind = 'generic' | 'packaged'

export type { Portion }

/** Risultato normalizzato di una ricerca, qualunque sia la fonte. Valori per 100 g. */
export interface FoodResult {
  /** Identificativo stabile, prefissato dalla fonte (es. "off:8076800195057", "usda:171688", "gen:mela-con-buccia"). */
  id: string
  name: string
  brand: string | null
  source: ExternalSource
  kind: FoodKind
  kcal100: number
  protein100: number
  carbs100: number
  fat100: number
  /** Porzione indicata dal produttore, se disponibile. */
  servingGrams: number | null
  /** Porzioni rapide indicative (alimenti generici). */
  portions?: Portion[]
  barcode: string | null
  imageUrl: string | null
  /** Id FoodData Central, per evitare doppioni tra dataset e USDA live. */
  fdcId?: number
  /** Dataset USDA di provenienza ("Foundation", "SR Legacy"), usato per scegliere tra doppioni. */
  dataType?: string
  /** Nome italiano strutturato (alimenti generici); `name` ne contiene la forma composta. */
  display?: GenericFoodDisplay
  /** Alimento semplice, non trasformato (frutta, verdura, carne, pesce, uova, latte, legumi…). */
  isPrimitive: boolean
  /** Sinonimi italiani (dataset generico), usati nella ricerca. */
  synonyms?: string[]
}

export const SOURCE_LABEL: Record<ExternalSource, string> = {
  off: 'Open Food Facts',
  usda: 'USDA',
}
