import Fuse from 'fuse.js'
import datasetJson from '../../data/genericFoods.it.json'
import { formatFoodLabel, type GenericFoodDisplay } from './display'
import type { GenericFood, GenericFoodsDataset } from './genericTypes'
import { matchTier } from './genericRanking'
import { canonicalTokens } from './queryText'
import type { FoodResult } from './types'

export { canonical, normalizeQuery, queryTokens } from './queryText'

/** Dataset incluso nell'app: funziona offline e anche se le API esterne non rispondono. */
export const GENERIC_DATASET = datasetJson as unknown as GenericFoodsDataset

export const displayOf = (f: GenericFood): GenericFoodDisplay =>
  f.cut ? { category: f.category, baseName: f.baseName, cut: f.cut, details: f.details } : { category: f.category, baseName: f.baseName, details: f.details }

export function genericToResult(f: GenericFood): FoodResult {
  const display = displayOf(f)
  return {
    id: `gen:${f.id}`,
    name: formatFoodLabel(display),
    brand: null,
    source: 'usda',
    kind: 'generic',
    kcal100: f.kcal100,
    protein100: f.protein100,
    carbs100: f.carbs100,
    fat100: f.fat100,
    servingGrams: f.portions[0]?.grams ?? null,
    portions: f.portions,
    barcode: null,
    imageUrl: null,
    fdcId: f.fdcId,
    dataType: f.dataType,
    display,
    isPrimitive: f.isPrimitive,
    synonyms: f.synonyms,
  }
}

/**
 * Ricerca nel dataset: corrispondenze su nome, taglio, dettagli e sinonimi (singolare/plurale,
 * prefissi mentre si scrive) più una ricerca approssimata per gli errori di battitura.
 * L'ordinamento finale è fatto da `rankGenericResults`.
 */
export function createGenericSearch(foods: GenericFood[]) {
  const results = foods.map(genericToResult)
  const fuse = new Fuse(results, {
    keys: ['name', 'synonyms'],
    threshold: 0.3,
    ignoreLocation: true,
  })
  return function search(query: string, limit = 40): FoodResult[] {
    const q = canonicalTokens(query)
    if (q.length === 0 || q.join('').length < 2) return []
    // Prima le parole intere; poi, se non trova nulla, l'ultima parola come prefisso ("zucch");
    // infine la ricerca approssimata per gli errori di battitura ("zuchine").
    let matched = results.filter((r) => matchTier(q, r) > 0)
    if (matched.length === 0) matched = results.filter((r) => matchTier(q, r, true) > 0)
    if (matched.length === 0) matched = fuse.search(query, { limit: 10 }).map((m) => m.item)
    return matched.slice(0, limit)
  }
}

const searchDataset = createGenericSearch(GENERIC_DATASET.foods)

/** Alimenti generici dal dataset incluso nell'app (sincrono, istantaneo, offline). */
export function searchGenericDataset(query: string, limit = 40): FoodResult[] {
  return searchDataset(query, limit)
}
