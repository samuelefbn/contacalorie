import { describe, expect, it } from 'vitest'
import { DICTIONARY_SIZE, translateToEnglish } from './translate'

describe('traduzione IT → EN per USDA', () => {
  it('traduce parole singole, plurali e con accenti', () => {
    expect(translateToEnglish('Mela')).toEqual({ text: 'apple', translated: true })
    expect(translateToEnglish('mele').text).toBe('apple')
    expect(translateToEnglish('caffè').text).toBe('coffee')
    expect(translateToEnglish('zucchine').text).toBe('zucchini')
  })

  it('preferisce le espressioni di più parole e ignora le preposizioni', () => {
    expect(translateToEnglish('petto di pollo alla griglia').text).toBe('chicken breast grilled')
    expect(translateToEnglish("olio d'oliva").text).toBe('olive oil')
    expect(translateToEnglish('riso integrale cotto').text).toBe('brown rice cooked')
    expect(translateToEnglish('latte parzialmente scremato').text).toBe('reduced fat milk')
  })

  it('lascia invariate le parole sconosciute', () => {
    expect(translateToEnglish('quinoa rossa bio')).toEqual({ text: 'quinoa rossa bio', translated: true })
    expect(translateToEnglish('nutella')).toEqual({ text: 'nutella', translated: false })
  })

  it('copre gli alimenti comuni', () => {
    expect(DICTIONARY_SIZE).toBeGreaterThanOrEqual(150)
    for (const q of ['pasta', 'latte', 'pollo', 'riso', 'uova', 'tonno', 'yogurt greco', 'pane integrale']) {
      expect(translateToEnglish(q).translated).toBe(true)
    }
  })
})
