import { fetchJson } from './http'
import type { FoodResult } from './types'
import { isPlausible, roundResult, servingGrams, toNumber } from './validate'

// Documentazione: https://openfoodfacts.github.io/openfoodfacts-server/api/ e https://search.openfoodfacts.org/docs
const SEARCHALICIOUS_URL = 'https://search.openfoodfacts.org/search'
const LEGACY_URL = 'https://it.openfoodfacts.org/cgi/search.pl'
const PRODUCT_URL = 'https://world.openfoodfacts.org/api/v2/product'
const PAGE_SIZE = '20'
const FIELDS = 'code,product_name,product_name_it,brands,nutriments,serving_size,serving_quantity,image_front_small_url'

export interface OffProduct {
  code?: string
  /** Testo semplice (API classica) o oggetto per lingua (Search-a-licious: { it, en, main, … }). */
  product_name?: string | Record<string, unknown>
  product_name_it?: string
  /** Stringa "Marca1, Marca2" (API classica) o elenco (Search-a-licious). */
  brands?: string | string[]
  nutriments?: Record<string, unknown>
  serving_size?: string
  serving_quantity?: number | string
  image_front_small_url?: string
}

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

function pickName(p: OffProduct): string {
  if (typeof p.product_name === 'object' && p.product_name) {
    const byLang = p.product_name
    const preferred = str(byLang.it) || str(byLang.en) || str(byLang.main)
    if (preferred) return preferred
    const any = Object.values(byLang).find((v) => str(v))
    if (any) return str(any)
  }
  return str(p.product_name_it) || str(p.product_name)
}

/** Le marche dalla tassonomia arrivano come slug ("mulino-bianco"): le rendo leggibili. */
function pickBrand(brands: OffProduct['brands']): string | null {
  const first = (Array.isArray(brands) ? brands[0] : brands?.split(',')[0])?.trim()
  if (!first) return null
  const pretty = /^[a-z0-9-]+$/.test(first) && first.includes('-')
    ? first.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : first
  return pretty.slice(0, 200)
}

/** Converte un prodotto OFF; null se mancano nome, kcal o macro, o se i valori sono incoerenti. */
export function offProductToResult(p: OffProduct): FoodResult | null {
  const n = p.nutriments ?? {}
  const kj = toNumber(n['energy-kj_100g']) ?? toNumber(n['energy_100g'])
  const kcal = toNumber(n['energy-kcal_100g']) ?? (kj != null ? kj / 4.184 : null)
  const protein = toNumber(n['proteins_100g'])
  const carbs = toNumber(n['carbohydrates_100g'])
  const fat = toNumber(n['fat_100g'])
  // Solo valori dichiarati: un macro mancante non viene sostituito con 0.
  if (kcal == null || protein == null || carbs == null || fat == null) return null

  const code = str(p.code)
  const result = roundResult({
    id: `off:${code || pickName(p)}`,
    name: pickName(p).slice(0, 200),
    brand: pickBrand(p.brands),
    source: 'off',
    kcal100: kcal,
    protein100: protein,
    carbs100: carbs,
    fat100: fat,
    servingGrams: servingGrams(p.serving_quantity, p.serving_size),
    barcode: code ? code.slice(0, 50) : null,
    imageUrl: p.image_front_small_url ?? null,
  })
  return isPlausible(result) ? result : null
}

function toResults(products: OffProduct[] | undefined): FoodResult[] {
  return (products ?? []).map(offProductToResult).filter((r): r is FoodResult => r !== null)
}

/** 1ª fonte: Search-a-licious, il nuovo motore di ricerca di Open Food Facts. */
export async function searchSearchalicious(query: string, signal?: AbortSignal): Promise<FoodResult[]> {
  const params = new URLSearchParams({ q: query, langs: 'it,en', page_size: PAGE_SIZE, fields: FIELDS })
  const body = (await fetchJson(`${SEARCHALICIOUS_URL}?${params}`, { signal })) as { hits?: OffProduct[] } | null
  return toResults(body?.hits)
}

/**
 * 2ª fonte: la ricerca classica. Risponde spesso 503 senza intestazione CORS, che il browser
 * mostra come errore di rete: per questo qui si ritentano anche gli errori di rete.
 */
export async function searchOffLegacy(query: string, signal?: AbortSignal): Promise<FoodResult[]> {
  const params = new URLSearchParams({
    search_terms: query,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: PAGE_SIZE,
    fields: FIELDS,
  })
  const body = (await fetchJson(`${LEGACY_URL}?${params}`, { signal, retryNetworkErrors: true })) as {
    products?: OffProduct[]
  } | null
  return toResults(body?.products)
}

/** Prodotto per codice a barre; null se non esiste o non ha valori nutrizionali completi. */
export async function getProductByBarcode(code: string, signal?: AbortSignal): Promise<FoodResult | null> {
  const clean = code.replace(/\D/g, '')
  if (!clean) return null
  const body = (await fetchJson(`${PRODUCT_URL}/${clean}.json?fields=${FIELDS}`, {
    signal,
    retryNetworkErrors: true,
    allow404: true,
  })) as { status?: number; product?: OffProduct } | null
  if (!body || body.status !== 1 || !body.product) return null
  return offProductToResult({ ...body.product, code: clean })
}
