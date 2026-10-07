import type { FoodItem, Nutrients } from '../types'
import { round } from './nutrition'

// API pubblica e gratuita di Open Food Facts: https://openfoodfacts.github.io/openfoodfacts-server/api/
const BASE = 'https://world.openfoodfacts.org'
const FIELDS = 'code,product_name,product_name_it,brands,nutriments,serving_quantity,image_front_small_url'

export interface OffProduct {
  code?: string
  product_name?: string
  product_name_it?: string
  brands?: string
  nutriments?: Record<string, unknown>
  serving_quantity?: number | string
  image_front_small_url?: string
}

function num(v: unknown): number | null {
  const n = typeof v === 'string' ? Number.parseFloat(v.replace(',', '.')) : typeof v === 'number' ? v : NaN
  return Number.isFinite(n) ? n : null
}

const clamp = (n: number, max: number) => Math.min(Math.max(n, 0), max)

/** Converte un prodotto OFF in FoodItem; restituisce null se mancano nome o calorie. */
export function mapProduct(p: OffProduct): FoodItem | null {
  const name = (p.product_name_it || p.product_name || '').trim()
  if (!name) return null
  const n = p.nutriments ?? {}
  const kj = num(n['energy_100g'])
  const kcal = num(n['energy-kcal_100g']) ?? (kj != null ? kj / 4.184 : null)
  if (kcal == null) return null

  const per100: Nutrients = {
    kcal: round(clamp(kcal, 1000)),
    protein: round(clamp(num(n['proteins_100g']) ?? 0, 100), 1),
    carbs: round(clamp(num(n['carbohydrates_100g']) ?? 0, 100), 1),
    fat: round(clamp(num(n['fat_100g']) ?? 0, 100), 1),
  }
  const serving = num(p.serving_quantity)
  return {
    name: name.slice(0, 200),
    brand: p.brands?.split(',')[0]?.trim().slice(0, 200) || null,
    barcode: p.code?.slice(0, 50) || null,
    per100,
    defaultGrams: serving && serving > 0 && serving <= 2000 ? round(serving) : 100,
    source: 'off',
    foodId: null,
    imageUrl: p.image_front_small_url ?? null,
  }
}

/** Attese tra un tentativo e l'altro: 3 tentativi in totale. */
export const RETRY_DELAYS_MS = [800, 2000]

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason)
    const t = setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(t)
        reject(signal.reason)
      },
      { once: true },
    )
  })
}

/**
 * Open Food Facts è spesso sovraccarico: i suoi errori 503 arrivano senza intestazione CORS,
 * quindi il browser li vede come errori di rete. Per questo errori di rete e 5xx vengono ritentati.
 */
async function getJson(url: string, signal?: AbortSignal): Promise<{ status: number; body: unknown }> {
  let lastError: unknown = null
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    if (attempt > 0) await wait(RETRY_DELAYS_MS[attempt - 1], signal)
    let res: Response
    try {
      res = await fetch(url, { signal, headers: { Accept: 'application/json' } })
    } catch (err) {
      if ((err as Error).name === 'AbortError') throw err
      if (!navigator.onLine) throw new Error('Sei offline: la ricerca online non è disponibile.', { cause: err })
      lastError = err
      continue
    }
    if (res.status === 404) return { status: 404, body: null }
    if (res.status === 429) throw new Error('Troppe ricerche ravvicinate su Open Food Facts. Attendi un minuto.')
    if (res.status >= 500) {
      lastError = new Error(`HTTP ${res.status}`)
      continue
    }
    if (!res.ok) throw new Error(`Open Food Facts ha risposto con un errore (${res.status}).`)
    return { status: res.status, body: await res.json() }
  }
  throw new Error(
    'Open Food Facts è sovraccarico in questo momento. Riprova tra poco, oppure usa il codice a barre o l’inserimento manuale.',
    { cause: lastError },
  )
}

export async function searchProducts(query: string, signal?: AbortSignal): Promise<FoodItem[]> {
  const params = new URLSearchParams({
    search_terms: query,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: '30',
    fields: FIELDS,
  })
  const { body } = await getJson(`${BASE}/cgi/search.pl?${params}`, signal)
  const products = (body as { products?: OffProduct[] } | null)?.products ?? []
  return products.map(mapProduct).filter((x): x is FoodItem => x !== null)
}

export async function getProductByBarcode(code: string, signal?: AbortSignal): Promise<FoodItem | null> {
  const clean = code.replace(/\D/g, '')
  if (!clean) return null
  const { body } = await getJson(`${BASE}/api/v2/product/${clean}?fields=${FIELDS}`, signal)
  const data = body as { status?: number; product?: OffProduct } | null
  if (!data || data.status !== 1 || !data.product) return null
  return mapProduct({ code: clean, ...data.product })
}
