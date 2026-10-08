import { normalize } from '../text'

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

export const canonicalTokens = (text: string) => queryTokens(text).map(canonical)

/** Query normalizzata (usata anche come chiave di cache). */
export const normalizeQuery = (text: string) => canonicalTokens(text).join(' ')

const MIN_PREFIX = 3

/** Parola della query (canonica) uguale a quella dell'alimento, o suo prefisso mentre si scrive. */
export function wordMatches(q: string, word: string, allowPrefix: boolean): boolean {
  return q === word || (allowPrefix && q.length >= MIN_PREFIX && word.startsWith(q))
}
