import { describe, expect, it } from 'vitest'
import { createGenericSearch, genericToResult } from './genericSearch'
import type { GenericFood } from './genericTypes'
import { canonical, normalizeQuery, queryTokens } from './queryText'
import { rankGenericResults } from './genericRanking'

// Solo dati di prova per la ricerca: i valori nutrizionali reali arrivano dallo script USDA.
const food = (id: string, baseName: string, details: string[] = [], synonyms: string[] = [], extra: Partial<GenericFood> = {}): GenericFood => ({
  id,
  category: 'Frutta',
  baseName,
  details,
  isPrimitive: true,
  synonyms,
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
  ...extra,
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

describe('ricerca nel dataset', () => {
  const foods = [
    food('mela-senza-buccia', 'Mela', ['senza buccia'], ['mela sbucciata']),
    food('mela', 'Mela', [], ['mela', 'mele']),
    food('succo', 'Succo di mela', [], [], { category: 'Bevande', isPrimitive: false }),
    food('zucchina-cruda', 'Zucchina', ['cruda'], ['zucchine'], { category: 'Verdura' }),
    food('zucchina-lessata', 'Zucchina', ['lessata'], ['zucchine cotte'], { category: 'Verdura' }),
    food('pollo-petto', 'Pollo', ['crudo'], ['petto di pollo'], { category: 'Carne', cut: 'petto' }),
  ]
  const search = createGenericSearch(foods)
  const ranked = (q: string) => rankGenericResults(q, search(q))

  it('trova per nome base, plurale, prefisso e sinonimi', () => {
    expect(ranked('mela').main.map((r) => r.name)).toEqual(['Frutta - Mela', 'Frutta - Mela (senza buccia)'])
    expect(ranked('mele').main[0].name).toBe('Frutta - Mela')
    expect(ranked('zucch').main.map((r) => r.name)).toEqual(['Verdura - Zucchina (cruda)', 'Verdura - Zucchina (lessata)'])
    expect(ranked('petto di pollo').main[0].name).toBe('Carne - Pollo, petto (crudo)')
  })

  it('il succo (trasformato) non compare tra i risultati principali di "mela"', () => {
    const { main, processed } = ranked('mela')
    expect(main.map((r) => r.name)).not.toContain('Bevande - Succo di mela')
    expect(processed.map((r) => r.name)).toEqual(['Bevande - Succo di mela'])
  })

  it('tollera gli errori di battitura', () => {
    expect(search('zuchine').map((r) => r.display?.baseName)).toContain('Zucchina')
  })

  it('nessun risultato per query troppo corte o senza senso', () => {
    expect(search('a')).toEqual([])
    expect(search('xqzwy')).toEqual([])
  })

  it('converte in FoodResult con etichetta italiana, porzione e flag primitivo', () => {
    const r = genericToResult({ ...food('m', 'Mela'), portions: [{ label: '1 mela media', grams: 180 }] })
    expect(r).toMatchObject({ id: 'gen:m', name: 'Frutta - Mela', kind: 'generic', servingGrams: 180, isPrimitive: true })
  })
})
