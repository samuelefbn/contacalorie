import type { FoodItem } from '../../types'
import { createSearchCache, type SearchCache } from './cache'
import { isAbortError } from './http'
import { searchOffLegacy, searchSearchalicious } from './openFoodFacts'
import { searchUsda } from './usda'
import type { FoodResult } from './types'

export { getProductByBarcode } from './openFoodFacts'
export { searchGenericDataset, GENERIC_DATASET, normalizeQuery } from './genericSearch'
export { SOURCE_LABEL } from './types'
export type { ExternalSource, FoodKind, FoodResult } from './types'

/**
 * Architettura della ricerca:
 *  - ALIMENTI GENERICI (fonte primaria): i tuoi alimenti/recenti e il dataset incluso nell'app
 *    (sincroni, nella UI), più USDA FoodData Central live per ciò che il dataset non copre;
 *  - PRODOTTI CONFEZIONATI: Open Food Facts (Search-a-licious, poi ricerca classica).
 * Generici e confezionati vengono cercati SEMPRE in parallelo: l'errore di uno non blocca l'altro.
 */

export interface PackagedSource {
  name: string
  search: (query: string, signal?: AbortSignal) => Promise<FoodResult[]>
}

export const PACKAGED_SOURCES: PackagedSource[] = [
  { name: 'Open Food Facts (Search-a-licious)', search: searchSearchalicious },
  { name: 'Open Food Facts (ricerca classica)', search: searchOffLegacy },
]

export interface SourceFailure {
  name: string
  error: unknown
}

/** Tutte le fonti di un gruppo hanno fallito con un errore (non semplicemente "nessun risultato"). */
export class SourcesFailedError extends Error {
  readonly failures: SourceFailure[]
  constructor(failures: SourceFailure[]) {
    super(`Nessuna risposta da: ${failures.map((f) => f.name).join(', ')}`)
    this.name = 'SourcesFailedError'
    this.failures = failures
  }
}

/** Messaggio mostrato solo quando TUTTE le fonti (anche locali) non danno nulla per un errore. */
export class AllSourcesFailedError extends Error {
  constructor() {
    super(
      'Nessuna fonte di dati nutrizionali risponde in questo momento (Open Food Facts e USDA). ' +
        'Riprova tra poco oppure inserisci l’alimento a mano.',
    )
    this.name = 'AllSourcesFailedError'
  }
}

export class OfflineError extends Error {
  constructor() {
    super('Sei offline: la ricerca online non è disponibile. Puoi usare i tuoi alimenti, gli alimenti generici o inserirne uno a mano.')
    this.name = 'OfflineError'
  }
}

const isOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false
const defaultCache = createSearchCache()

interface GroupOptions {
  signal?: AbortSignal
  cache?: SearchCache
}

/** Prodotti confezionati: Open Food Facts, con fallback tra i due motori su errore o risultati vuoti. */
export async function searchPackaged(
  query: string,
  { signal, cache = defaultCache, sources = PACKAGED_SOURCES }: GroupOptions & { sources?: PackagedSource[] } = {},
): Promise<FoodResult[]> {
  const key = `off|${query}`
  const cached = cache.get(key)
  if (cached) return cached.results
  if (isOffline()) throw new OfflineError()
  const failures: SourceFailure[] = []
  let anyAnswered = false
  for (const s of sources) {
    try {
      const results = await s.search(query, signal)
      anyAnswered = true
      if (results.length > 0) {
        cache.set(key, { results, source: 'off' })
        return results
      }
    } catch (error) {
      if (isAbortError(error)) throw error
      failures.push({ name: s.name, error })
    }
  }
  if (!anyAnswered) throw new SourcesFailedError(failures)
  return []
}

/** Alimenti generici da USDA FoodData Central live (query tradotta in inglese). */
export async function searchUsdaLive(
  query: string,
  { signal, cache = defaultCache, search = searchUsda }: GroupOptions & { search?: PackagedSource['search'] } = {},
): Promise<FoodResult[]> {
  const key = `usda|${query}`
  const cached = cache.get(key)
  if (cached) return cached.results
  if (isOffline()) throw new OfflineError()
  const results = await search(query, signal)
  if (results.length > 0) cache.set(key, { results, source: 'usda' })
  return results
}

export interface OnlineOutcome {
  usda: FoodResult[]
  packaged: FoodResult[]
  /** Errore della fonte USDA (null se ha risposto o non era necessaria). */
  usdaError: unknown
  packagedError: unknown
  usdaSkipped: boolean
}

export interface OnlineOptions extends GroupOptions {
  /** USDA live si interroga solo se il dataset incluso non copre già la query. */
  includeUsda?: boolean
  usdaSearch?: PackagedSource['search']
  packagedSources?: PackagedSource[]
}

/** Fonti online in parallelo (Promise.allSettled): un errore di una non blocca le altre. */
export async function searchOnline(query: string, opts: OnlineOptions = {}): Promise<OnlineOutcome> {
  const { signal, cache, includeUsda = true, usdaSearch, packagedSources } = opts
  const q = query.trim()
  const [usda, packaged] = await Promise.allSettled([
    includeUsda ? searchUsdaLive(q, { signal, cache, search: usdaSearch }) : Promise.resolve([]),
    searchPackaged(q, { signal, cache, sources: packagedSources }),
  ])
  for (const r of [usda, packaged]) if (r.status === 'rejected' && isAbortError(r.reason)) throw r.reason
  return {
    usda: usda.status === 'fulfilled' ? usda.value : [],
    packaged: packaged.status === 'fulfilled' ? packaged.value : [],
    usdaError: usda.status === 'rejected' ? usda.reason : null,
    packagedError: packaged.status === 'rejected' ? packaged.reason : null,
    usdaSkipped: !includeUsda,
  }
}

/** Generici: prima il dataset (nomi italiani), poi USDA live senza doppioni dello stesso alimento. */
export function mergeGeneric(dataset: FoodResult[], live: FoodResult[], limit = 30): FoodResult[] {
  const fdcIds = new Set(dataset.map((r) => r.fdcId).filter((id) => id != null))
  return [...dataset, ...live.filter((r) => r.fdcId == null || !fdcIds.has(r.fdcId))].slice(0, limit)
}

/**
 * Vero solo se TUTTE le fonti hanno fallito: nessun risultato locale né dal dataset,
 * ed errore (non semplicemente "zero risultati") sia da USDA sia da Open Food Facts.
 */
export function allSourcesFailed(localCount: number, datasetCount: number, online: OnlineOutcome): boolean {
  if (localCount > 0 || datasetCount > 0) return false
  const usdaFailed = online.usdaSkipped || online.usdaError != null
  return usdaFailed && online.packagedError != null
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
    portions: r.portions,
  }
}
