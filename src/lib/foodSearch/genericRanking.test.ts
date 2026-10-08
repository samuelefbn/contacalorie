import { describe, expect, it } from 'vitest'
import { dedupeByLabel, rankGenericResults } from './genericRanking'
import type { FoodResult } from './types'
import { usdaFoodToResult, type UsdaFood } from './usdaMap'

const nutrients = (kcal = 52) => [
  { nutrientId: 1008, unitName: 'KCAL', value: kcal },
  { nutrientId: 1003, unitName: 'G', value: 0.3 },
  { nutrientId: 1004, unitName: 'G', value: 0.2 },
  { nutrientId: 1005, unitName: 'G', value: 13.8 },
]
const usda = (fdcId: number, description: string, foodCategory: string, dataType = 'SR Legacy'): UsdaFood => ({
  fdcId,
  description,
  foodCategory,
  dataType,
  foodNutrients: nutrients(),
})
const fromUsda = (foods: UsdaFood[]) => foods.map(usdaFoodToResult).filter((r): r is FoodResult => r !== null)

// Risultati USDA live tipici per "mela" (query tradotta in "apple"), come nello screenshot.
const APPLE_SEARCH = fromUsda([
  usda(1, 'Croissants, apple', 'Baked Products'),
  usda(2, 'Strudel, apple', 'Baked Products'),
  usda(3, 'Babyfood, juice, apple', 'Baby Foods'),
  usda(4, 'Fruit butters, apple', 'Sweets'),
  usda(5, 'Apple juice, canned or bottled, unsweetened, without added ascorbic acid', 'Fruits and Fruit Juices'),
  usda(6, 'Apples, raw, with skin', 'Fruits and Fruit Juices'),
  usda(7, 'Apples, raw, fuji, with skin', 'Fruits and Fruit Juices'),
  usda(8, 'Apples, fuji, with skin, raw', 'Fruits and Fruit Juices', 'Foundation'),
  usda(9, 'Apples, raw, gala, with skin', 'Fruits and Fruit Juices'),
  usda(10, 'Apples, raw, without skin', 'Fruits and Fruit Juices'),
  usda(11, 'Apples, raw, without skin, cooked, boiled', 'Fruits and Fruit Juices'),
])

const datasetApple: FoodResult = {
  id: 'gen:frutta-mela',
  name: 'Frutta - Mela',
  brand: null,
  source: 'usda',
  kind: 'generic',
  kcal100: 52,
  protein100: 0.3,
  carbs100: 13.8,
  fat100: 0.2,
  servingGrams: 180,
  barcode: null,
  imageUrl: null,
  fdcId: 999,
  display: { category: 'Frutta', baseName: 'Mela', details: [] },
  isPrimitive: true,
  synonyms: ['mela', 'mele'],
}

const ENGLISH = /\b(raw|with|without|skin|apples?|croissants?|juice|strudel,|cooked|boiled|chicken|breast)\b/i

describe('ranking degli alimenti generici', () => {
  const { main, processed } = rankGenericResults('mela', [datasetApple, ...APPLE_SEARCH])
  const names = main.map((r) => r.name)

  it('per "mela" i primi risultati sono mele, non croissant, strudel o baby food', () => {
    expect(names[0]).toBe('Frutta - Mela')
    expect(names.slice(0, 6).every((n) => n.startsWith('Frutta - Mela'))).toBe(true)
    expect(names.some((n) => /Cornetto|Strudel|Crema di frutta|Succo|Omogeneizzato/.test(n))).toBe(false)
  })

  it('dentro lo stesso alimento: base, poi varietà/info in ordine alfabetico, poi cotture', () => {
    expect(names).toEqual([
      'Frutta - Mela',
      'Frutta - Mela (con buccia, cruda)',
      'Frutta - Mela (Fuji, con buccia, cruda)',
      'Frutta - Mela (Gala, con buccia, cruda)',
      'Frutta - Mela (senza buccia, cruda)',
      'Frutta - Mela (senza buccia, lessata)',
    ])
  })

  it('i trasformati finiscono nella sezione espandibile; il baby food è escluso del tutto', () => {
    expect(processed.map((r) => r.name)).toEqual(
      expect.arrayContaining([
        'Dolci - Cornetto (alla mela)',
        'Dolci - Strudel (alla mela)',
        'Dolci - Crema di frutta (alla mela)',
        'Bevande - Succo di mela (non zuccherato)',
      ]),
    )
    expect([...main, ...processed].some((r) => /Omogeneizzato/.test(r.name))).toBe(false)
  })

  it('nessun testo inglese nei nomi mostrati', () => {
    for (const r of [...main, ...processed]) expect(r.name, r.name).not.toMatch(ENGLISH)
  })

  it('deduplica la stessa etichetta preferendo Foundation', () => {
    const fuji = main.filter((r) => r.name === 'Frutta - Mela (Fuji, con buccia, cruda)')
    expect(fuji).toHaveLength(1)
    expect(fuji[0].dataType).toBe('Foundation')
    expect(dedupeByLabel([APPLE_SEARCH[5], { ...APPLE_SEARCH[5], id: 'usda:x' }])).toHaveLength(1)
  })

  it('i trasformati compaiono se cercati esplicitamente', () => {
    expect(rankGenericResults('succo di mela', APPLE_SEARCH).main[0].name).toBe('Bevande - Succo di mela (non zuccherato)')
    expect(rankGenericResults('strudel', APPLE_SEARCH).main.map((r) => r.name)).toContain('Dolci - Strudel (alla mela)')
    expect(rankGenericResults('torta di mele', APPLE_SEARCH).main.map((r) => r.name)).toContain('Dolci - Strudel (alla mela)')
  })
})

describe('ranking per la carne', () => {
  const chicken = fromUsda([
    usda(20, 'Frankfurter, chicken', 'Sausages and Luncheon Meats'),
    usda(21, 'Chicken, broilers or fryers, thigh, meat only, cooked, roasted', 'Poultry Products'),
    usda(22, 'Chicken, broilers or fryers, breast, meat only, raw', 'Poultry Products'),
    usda(23, 'Chicken, broilers or fryers, meat and skin, raw', 'Poultry Products'),
    usda(24, 'Chicken, broilers or fryers, breast, meat only, cooked, roasted', 'Poultry Products'),
    usda(25, 'Chicken, broilers or fryers, thigh, meat only, raw', 'Poultry Products'),
  ])

  it('"pollo": prima il pollo intero, poi i tagli in ordine alfabetico, crudo prima di cotto; salumi in fondo', () => {
    const { main, processed } = rankGenericResults('pollo', chicken)
    expect(main.map((r) => r.name)).toEqual([
      'Carne - Pollo (con pelle, crudo)',
      'Carne - Pollo, coscia (solo polpa, cruda)',
      'Carne - Pollo, coscia (solo polpa, arrosto)',
      'Carne - Pollo, petto (solo polpa, crudo)',
      'Carne - Pollo, petto (solo polpa, arrosto)',
    ])
    expect(processed.map((r) => r.name)).toEqual(['Salumi - Würstel (di pollo)'])
  })

  it('"petto di pollo" mette il petto per primo', () => {
    expect(rankGenericResults('petto di pollo', chicken).main[0].name).toBe('Carne - Pollo, petto (solo polpa, crudo)')
  })
})
