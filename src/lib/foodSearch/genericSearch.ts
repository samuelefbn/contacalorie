import Fuse from 'fuse.js'
import datasetJson from '../../data/genericFoods.it.json'
import { normalize } from '../text'
import type { GenericFood, GenericFoodsDataset } from './genericTypes'
import type { FoodResult } from './types'

/** Dataset incluso nell'app: funziona offline e anche se le API esterne non rispondono. */
export const GENERIC_DATASET = datasetJson as unknown as GenericFoodsDataset

const STOPWORDS = new Set([
  'di', 'del', 'della', 'dello', 'dei', 'degli', 'delle', 'd', 'al', 'alla', 'allo', 'ai', 'agli', 'alle',
  'con', 'e', 'ed', 'in', 'a', 'da', 'il', 'lo', 'la', 'l', 'i', 'gli', 'le', 'un', 'una', 'uno', 'per', 'senza',
])

/** Parole della query: minuscolo, senza accenti né punteggiatura, senza preposizioni e articoli. */
export function queryTokens(text: string): string[] {
  return normalize(text)
    .replace(/[’'`]/g, ' ')
    .split(/[^a-z0-9%]+/)
    .filter((w) => w && !STOPWORDS.has(w))
}

/**
 * Forma canonica per confrontare singolare e plurale: senza la vocale finale
 * (mela/mele → "mel", zucchina/zucchine → "zucchin", uovo/uova → "uov", crudo/cruda → "crud").
 */
export function canonical(word: string): string {
  return word.length > 3 && /[aeio]$/.test(word) ? word.slice(0, -1) : word
}

/** Query normalizzata (usata anche come chiave di cache). */
export const normalizeQuery = (text: string) => queryTokens(text).map(canonical).join(' ')

const MIN_PREFIX = 3

/** La parola della query corrisponde a quella dell'alimento (stessa forma canonica o prefisso mentre si scrive). */
function wordMatches(q: string, word: string, allowPrefix: boolean): boolean {
  if (canonical(q) === canonical(word)) return true
  return allowPrefix && q.length >= MIN_PREFIX && word.startsWith(q)
}

interface Indexed {
  food: GenericFood
  order: number
  terms: string[][]
  words: string[]
  joined: string
}

export interface GenericMatch {
  food: GenericFood
  score: number
}

export const SCORE = { exact: 100, startsWith: 80, contains: 60, anyField: 45, fuzzy: 30 } as const

function termScore(q: string[], term: string[]): number {
  if (term.length === 0) return 0
  const last = q.length - 1
  if (q.length === term.length && q.every((w, i) => wordMatches(w, term[i], false))) return SCORE.exact
  if (q.length <= term.length && q.every((w, i) => wordMatches(w, term[i], i === last))) return SCORE.startsWith
  if (q.every((w, i) => term.some((t) => wordMatches(w, t, i === last)))) return SCORE.contains
  return 0
}

/** Crea la funzione di ricerca su un elenco di alimenti generici. */
export function createGenericSearch(foods: GenericFood[]) {
  const index: Indexed[] = foods.map((food, order) => {
    const terms = [food.name, ...food.synonyms].map(queryTokens)
    return { food, order, terms, words: [...new Set(terms.flat())], joined: terms.map((t) => t.join(' ')).join(' | ') }
  })
  const fuse = new Fuse(index, { keys: ['joined'], threshold: 0.3, ignoreLocation: true, includeScore: true })

  return function search(query: string, limit = 20): GenericMatch[] {
    const q = queryTokens(query)
    if (q.length === 0 || q.join('').length < 2) return []
    const last = q.length - 1
    const scored = new Map<Indexed, number>()
    for (const item of index) {
      let score = Math.max(...item.terms.map((t) => termScore(q, t)))
      if (!score && q.every((w, i) => item.words.some((t) => wordMatches(w, t, i === last)))) score = SCORE.anyField
      if (score) scored.set(item, score)
    }
    // Ricerca approssimata (errori di battitura) solo se i confronti esatti trovano poco.
    if (scored.size < 5) {
      for (const r of fuse.search(q.join(' '), { limit: 10 })) {
        if (!scored.has(r.item)) scored.set(r.item, Math.round(SCORE.fuzzy * (1 - (r.score ?? 1))))
      }
    }
    return [...scored.entries()]
      .sort(([a, sa], [b, sb]) => sb - sa || a.order - b.order)
      .slice(0, limit)
      .map(([item, score]) => ({ food: item.food, score }))
  }
}

export function genericToResult(f: GenericFood): FoodResult {
  return {
    id: `gen:${f.id}`,
    name: f.name,
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
  }
}

const searchDataset = createGenericSearch(GENERIC_DATASET.foods)

/** Alimenti generici dal dataset incluso nell'app (sincrono, istantaneo, offline). */
export function searchGenericDataset(query: string, limit = 20): FoodResult[] {
  return searchDataset(query, limit).map((m) => genericToResult(m.food))
}
