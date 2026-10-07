import { describe, expect, it } from 'vitest'
import { mapProduct } from './openFoodFacts'

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
