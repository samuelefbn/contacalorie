import { describe, expect, it } from 'vitest'
import { createSearchCache } from './cache'
import type { FoodResult } from './types'

const results: FoodResult[] = [
  {
    id: 'off:1',
    name: 'Latte',
    brand: null,
    source: 'off',
    kcal100: 64,
    protein100: 3.3,
    carbs100: 4.8,
    fat100: 3.6,
    servingGrams: 200,
    barcode: '1',
    imageUrl: null,
  },
]

function fakeStorage() {
  const map = new Map<string, string>()
  return {
    map,
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  }
}

describe('cache delle ricerche', () => {
  it('scade dopo 24 ore', () => {
    let now = 0
    const cache = createSearchCache({ storage: null, now: () => now })
    cache.set('latte', { results, source: 'off' })
    now = 24 * 60 * 60 * 1000 - 1
    expect(cache.get('latte')?.results).toEqual(results)
    now += 1
    expect(cache.get('latte')).toBeNull()
  })

  it('persiste in sessionStorage tra istanze (es. ricarica della pagina)', () => {
    const storage = fakeStorage()
    createSearchCache({ storage }).set('Latte  intero', { results, source: 'off' })
    expect(storage.map.size).toBe(1)
    const reloaded = createSearchCache({ storage })
    expect(reloaded.get('latte intero')).toEqual({ results, source: 'off' })
  })

  it('ignora dati corrotti o archiviazione non disponibile', () => {
    const storage = fakeStorage()
    storage.map.set('contacalorie:food-search:v1:latte', '{non json')
    expect(createSearchCache({ storage }).get('latte')).toBeNull()

    const broken = {
      getItem: () => {
        throw new Error('bloccato')
      },
      setItem: () => {
        throw new Error('pieno')
      },
      removeItem: () => {},
    }
    const cache = createSearchCache({ storage: broken })
    cache.set('latte', { results, source: 'off' })
    expect(cache.get('latte')?.results).toEqual(results) // resta in memoria
  })
})
