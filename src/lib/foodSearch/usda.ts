import { fetchJson } from './http'
import { translateToEnglish } from './translate'
import type { FoodResult } from './types'
import { USDA_DATA_TYPES, USDA_SEARCH_URL, usdaFoodToResult, type UsdaFood } from './usdaMap'

// Documentazione: https://fdc.nal.usda.gov/api-guide

/** Chiave gratuita da https://fdc.nal.usda.gov/api-key-signup; DEMO_KEY ha limiti molto bassi. */
export const USDA_API_KEY = import.meta.env.VITE_USDA_API_KEY || 'DEMO_KEY'

const PAGE_SIZE = '15'

/** USDA FoodData Central live (Foundation e SR Legacy), con la query tradotta in inglese. */
export async function searchUsda(query: string, signal?: AbortSignal): Promise<FoodResult[]> {
  const { text } = translateToEnglish(query)
  if (!text) return []
  const params = new URLSearchParams({ query: text, dataType: USDA_DATA_TYPES, pageSize: PAGE_SIZE, api_key: USDA_API_KEY })
  const body = (await fetchJson(`${USDA_SEARCH_URL}?${params}`, { signal })) as { foods?: UsdaFood[] } | null
  return (body?.foods ?? []).map(usdaFoodToResult).filter((r): r is FoodResult => r !== null)
}
