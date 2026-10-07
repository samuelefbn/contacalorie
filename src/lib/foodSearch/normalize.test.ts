import { describe, expect, it } from 'vitest'
import { offProductToResult } from './openFoodFacts'
import { usdaFoodToResult } from './usda'
import { isPlausible, servingGrams } from './validate'

const base = { name: 'x', kcal100: 100, protein100: 5, carbs100: 10, fat100: 3 }

describe('validazione dei valori', () => {
  it('accetta valori coerenti, anche 0 kcal (es. acqua)', () => {
    expect(isPlausible(base)).toBe(true)
    expect(isPlausible({ ...base, kcal100: 0, protein100: 0, carbs100: 0, fat100: 0 })).toBe(true)
    // alcol: kcal ben oltre i macro, ma plausibile
    expect(isPlausible({ ...base, kcal100: 231, protein100: 0, carbs100: 0, fat100: 0 })).toBe(true)
  })

  it('scarta valori incoerenti', () => {
    expect(isPlausible({ ...base, kcal100: -5 })).toBe(false)
    expect(isPlausible({ ...base, kcal100: 1200 })).toBe(false)
    expect(isPlausible({ ...base, protein100: 120 })).toBe(false)
    expect(isPlausible({ ...base, protein100: 50, carbs100: 40, fat100: 30 })).toBe(false) // 120 g di macro
    expect(isPlausible({ ...base, kcal100: 10, carbs100: 70 })).toBe(false) // kcal troppo basse per i macro
    expect(isPlausible({ ...base, kcal100: Number.NaN })).toBe(false)
    expect(isPlausible({ ...base, name: '  ' })).toBe(false)
  })

  it('ricava la porzione in grammi', () => {
    expect(servingGrams(30)).toBe(30)
    expect(servingGrams('125')).toBe(125)
    expect(servingGrams(undefined, '1 vasetto (125 g)')).toBe(125)
    expect(servingGrams(undefined, '250ml')).toBe(250)
    expect(servingGrams(undefined, '2 fette')).toBeNull()
    expect(servingGrams(0)).toBeNull()
  })
})

describe('Open Food Facts → FoodResult', () => {
  const nutriments = { 'energy-kcal_100g': 359, proteins_100g: 13, carbohydrates_100g: 70.2, fat_100g: '1,5' }

  it('ricerca classica: nome e marca come stringhe', () => {
    expect(
      offProductToResult({
        code: '8076800195057',
        product_name: 'Spaghetti',
        product_name_it: 'Spaghetti n.5',
        brands: 'Barilla, Altro',
        serving_quantity: '80',
        nutriments,
      }),
    ).toEqual({
      id: 'off:8076800195057',
      name: 'Spaghetti n.5',
      brand: 'Barilla',
      source: 'off',
      kcal100: 359,
      protein100: 13,
      carbs100: 70.2,
      fat100: 1.5,
      servingGrams: 80,
      barcode: '8076800195057',
      imageUrl: null,
    })
  })

  it('Search-a-licious: nome per lingua e marche come slug della tassonomia', () => {
    const r = offProductToResult({
      code: '1',
      product_name: { main: 'Yaourt', it: 'Yogurt bianco', en: 'Plain yogurt' },
      brands: ['mulino-bianco'],
      serving_size: '1 vasetto (125 g)',
      nutriments,
    })
    expect(r).toMatchObject({ name: 'Yogurt bianco', brand: 'Mulino Bianco', servingGrams: 125 })
  })

  it('ricava le kcal dai kJ se mancano', () => {
    const r = offProductToResult({
      product_name: 'Mela',
      nutriments: { energy_100g: 218, proteins_100g: 0.3, carbohydrates_100g: 11.4, fat_100g: 0.2 },
    })
    expect(r?.kcal100).toBe(52)
  })

  it('non inventa valori: scarta prodotti con macro mancanti o incoerenti', () => {
    expect(offProductToResult({ product_name: 'Senza grassi', nutriments: { 'energy-kcal_100g': 50, proteins_100g: 1, carbohydrates_100g: 10 } })).toBeNull()
    expect(offProductToResult({ product_name: 'Senza nome?', nutriments: {} })).toBeNull()
    expect(offProductToResult({ nutriments })).toBeNull()
    expect(offProductToResult({ product_name: 'Errore', nutriments: { ...nutriments, proteins_100g: 300 } })).toBeNull()
  })
})

describe('USDA → FoodResult', () => {
  const apple = {
    fdcId: 171688,
    description: 'Apples, raw, with skin',
    dataType: 'SR Legacy',
    foodNutrients: [
      { nutrientId: 1003, nutrientNumber: '203', nutrientName: 'Protein', unitName: 'G', value: 0.26 },
      { nutrientId: 1004, nutrientNumber: '204', nutrientName: 'Total lipid (fat)', unitName: 'G', value: 0.17 },
      { nutrientId: 1005, nutrientNumber: '205', nutrientName: 'Carbohydrate, by difference', unitName: 'G', value: 13.81 },
      { nutrientId: 1008, nutrientNumber: '208', nutrientName: 'Energy', unitName: 'KCAL', value: 52 },
      { nutrientId: 1062, nutrientNumber: '268', nutrientName: 'Energy', unitName: 'kJ', value: 218 },
    ],
  }

  it('mappa Energy, Protein, Carbohydrate by difference e Total lipid', () => {
    expect(usdaFoodToResult(apple)).toEqual({
      id: 'usda:171688',
      name: 'Apples, raw, with skin',
      brand: null,
      source: 'usda',
      kcal100: 52,
      protein100: 0.3,
      carbs100: 13.8,
      fat100: 0.2,
      servingGrams: null,
      barcode: null,
      imageUrl: null,
    })
  })

  it('Foundation: usa Energy (Atwater) e i carboidrati per somma se servono', () => {
    const r = usdaFoodToResult({
      fdcId: 2,
      description: 'chicken, breast, raw',
      dataType: 'Foundation',
      foodNutrients: [
        { nutrientId: 2047, nutrientName: 'Energy (Atwater General Factors)', unitName: 'KCAL', value: 120 },
        { nutrientId: 1003, unitName: 'G', value: 22.5 },
        { nutrientId: 1004, unitName: 'G', value: 2.6 },
        { nutrientId: 1050, unitName: 'G', value: 0 },
      ],
    })
    expect(r).toMatchObject({ name: 'Chicken, breast, raw', kcal100: 120, protein100: 22.5, carbs100: 0, fat100: 2.6 })
  })

  it('ricava le kcal dai kJ e scarta alimenti con nutrienti mancanti', () => {
    const noKcal = { ...apple, foodNutrients: apple.foodNutrients.filter((n) => n.nutrientId !== 1008) }
    expect(usdaFoodToResult(noKcal)?.kcal100).toBe(52)
    const noFat = { ...apple, foodNutrients: apple.foodNutrients.filter((n) => n.nutrientId !== 1004) }
    expect(usdaFoodToResult(noFat)).toBeNull()
  })
})
