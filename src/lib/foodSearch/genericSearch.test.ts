import { describe, expect, it } from 'vitest'
import { canonical, createGenericSearch, genericToResult, normalizeQuery, queryTokens, SCORE } from './genericSearch'
import type { GenericFood } from './genericTypes'

// Solo dati di prova per il ranking: i valori nutrizionali reali arrivano dallo script USDA.
const food = (id: string, name: string, synonyms: string[] = []): GenericFood => ({
  id,
  name,
  synonyms,
  category: 'test',
  state: null,
  kcal100: 1,
  protein100: 0,
  carbs100: 0,
  fat100: 0,
  source: 'USDA',
  fdcId: id.length,
  usdaDescription: '',
  dataType: 'SR Legacy',
  portions: [],
})

describe('normalizzazione della query', () => {
  it('minuscolo, senza accenti, senza stopword', () => {
    expect(queryTokens('Petto DI Pollo alla Griglia')).toEqual(['petto', 'pollo', 'griglia'])
    expect(queryTokens("Caffè, olio d'oliva")).toEqual(['caffe', 'olio', 'oliva'])
    expect(queryTokens('pasta con il tonno')).toEqual(['pasta', 'tonno'])
  })

  it('singolare e plurale hanno la stessa forma canonica', () => {
    expect(canonical('mele')).toBe(canonical('mela'))
    expect(canonical('zucchine')).toBe(canonical('zucchina'))
    expect(canonical('pomodori')).toBe(canonical('pomodoro'))
    expect(canonical('uova')).toBe(canonical('uovo'))
    expect(canonical('cruda')).toBe(canonical('crudo'))
    expect(normalizeQuery('Le Mele')).toBe(normalizeQuery('mela'))
  })
})

describe('ranking dei match', () => {
  const search = createGenericSearch([
    food('a', 'Mela, senza buccia', ['mela sbucciata']),
    food('b', 'Mela, con buccia', ['mela', 'mele']),
    food('c', 'Succo con polpa di mela verde'),
    food('d', 'Zucchine, crude', ['zucchina', 'zucchine']),
    food('e', 'Zucchine, lessate', ['zucchine cotte']),
    food('f', 'Petto di pollo, crudo', ['pollo', 'petto di pollo']),
  ])

  it('esatto > inizia con > contiene', () => {
    const r = search('mela')
    expect(r.map((m) => m.food.id)).toEqual(['b', 'a', 'c'])
    expect(r.map((m) => m.score)).toEqual([SCORE.exact, SCORE.startsWith, SCORE.contains])
  })

  it('plurali e prefissi mentre si scrive', () => {
    expect(search('mele')[0].food.id).toBe('b')
    expect(search('zucchina').map((m) => m.food.id)).toEqual(['d', 'e'])
    expect(search('zucch').map((m) => m.food.id)).toEqual(['d', 'e'])
  })

  it('errori di battitura con ricerca approssimata', () => {
    const r = search('zuchine')
    expect(r.slice(0, 2).map((m) => m.food.id).sort()).toEqual(['d', 'e'])
    expect(r[0]?.score).toBeLessThanOrEqual(SCORE.fuzzy)
  })

  it('nessun risultato per query troppo corte o senza senso', () => {
    expect(search('a')).toEqual([])
    expect(search('xqzwy')).toEqual([])
  })

  it('converte in FoodResult generico con fonte USDA e porzione', () => {
    const r = genericToResult({ ...food('m', 'Mela, con buccia'), portions: [{ label: '1 mela media', grams: 180 }] })
    expect(r).toMatchObject({ id: 'gen:m', kind: 'generic', source: 'usda', servingGrams: 180 })
  })
})
