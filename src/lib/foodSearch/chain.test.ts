import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSearchCache } from './cache'
import { HttpError } from './http'
import { AllSourcesFailedError, OfflineError, searchFoods, type SearchSource } from './index'
import type { FoodResult } from './types'

const result = (source: FoodResult['source'], name = 'Mela'): FoodResult => ({
  id: `${source}:1`,
  name,
  brand: null,
  source,
  kcal100: 52,
  protein100: 0.3,
  carbs100: 13.8,
  fat100: 0.2,
  servingGrams: null,
  barcode: null,
  imageUrl: null,
})

const source = (name: string, s: FoodResult['source'], impl: SearchSource['search']): SearchSource => ({
  name,
  source: s,
  search: vi.fn(impl),
})

const memoryCache = () => createSearchCache({ storage: null })

describe('catena di fonti', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('con 503 sulla prima fonte usa la seconda', async () => {
    const first = source('A', 'off', () => Promise.reject(new HttpError(503)))
    const second = source('B', 'off', () => Promise.resolve([result('off')]))
    const third = source('C', 'usda', () => Promise.resolve([result('usda')]))
    const out = await searchFoods('mela', { sources: [first, second, third], cache: memoryCache() })
    expect(out.source).toBe('off')
    expect(out.results).toHaveLength(1)
    expect(out.failures.map((f) => f.name)).toEqual(['A'])
    expect(third.search).not.toHaveBeenCalled()
  })

  it('con risultati vuoti passa alla fonte successiva (USDA)', async () => {
    const first = source('A', 'off', () => Promise.resolve([]))
    const second = source('B', 'off', () => Promise.reject(new HttpError(429)))
    const third = source('C', 'usda', () => Promise.resolve([result('usda', 'Apples, raw')]))
    const out = await searchFoods('mela', { sources: [first, second, third], cache: memoryCache() })
    expect(out).toMatchObject({ source: 'usda', results: [{ name: 'Apples, raw' }] })
  })

  it("dà errore solo se TUTTE le fonti falliscono", async () => {
    const failing = [
      source('A', 'off', () => Promise.reject(new HttpError(503))),
      source('B', 'off', () => Promise.reject(new TypeError('Failed to fetch'))),
      source('C', 'usda', () => Promise.reject(new HttpError(500))),
    ]
    const err = await searchFoods('mela', { sources: failing, cache: memoryCache() }).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(AllSourcesFailedError)
    expect((err as AllSourcesFailedError).failures).toHaveLength(3)

    // Se almeno una fonte ha risposto (anche senza risultati) non è un errore.
    const mixed = [failing[0], source('B', 'off', () => Promise.resolve([])), failing[2]]
    await expect(searchFoods('xyz', { sources: mixed, cache: memoryCache() })).resolves.toMatchObject({
      results: [],
      source: null,
    })
  })

  it("l'annullamento interrompe la catena", async () => {
    const aborting = source('A', 'off', () => Promise.reject(new DOMException('x', 'AbortError')))
    const next = source('B', 'off', () => Promise.resolve([result('off')]))
    await expect(searchFoods('mela', { sources: [aborting, next], cache: memoryCache() })).rejects.toMatchObject({
      name: 'AbortError',
    })
    expect(next.search).not.toHaveBeenCalled()
  })

  it('usa la cache e non richiama le fonti per la stessa query', async () => {
    const cache = memoryCache()
    const s = source('A', 'off', () => Promise.resolve([result('off')]))
    await searchFoods('Mela', { sources: [s], cache })
    const again = await searchFoods('  mela ', { sources: [s], cache })
    expect(again.fromCache).toBe(true)
    expect(s.search).toHaveBeenCalledTimes(1)
  })

  it('offline: risponde dalla cache, altrimenti errore dedicato', async () => {
    const cache = memoryCache()
    const s = source('A', 'off', () => Promise.resolve([result('off')]))
    await searchFoods('mela', { sources: [s], cache })
    vi.stubGlobal('navigator', { onLine: false })
    await expect(searchFoods('mela', { sources: [s], cache })).resolves.toMatchObject({ fromCache: true })
    await expect(searchFoods('pera', { sources: [s], cache })).rejects.toBeInstanceOf(OfflineError)
  })

  it('ignora query con meno di 2 caratteri', async () => {
    const s = source('A', 'off', () => Promise.resolve([result('off')]))
    await expect(searchFoods('m', { sources: [s], cache: memoryCache() })).resolves.toMatchObject({ results: [] })
    expect(s.search).not.toHaveBeenCalled()
  })
})
