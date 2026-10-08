import { formatFoodLabel, isStateDetail, stateRank } from './display'
import { canonicalTokens, wordMatches } from './queryText'
import type { FoodResult } from './types'

/** Livelli di corrispondenza tra query e alimento generico. */
export const TIER = { baseExact: 100, synonym: 95, primary: 80, anyWord: 60, other: 10 } as const

/** Parole che indicano che l'utente cerca proprio un prodotto trasformato. */
const PROCESSED_QUERY_WORDS = [
  'succ', 'spremut', 'tort', 'strudel', 'cornett', 'croissant', 'biscott', 'marmellat', 'confettur', 'crem', 'sciropp',
  'scatol', 'omogeneizz', 'snack', 'patatin', 'gelat', 'cioccolat', 'dolc', 'purea', 'pure', 'salum', 'affettat', 'wurstel',
]

const words = (text: string | undefined) => (text ? canonicalTokens(text) : [])

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((w) => b.includes(w))

/**
 * Quanto bene l'alimento corrisponde alla query (0 = per niente). Con `allowPrefix` l'ultima parola
 * può essere incompleta ("zucch" → zucchina): si usa solo se le parole intere non trovano nulla,
 * altrimenti "mela" troverebbe anche melanzana e melone.
 */
export function matchTier(q: string[], r: FoodResult, allowPrefix = false): number {
  const d = r.display
  if (!d || q.length === 0) return 0
  const base = words(d.baseName)
  const primary = [...base, ...words(d.cut)]
  const last = allowPrefix ? q.length - 1 : -1
  if (sameSet(q, base) || sameSet(q, primary)) return TIER.baseExact
  if (r.synonyms?.some((s) => sameSet(q, words(s)))) return TIER.synonym
  if (q.every((w, i) => primary.some((p) => wordMatches(w, p, i === last)))) return TIER.primary
  const all = [...primary, ...d.details.flatMap(words), ...(r.synonyms ?? []).flatMap(words)]
  if (q.every((w, i) => all.some((p) => wordMatches(w, p, i === last)))) return TIER.anyWord
  return 0
}

/**
 * Un prodotto trasformato è cercato esplicitamente se la query inizia con il suo nome
 * ("succo di mela", "strudel", "salsiccia") o contiene una parola da trasformato ("torta di mele").
 */
export function isExplicitRequest(q: string[], r: FoodResult): boolean {
  const d = r.display
  if (!d || q.length === 0) return false
  const firstNames = [words(d.baseName)[0], words(d.cut)[0]].filter(Boolean)
  if (firstNames.some((w) => wordMatches(q[0], w, q.length === 1))) return true
  return q.some((w) => PROCESSED_QUERY_WORDS.some((p) => w.startsWith(p)))
}

/** Preferenza tra voci con la stessa etichetta: dataset curato, poi Foundation, poi SR Legacy. */
function sourcePriority(r: FoodResult): number {
  if (r.id.startsWith('gen:')) return 0
  if (r.dataType === 'Foundation') return 1
  if (r.dataType === 'SR Legacy') return 2
  return 3
}

/** Rimuove i doppioni con la stessa etichetta italiana, tenendo la fonte preferita. */
export function dedupeByLabel(results: FoodResult[]): FoodResult[] {
  const best = new Map<string, FoodResult>()
  for (const r of results) {
    const key = r.name.toLowerCase()
    const current = best.get(key)
    if (!current || sourcePriority(r) < sourcePriority(current)) best.set(key, r)
  }
  return results.filter((r) => best.get(r.name.toLowerCase()) === r)
}

interface Ranked {
  r: FoodResult
  tier: number
}

/**
 * Ordine dentro lo stesso livello: per nome base, poi senza taglio prima dei tagli (in ordine
 * alfabetico); per ogni alimento prima la voce base e quelle crude, poi varietà e altre
 * informazioni in ordine alfabetico, infine gli stati di cottura (crudo prima di cotto).
 */
function compare(a: Ranked, b: Ranked): number {
  if (a.tier !== b.tier) return b.tier - a.tier
  const da = a.r.display!
  const db = b.r.display!
  const byText = (x: string, y: string) => x.localeCompare(y, 'it', { sensitivity: 'base' })
  const baseCmp = byText(da.baseName, db.baseName)
  if (baseCmp) return baseCmp
  if (!!da.cut !== !!db.cut) return da.cut ? 1 : -1
  const cutCmp = byText(da.cut ?? '', db.cut ?? '')
  if (cutCmp) return cutCmp
  const cooked = (d: typeof da) => Math.max(0, ...d.details.map(stateRank)) > 1
  if (cooked(da) !== cooked(db)) return cooked(da) ? 1 : -1
  const info = (d: typeof da) => d.details.filter((x) => !isStateDetail(x)).join(', ')
  const ia = info(da)
  const ib = info(db)
  if (!!ia !== !!ib) return ia ? 1 : -1
  const infoCmp = byText(ia, ib)
  if (infoCmp) return infoCmp
  const state = (d: typeof da) => Math.max(-1, ...d.details.map(stateRank))
  return state(da) - state(db) || byText(formatFoodLabel(da), formatFoodLabel(db))
}

export interface RankedGeneric {
  /** Alimenti semplici e trasformati cercati esplicitamente, in ordine. */
  main: FoodResult[]
  /** Prodotti trasformati non richiesti: mostrati solo espandendo la sezione. */
  processed: FoodResult[]
}

/** Ordina gli alimenti generici (dataset + USDA live) e separa i trasformati non richiesti. */
export function rankGenericResults(query: string, results: FoodResult[], limit = 30): RankedGeneric {
  const q = canonicalTokens(query)
  const candidates = dedupeByLabel(results.filter((r) => r.display))
  const allowPrefix = !candidates.some((r) => matchTier(q, r) > 0)
  const ranked = candidates.map((r) => ({ r, tier: matchTier(q, r, allowPrefix) || TIER.other })).sort(compare)
  const main: FoodResult[] = []
  const processed: FoodResult[] = []
  for (const { r } of ranked) (r.isPrimitive || isExplicitRequest(q, r) ? main : processed).push(r)
  return { main: main.slice(0, limit), processed: processed.slice(0, limit) }
}
