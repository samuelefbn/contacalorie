import type { FoodItem } from '../../types'
import { createSearchCache, type SearchCache } from './cache'
import { isAbortError } from './http'
import { searchOffLegacy, searchSearchalicious } from './openFoodFacts'
import { searchUsda } from './usda'
import type { ExternalSource, FoodResult } from './types'

export { getProductByBarcode } from './openFoodFacts'
export { SOURCE_LABEL } from './types'
export type { ExternalSource, FoodResult } from './types'

export interface SearchSource {
  name: string
  source: ExternalSource
  search: (query: string, signal?: AbortSignal) => Promise<FoodResult[]>
}

/** Ordine della catena: si passa alla fonte successiva su errore o risultati vuoti. */
export const DEFAULT_SOURCES: SearchSource[] = [
  { name: 'Open Food Facts (Search-a-licious)', source: 'off', search: searchSearchalicious },
  { name: 'Open Food Facts (ricerca classica)', source: 'off', search: searchOffLegacy },
  { name: 'USDA FoodData Central', source: 'usda', search: searchUsda },
]

export interface SourceFailure {
  name: string
  error: unknown
}

/** Tutte le fonti hanno fallito con un errore (non semplicemente "nessun risultato"). */
export class AllSourcesFailedError extends Error {
  readonly failures: SourceFailure[]
  constructor(failures: SourceFailure[]) {
    super(
      'Nessuna fonte di dati nutrizionali risponde in questo momento (Open Food Facts e USDA). ' +
        'Riprova tra poco oppure inserisci l’alimento a mano.',
    )
    this.name = 'AllSourcesFailedError'
    this.failures = failures
  }
}

export class OfflineError extends Error {
  constructor() {
    super('Sei offline: la ricerca online non è disponibile. Puoi usare i tuoi alimenti o inserirne uno a mano.')
    this.name = 'OfflineError'
  }
}

export interface SearchOutcome {
  results: FoodResult[]
  /** Fonte che ha fornito i risultati; null se nessuna fonte ha trovato qualcosa. */
  source: ExternalSource | null
  fromCache: boolean
  /** Fonti che hanno fallito prima di quella che ha risposto (per diagnostica). */
  failures: SourceFailure[]
}

export interface SearchOptions {
  signal?: AbortSignal
  sources?: SearchSource[]
  cache?: SearchCache
}

const defaultCache = createSearchCache()

export async function searchFoods(query: string, opts: SearchOptions = {}): Promise<SearchOutcome> {
  const { signal, sources = DEFAULT_SOURCES, cache = defaultCache } = opts
  const q = query.trim()
  if (q.length < 2) return { results: [], source: null, fromCache: false, failures: [] }

  const cached = cache.get(q)
  if (cached) return { ...cached, fromCache: true, failures: [] }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new OfflineError()

  const failures: SourceFailure[] = []
  let anyAnswered = false
  for (const s of sources) {
    try {
      const results = await s.search(q, signal)
      anyAnswered = true
      if (results.length > 0) {
        cache.set(q, { results, source: s.source })
        return { results, source: s.source, fromCache: false, failures }
      }
    } catch (error) {
      if (isAbortError(error)) throw error
      failures.push({ name: s.name, error })
    }
  }
  if (!anyAnswered) throw new AllSourcesFailedError(failures)
  return { results: [], source: null, fromCache: false, failures }
}

/** Da risultato di ricerca ad alimento da aggiungere al diario. */
export function resultToItem(r: FoodResult): FoodItem {
  return {
    name: r.name,
    brand: r.brand,
    barcode: r.barcode,
    per100: { kcal: r.kcal100, protein: r.protein100, carbs: r.carbs100, fat: r.fat100 },
    defaultGrams: r.servingGrams ?? 100,
    source: r.source,
    foodId: null,
    imageUrl: r.imageUrl,
  }
}
