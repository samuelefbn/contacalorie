import { describe, expect, it } from 'vitest'
import { createGenericSearch } from '../src/lib/foodSearch/genericSearch'
import type { GenericFood } from '../src/lib/foodSearch/genericTypes'
import { GENERIC_FOOD_DEFS } from './genericFoods.defs'
import { matchesDef, pickUsdaFood } from './usdaPicker'

// Indice costruito dalle definizioni (nomi e sinonimi reali) con valori segnaposto, solo per i test.
const search = createGenericSearch(
  GENERIC_FOOD_DEFS.map(
    (d, i): GenericFood => ({
      id: d.id,
      name: d.name,
      synonyms: d.synonyms,
      category: d.category,
      state: d.state ?? null,
      kcal100: 0,
      protein100: 0,
      carbs100: 0,
      fat100: 0,
      source: 'USDA',
      fdcId: i + 1,
      usdaDescription: '',
      dataType: '',
      portions: d.portions ?? [],
    }),
  ),
)
const names = (q: string) => search(q, 30).map((m) => m.food.name)

describe('definizioni del dataset generico', () => {
  it('circa 300 alimenti con id univoci', () => {
    expect(GENERIC_FOOD_DEFS.length).toBeGreaterThanOrEqual(250)
    expect(new Set(GENERIC_FOOD_DEFS.map((d) => d.id)).size).toBe(GENERIC_FOOD_DEFS.length)
  })

  it('ogni definizione può corrispondere a una descrizione USDA che contiene i suoi termini', () => {
    const impossible = GENERIC_FOOD_DEFS.filter((d) => !matchesDef(d, d.match.map((m) => m.split('|')[0]).join(', ')))
    expect(impossible.map((d) => d.name)).toEqual([])
  })

  it('carni e pesci hanno sempre la variante cruda e quella cotta', () => {
    for (const cat of ['carne', 'pesce'] as const) {
      const defs = GENERIC_FOOD_DEFS.filter((d) => d.category === cat)
      expect(defs.some((d) => d.state === 'crudo')).toBe(true)
      expect(defs.some((d) => d.state && d.state !== 'crudo')).toBe(true)
    }
    expect(names('salsiccia')).toEqual(expect.arrayContaining(['Salsiccia di maiale, fresca', 'Salsiccia di maiale, cotta']))
    expect(names('petto di pollo')).toEqual(expect.arrayContaining(['Petto di pollo, crudo', 'Petto di pollo, arrosto']))
  })

  it.each([
    ['pollo', ['Petto di pollo, crudo', 'Coscia di pollo con pelle, cruda', 'Fusello di pollo, crudo']],
    ['salsiccia', ['Salsiccia di maiale, fresca']],
    ['mela', ['Mela, con buccia']],
    ['mele', ['Mela, con buccia']],
    ['zucchine', ['Zucchine, crude', 'Zucchine, lessate']],
    ['banana', ['Banana']],
    ['petto di tacchino', ['Petto di tacchino, crudo', 'Petto di tacchino, arrosto']],
    ['pomodoro', ['Pomodoro, crudo']],
    ['insalata', ['Insalata verde, lattuga']],
    ['maiale', ['Lonza di maiale, cruda']],
    ['manzo', ['Macinato di manzo 15% grassi, crudo', 'Bistecca di manzo magra, cruda']],
    ['uovo', ['Uovo intero, crudo', 'Uovo sodo']],
    ['uova', ['Uovo intero, crudo']],
    ['riso', ['Riso bianco, crudo', 'Riso bianco, cotto']],
    ['pasta', ['Pasta di semola, cruda', 'Pasta di semola, cotta']],
    ['pasta cruda', ['Pasta di semola, cruda']],
  ])('"%s" restituisce alimenti generici', (query, expected) => {
    const found = names(query)
    expect(found).toEqual(expect.arrayContaining(expected))
    expect(found[0]).toBe(expected[0])
  })
})

describe('scelta della voce USDA nello script', () => {
  const def = GENERIC_FOOD_DEFS.find((d) => d.id === 'petto-di-pollo-crudo')!
  const nutrients = (kcal: number) => [
    { nutrientId: 1008, unitName: 'KCAL', value: kcal },
    { nutrientId: 1003, unitName: 'G', value: 22.5 },
    { nutrientId: 1004, unitName: 'G', value: 2.6 },
    { nutrientId: 1005, unitName: 'G', value: 0 },
  ]

  it('rispetta termini obbligatori ed esclusioni', () => {
    expect(matchesDef(def, 'Chicken, broilers or fryers, breast, meat only, raw')).toBe(true)
    expect(matchesDef(def, 'Chicken, broilers or fryers, breast, meat and skin, raw')).toBe(false)
    expect(matchesDef(def, 'Chicken, broilers or fryers, breast, meat only, cooked, roasted')).toBe(false)
    expect(matchesDef(def, 'Babyfood, chicken, breast, meat only, raw')).toBe(false)
  })

  it('preferisce SR Legacy e la descrizione più generica, scartando valori incoerenti', () => {
    const picked = pickUsdaFood(def, [
      { fdcId: 1, description: 'Chicken, broilers or fryers, breast, meat only, raw', dataType: 'SR Legacy', foodNutrients: nutrients(-5) },
      { fdcId: 2, description: 'Chicken, breast, boneless, skinless, meat only, raw', dataType: 'Foundation', foodNutrients: nutrients(120) },
      { fdcId: 3, description: 'Chicken, broilers or fryers, breast, meat only, raw', dataType: 'SR Legacy', foodNutrients: nutrients(120) },
      { fdcId: 4, description: 'Chicken, broilers or fryers, breast, meat and skin, raw', dataType: 'SR Legacy', foodNutrients: nutrients(172) },
    ])
    expect(picked?.fdcId).toBe(3)
    expect(pickUsdaFood(def, [])).toBeNull()
  })
})
