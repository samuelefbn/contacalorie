import Fuse from 'fuse.js'
import type { Food } from '../types'
import { normalize } from './text'

/**
 * Ricerca nei "miei alimenti", interamente sul dispositivo: Firestore non fa ricerca testuale,
 * quindi la lista dell'utente (già in memoria grazie al listener, disponibile anche offline)
 * viene cercata con Fuse.js su nome, marca e codice a barre, ignorando accenti e maiuscole.
 */

const DAY_MS = 24 * 60 * 60 * 1000
/** Dopo due settimane senza usarlo, un alimento "pesa" circa un terzo. */
const RECENCY_DAYS = 14

/** Punteggio di utilizzo: più usi e uso recente = più in alto. */
export function usageScore(f: Pick<Food, 'useCount' | 'lastUsedAt'>, now: number): number {
  const last = f.lastUsedAt?.getTime() ?? 0
  const days = last ? Math.max(0, (now - last) / DAY_MS) : 365
  return (1 + f.useCount) * Math.exp(-days / RECENCY_DAYS)
}

interface Indexed {
  food: Food
  name: string
  brand: string
  barcode: string
}

export function createMyFoodsSearch(foods: Food[], now = Date.now()) {
  const docs: Indexed[] = foods.map((food) => ({
    food,
    name: normalize(food.name),
    brand: normalize(food.brand ?? ''),
    barcode: food.barcode ?? '',
  }))
  const fuse = new Fuse(docs, {
    keys: [
      { name: 'name', weight: 2 },
      { name: 'brand', weight: 1 },
      { name: 'barcode', weight: 1 },
    ],
    threshold: 0.3,
    ignoreLocation: true,
  })
  const score = new Map(foods.map((f) => [f.id, usageScore(f, now)]))

  return function search(query: string, limit = 8): Food[] {
    const q = normalize(query)
    if (q.length < 2) return []
    const words = q.split(/\s+/)
    // Prima chi contiene tutte le parole (o il codice a barre), poi le corrispondenze approssimate (errori di battitura).
    const exact = docs.filter((d) => {
      const text = `${d.name} ${d.brand}`
      return words.every((w) => text.includes(w)) || (/^\d+$/.test(q) && d.barcode.startsWith(q))
    })
    const exactIds = new Set(exact.map((d) => d.food.id))
    const fuzzy = fuse
      .search(q)
      .map((r) => r.item)
      .filter((d) => !exactIds.has(d.food.id))
    const byUsage = (a: Indexed, b: Indexed) =>
      score.get(b.food.id)! - score.get(a.food.id)! || a.name.localeCompare(b.name, 'it')
    return [...exact.sort(byUsage), ...fuzzy.sort(byUsage)].slice(0, limit).map((d) => d.food)
  }
}
