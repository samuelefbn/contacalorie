import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mapProduct, searchProducts } from './openFoodFacts'

describe('mapProduct', () => {
  it('mappa un prodotto completo', () => {
    const item = mapProduct({
      code: '8000000000001',
      product_name: 'Pasta',
      product_name_it: 'Spaghetti n.5',
      brands: 'Marca, Altra',
      serving_quantity: '80',
      nutriments: { 'energy-kcal_100g': 359, proteins_100g: 13, carbohydrates_100g: 70.2, fat_100g: '1,5' },
    })
    expect(item).toMatchObject({
      name: 'Spaghetti n.5',
      brand: 'Marca',
      barcode: '8000000000001',
      defaultGrams: 80,
      source: 'off',
      per100: { kcal: 359, protein: 13, carbs: 70.2, fat: 1.5 },
    })
  })

  it('ricava le kcal dai kJ se mancano', () => {
    const item = mapProduct({ product_name: 'Mela', nutriments: { energy_100g: 218 } })
    expect(item?.per100.kcal).toBe(52)
    expect(item?.defaultGrams).toBe(100)
  })

  it('scarta prodotti senza nome o energia', () => {
    expect(mapProduct({ nutriments: { 'energy-kcal_100g': 100 } })).toBeNull()
    expect(mapProduct({ product_name: 'Sconosciuto', nutriments: {} })).toBeNull()
  })
})

describe('ripetizione delle richieste', () => {
  const okBody = { products: [{ product_name: 'Yogurt', nutriments: { 'energy-kcal_100g': 60 } }] }
  const ok = () => new Response(JSON.stringify(okBody), { status: 200 })

  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('navigator', { onLine: true })
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('ritenta dopo errori di rete e 503 (OFF sovraccarico)', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(ok())
    vi.stubGlobal('fetch', fetchMock)
    const p = searchProducts('yogurt')
    await vi.runAllTimersAsync()
    await expect(p).resolves.toHaveLength(1)
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('si arrende dopo 3 tentativi con un messaggio chiaro', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    vi.stubGlobal('fetch', fetchMock)
    const p = searchProducts('yogurt')
    const assertion = expect(p).rejects.toThrow(/sovraccarico/)
    await vi.runAllTimersAsync()
    await assertion
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('non ritenta su 429 né da offline', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 429 }))
    vi.stubGlobal('fetch', fetchMock)
    await expect(searchProducts('yogurt')).rejects.toThrow(/Troppe ricerche/)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    vi.stubGlobal('navigator', { onLine: false })
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    await expect(searchProducts('yogurt')).rejects.toThrow(/offline/)
  })
})
