import { describe, expect, it } from 'vitest'
import { createGenericSearch } from '../src/lib/foodSearch/genericSearch'
import { rankGenericResults } from '../src/lib/foodSearch/genericRanking'
import { formatFoodLabel } from '../src/lib/foodSearch/display'
import { usdaToItalian } from '../src/lib/foodSearch/usdaToItalian'
import type { GenericFood } from '../src/lib/foodSearch/genericTypes'
import { GENERIC_FOOD_DEFS } from './genericFoods.defs'
import { matchesDef, pickUsdaFood } from './usdaPicker'

// Indice costruito dalle definizioni (nomi e sinonimi reali) con valori segnaposto, solo per i test.
const search = createGenericSearch(
  GENERIC_FOOD_DEFS.map(
    (d, i): GenericFood => ({
      id: d.id,
      ...d.display,
      isPrimitive: d.isPrimitive,
      synonyms: d.synonyms,
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
const names = (q: string) => rankGenericResults(q, search(q, 60), 60).main.map((r) => r.name)

describe('definizioni del dataset generico', () => {
  it('circa 300 alimenti con id univoci', () => {
    expect(GENERIC_FOOD_DEFS.length).toBeGreaterThanOrEqual(250)
    expect(new Set(GENERIC_FOOD_DEFS.map((d) => d.id)).size).toBe(GENERIC_FOOD_DEFS.length)
  })

  it('ogni definizione può corrispondere a una descrizione USDA che contiene i suoi termini', () => {
    const impossible = GENERIC_FOOD_DEFS.filter((d) => !matchesDef(d, d.match.map((m) => m.split('|')[0]).join(', ')))
    expect(impossible.map((d) => d.id)).toEqual([])
  })

  it('carni e pesci hanno sempre la variante cruda e quella cotta', () => {
    for (const cat of ['Carne', 'Pesce'] as const) {
      const defs = GENERIC_FOOD_DEFS.filter((d) => d.display.category === cat)
      expect(defs.some((d) => d.state === 'crudo')).toBe(true)
      expect(defs.some((d) => d.state && d.state !== 'crudo')).toBe(true)
    }
    expect(names('salsiccia')).toEqual(expect.arrayContaining(['Carne - Maiale, salsiccia (fresca)', 'Carne - Maiale, salsiccia (cotta)']))
    expect(names('petto di pollo')).toEqual(expect.arrayContaining(['Carne - Pollo, petto (crudo)', 'Carne - Pollo, petto (arrosto)']))
  })

  it.each([
    ['mela', ['Frutta - Mela', 'Frutta - Mela (senza buccia)']],
    ['mele', ['Frutta - Mela']],
    ['banana', ['Frutta - Banana']],
    ['zucchine', ['Verdura - Zucchina (cruda)', 'Verdura - Zucchina (lessata)']],
    ['pomodoro', ['Verdura - Pomodoro (crudo)', 'Verdura - Pomodoro (ciliegino, crudo)']],
    ['insalata', ['Verdura - Lattuga (a foglia verde)']],
    ['pollo', ['Carne - Pollo (intero, con pelle, crudo)', 'Carne - Pollo, petto (crudo)']],
    ['petto di pollo', ['Carne - Pollo, petto (crudo)', 'Carne - Pollo, petto (arrosto)']],
    ['salsiccia', ['Carne - Maiale, salsiccia (fresca)', 'Carne - Maiale, salsiccia (cotta)']],
    ['maiale', ['Carne - Maiale, costine (crude)', 'Carne - Maiale, lonza (cruda)']],
    ['manzo', ['Carne - Manzo, macinato (15% grassi, crudo)', 'Carne - Manzo, filetto (crudo)']],
    ['uovo', ['Uova - Uovo (intero, crudo)', 'Uova - Uovo (sodo)']],
    ['uova', ['Uova - Uovo (intero, crudo)']],
    ['riso', ['Cereali e derivati - Riso (bianco, crudo)', 'Cereali e derivati - Riso (bianco, cotto)']],
    ['pasta', ['Cereali e derivati - Pasta (di semola, cruda)', 'Cereali e derivati - Pasta (di semola, cotta)']],
    ['petto di tacchino', ['Carne - Tacchino, petto (crudo)', 'Carne - Tacchino, petto (arrosto)']],
  ])('"%s" restituisce alimenti generici in italiano', (query, expected) => {
    const found = names(query)
    expect(found).toEqual(expect.arrayContaining(expected))
    expect(found.slice(0, 8).every((n) => !/Salumi|Dolci|Bevande/.test(n))).toBe(true)
  })

  it('ogni voce ha un formato "Categoria - Alimento (dettaglio)" valido', () => {
    for (const d of GENERIC_FOOD_DEFS) {
      const label = formatFoodLabel(d.display)
      expect(label).toMatch(/^[A-Z][a-z ]+ - [A-ZÀ-Ü]/)
      expect(d.display.baseName.charAt(0)).toBe(d.display.baseName.charAt(0).toUpperCase())
    }
  })

  it('il traduttore USDA copre tutte le voci del dataset (termini di ricerca come descrizione)', () => {
    const notTranslated = GENERIC_FOOD_DEFS.filter((d) => !usdaToItalian(d.match.map((m) => m.split('|')[0]).join(', ')))
    expect(notTranslated.map((d) => formatFoodLabel(d.display))).toEqual([])
  })
})

describe('scelta della voce USDA nello script', () => {
  const def = GENERIC_FOOD_DEFS.find((d) => d.id === 'carne-pollo-petto-crudo')!
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
