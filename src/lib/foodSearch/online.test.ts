import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSearchCache } from './cache'
import { HttpError } from './http'
import {
  allSourcesFailed,
  mergeGeneric,
  OfflineError,
  searchOnline,
  SourcesFailedError,
  type PackagedSource,
} from './index'
import type { FoodResult } from './types'

const result = (over: Partial<FoodResult> = {}): FoodResult => ({
  id: 'x:1',
  name: 'Mela',
  brand: null,
  source: 'usda',
  kind: 'generic',
  kcal100: 52,
  protein100: 0.3,
  carbs100: 13.8,
  fat100: 0.2,
  servingGrams: null,
  barcode: null,
  imageUrl: null,
  ...over,
})

const packaged = (name: string, impl: PackagedSource['search']): PackagedSource => ({ name, search: vi.fn(impl) })
const cache = () => createSearchCache({ storage: null })
const usdaOk = () => Promise.resolve([result({ id: 'usda:1', name: 'Apples, raw, with skin', fdcId: 1 })])
const offOk = () => Promise.resolve([result({ id: 'off:1', name: 'Succo di mela', source: 'off', kind: 'packaged' })])

describe('ricerca online in parallelo', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('interroga SEMPRE i generici, anche quando Open Food Facts trova risultati', async () => {
    const usda = vi.fn(usdaOk)
    const out = await searchOnline('mela', { cache: cache(), usdaSearch: usda, packagedSources: [packaged('OFF', offOk)] })
    expect(usda).toHaveBeenCalledOnce()
    expect(out.usda.map((r) => r.name)).toEqual(['Apples, raw, with skin'])
    expect(out.packaged.map((r) => r.name)).toEqual(['Succo di mela'])
  })

  it('un errore di Open Food Facts non blocca i generici', async () => {
    const out = await searchOnline('pollo', {
      cache: cache(),
      usdaSearch: usdaOk,
      packagedSources: [packaged('A', () => Promise.reject(new HttpError(503))), packaged('B', () => Promise.reject(new TypeError('Failed to fetch')))],
    })
    expect(out.usda).toHaveLength(1)
    expect(out.packagedError).toBeInstanceOf(SourcesFailedError)
    expect(out.usdaError).toBeNull()
  })

  it('un errore di USDA non blocca Open Food Facts', async () => {
    const out = await searchOnline('pasta', {
      cache: cache(),
      usdaSearch: () => Promise.reject(new HttpError(429)),
      packagedSources: [packaged('OFF', offOk)],
    })
    expect(out.packaged).toHaveLength(1)
    expect(out.usdaError).toBeInstanceOf(HttpError)
  })

  it('tra i motori OFF passa al successivo su 503 o risultati vuoti', async () => {
    const second = packaged('B', offOk)
    const out = await searchOnline('nutella', {
      cache: cache(),
      includeUsda: false,
      packagedSources: [packaged('A', () => Promise.reject(new HttpError(503))), second],
    })
    expect(out.packaged).toHaveLength(1)
    expect(out.usdaSkipped).toBe(true)

    const afterEmpty = packaged('B', offOk)
    await searchOnline('biscotti', { cache: cache(), includeUsda: false, packagedSources: [packaged('A', () => Promise.resolve([])), afterEmpty] })
    expect(afterEmpty.search).toHaveBeenCalledOnce()
  })

  it('usa la cache per query e per fonte', async () => {
    const c = cache()
    const usda = vi.fn(usdaOk)
    const off = packaged('OFF', offOk)
    await searchOnline('Mela', { cache: c, usdaSearch: usda, packagedSources: [off] })
    await searchOnline(' mela ', { cache: c, usdaSearch: usda, packagedSources: [off] })
    expect(usda).toHaveBeenCalledOnce()
    expect(off.search).toHaveBeenCalledOnce()
  })

  it("l'annullamento interrompe la ricerca", async () => {
    await expect(
      searchOnline('mela', {
        cache: cache(),
        usdaSearch: () => Promise.reject(new DOMException('x', 'AbortError')),
        packagedSources: [packaged('OFF', offOk)],
      }),
    ).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('offline: errore dedicato per le fonti online', async () => {
    vi.stubGlobal('navigator', { onLine: false })
    const out = await searchOnline('mela', { cache: cache(), usdaSearch: usdaOk, packagedSources: [packaged('OFF', offOk)] })
    expect(out.usdaError).toBeInstanceOf(OfflineError)
    expect(out.packagedError).toBeInstanceOf(OfflineError)
  })
})

describe('errore solo se TUTTE le fonti falliscono', () => {
  const failed = { usda: [], packaged: [], usdaError: new HttpError(503), packagedError: new HttpError(503), usdaSkipped: false }

  it('nessun errore se ci sono risultati locali o dal dataset', () => {
    expect(allSourcesFailed(1, 0, failed)).toBe(false)
    expect(allSourcesFailed(0, 3, failed)).toBe(false)
    expect(allSourcesFailed(0, 0, failed)).toBe(true)
  })

  it('"zero risultati" non è un errore', () => {
    expect(allSourcesFailed(0, 0, { ...failed, usdaError: null })).toBe(false)
    expect(allSourcesFailed(0, 0, { ...failed, packagedError: null })).toBe(false)
  })
})

describe('unione dei generici', () => {
  it('il dataset viene prima e USDA live non duplica lo stesso alimento', () => {
    const fromDataset = [result({ id: 'gen:mela', name: 'Mela, con buccia', fdcId: 171688 })]
    const live = [result({ id: 'usda:171688', fdcId: 171688 }), result({ id: 'usda:2', name: 'Apples, dried', fdcId: 2 })]
    expect(mergeGeneric(fromDataset, live).map((r) => r.id)).toEqual(['gen:mela', 'usda:2'])
  })
})
