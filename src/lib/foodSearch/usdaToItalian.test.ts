import { beforeEach, describe, expect, it } from 'vitest'
import { formatFoodLabel } from './display'
import { inflect, resetUntranslated, tokenize, untranslatedReport, usdaToItalian } from './usdaToItalian'

const label = (desc: string, cat?: string) => {
  const t = usdaToItalian(desc, cat)
  return t ? formatFoodLabel(t.display) : null
}

describe('formatFoodLabel', () => {
  it('compone "Categoria - Alimento, taglio (dettagli)"', () => {
    expect(formatFoodLabel({ category: 'Frutta', baseName: 'Mela', details: [] })).toBe('Frutta - Mela')
    expect(formatFoodLabel({ category: 'Frutta', baseName: 'Mela', details: ['Fuji', 'con buccia'] })).toBe('Frutta - Mela (Fuji, con buccia)')
    expect(formatFoodLabel({ category: 'Carne', baseName: 'Pollo', cut: 'petto', details: ['crudo'] })).toBe('Carne - Pollo, petto (crudo)')
    expect(formatFoodLabel({ category: 'Carne', baseName: 'Maiale', cut: 'salsiccia', details: ['cotta'] })).toBe('Carne - Maiale, salsiccia (cotta)')
  })
})

describe('traduzione delle descrizioni USDA', () => {
  beforeEach(() => resetUntranslated())

  it.each([
    ['Apples, raw, fuji, with skin', 'Fruits and Fruit Juices', 'Frutta - Mela (Fuji, con buccia, cruda)'],
    ['Apples, raw, with skin (Includes foods for USDA\'s Food Distribution Program)', undefined, 'Frutta - Mela (con buccia, cruda)'],
    ['Apples, raw, without skin', undefined, 'Frutta - Mela (senza buccia, cruda)'],
    ['Chicken, broilers or fryers, breast, meat only, raw', 'Poultry Products', 'Carne - Pollo, petto (solo polpa, crudo)'],
    ['Chicken, broilers or fryers, thigh, meat and skin, cooked, roasted', undefined, 'Carne - Pollo, coscia (con pelle, arrosto)'],
    ['Chicken, broilers or fryers, drumstick, meat only, raw', undefined, 'Carne - Pollo, sottocoscia (solo polpa, cruda)'],
    ['Sausage, Italian, pork, mild, cooked', 'Sausages and Luncheon Meats', 'Carne - Maiale, salsiccia (cotta)'],
    ['Squash, summer, zucchini, includes skin, raw', undefined, 'Verdura - Zucchina (con buccia, cruda)'],
    ['Tomatoes, red, ripe, raw, year round average', undefined, 'Verdura - Pomodoro (crudo)'],
    ['Bananas, raw', undefined, 'Frutta - Banana (cruda)'],
    ['Egg, whole, cooked, hard-boiled', undefined, 'Uova - Uovo (intero, sodo)'],
    ['Pork, fresh, loin, tenderloin, separable lean only, cooked, roasted', undefined, 'Carne - Maiale, filetto (solo parte magra, arrosto)'],
    ['Beef, ground, 85% lean meat / 15% fat, raw', undefined, 'Carne - Manzo, macinato (15% grassi, crudo)'],
    ['Milk, whole, 3.25% milkfat, with added vitamin D', undefined, 'Latticini - Latte (intero)'],
    ['Fish, salmon, Atlantic, farmed, raw', undefined, "Pesce - Salmone (d'allevamento, crudo)"],
    ['Rice, white, medium-grain, raw, unenriched', undefined, 'Cereali e derivati - Riso (bianco, a chicco medio, crudo)'],
  ])('"%s" → %s', (desc, cat, expected) => {
    expect(label(desc, cat)).toBe(expected)
  })

  // Descrizioni reali segnalate come non tradotte dalla prima generazione del dataset.
  it.each([
    ['Chicken, broilers or fryers, dark meat, thigh, meat only, raw', 'Carne - Pollo, coscia (solo polpa, cruda)'],
    ['Oranges, raw, Florida', 'Frutta - Arancia (cruda)'],
    ['Beef, round, eye of round, roast, separable lean only, trimmed to 1/8" fat, select, raw', 'Carne - Manzo, girello (solo parte magra, crudo)'],
    ['Beef, chuck for stew, separable lean and fat, choice, raw', 'Carne - Manzo, spalla (cruda)'],
    ['Potatoes, boiled, cooked without skin, flesh, without salt', 'Verdura - Patata (senza buccia, lessata)'],
    ['Olives, green, Manzanilla, stuffed with pimiento', 'Verdura - Oliva (Manzanilla, verde, ripiena di peperone)'],
    ['MORI-NU, Tofu, silken, firm', 'Legumi - Tofu (vellutato, compatto)'],
    ['Cereals, QUAKER, Quick Oats, Dry', "Cereali e derivati - Fiocchi d'avena"],
    ['Cereals ready-to-eat, RALSTON Corn Flakes', 'Cereali e derivati - Corn flakes'],
    ['Beef, Australian, imported, grass-fed, ground, 85% lean / 15% fat, raw', 'Carne - Manzo, macinato (da pascolo, 15% grassi, crudo)'],
    ['Yogurt, Greek, nonfat, plain, CHOBANI', 'Latticini - Yogurt (greco, magro 0%, bianco)'],
    ['Oil, industrial, mid-oleic, sunflower', 'Grassi e oli - Olio di girasole'],
    ['Oil, corn, peanut, and olive', 'Grassi e oli - Olio (di mais, arachidi e oliva)'],
    ["Leavening agents, yeast, baker's, compressed", 'Altro - Lievito (di birra, fresco)'],
  ])('traduce "%s" (marchi, origini e sigle tolti)', (desc, expected) => {
    expect(label(desc)).toBe(expected)
    expect(untranslatedReport()).toEqual([])
  })

  it('i prodotti trasformati sono tradotti ma marcati come non primitivi', () => {
    expect(usdaToItalian('Croissants, apple', 'Baked Products')).toMatchObject({ isPrimitive: false })
    expect(label('Strudel, apple', 'Baked Products')).toBe('Dolci - Strudel (alla mela)')
    expect(label('Fruit butters, apple', 'Sweets')).toBe('Dolci - Crema di frutta (alla mela)')
    expect(usdaToItalian('Apples, raw, with skin', 'Fruits and Fruit Juices')).toMatchObject({ isPrimitive: true })
  })

  it('scarta gli alimenti per l’infanzia senza contarli come non tradotti', () => {
    expect(usdaToItalian('Babyfood, juice, apple', 'Baby Foods')).toBeNull()
    expect(untranslatedReport()).toEqual([])
  })

  it('scarta (e conta) le descrizioni con token sconosciuti: mai testo inglese', () => {
    expect(usdaToItalian('Apples, raw, with skin, glazed with unicorn dust')).toBeNull()
    expect(usdaToItalian('Kohlrabi, raw')).toBeNull()
    expect(untranslatedReport().map((u) => u.token)).toEqual(expect.arrayContaining(['glazed with unicorn dust', 'kohlrabi']))
  })

  it('accorda gli aggettivi e ignora il testo tra parentesi', () => {
    expect(inflect('crudo', 'f')).toBe('cruda')
    expect(inflect('cotto', 'fp')).toBe('cotte')
    expect(inflect('=arrosto', 'f')).toBe('arrosto')
    expect(tokenize('Lettuce, iceberg (includes crisphead types), raw')).toEqual(['lettuce', 'iceberg', 'raw'])
  })
})
