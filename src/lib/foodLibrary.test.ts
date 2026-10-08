import { describe, expect, it } from 'vitest'
import type { FoodItem } from '../types'
import { cleanBarcode, foodKey, foodLabel, foodTypeOf, planFoodWrite } from './foodLibrary'

const per100 = { kcal: 359, protein: 12.5, carbs: 71, fat: 1.5 }
const item = (over: Partial<FoodItem> = {}): FoodItem => ({
  name: 'Spaghetti n.5',
  brand: 'Barilla',
  barcode: '8076800195057',
  per100,
  defaultGrams: 80,
  source: 'off',
  foodId: null,
  ...over,
})

describe('chiave dei miei alimenti (niente doppioni)', () => {
  it('il codice a barre è l’id: stesso codice = stesso documento, anche con nome diverso', () => {
    expect(foodKey(item())).toBe('8076800195057')
    expect(foodKey(item({ name: 'SPAGHETTI N°5', brand: 'Barilla G. e R. F.lli' }))).toBe('8076800195057')
    expect(foodKey(item({ barcode: ' 8076800195057 ' }))).toBe('8076800195057')
  })

  it('un alimento già salvato mantiene il suo id', () => {
    expect(foodKey(item({ foodId: 'abc123' }))).toBe('abc123')
  })

  it('alimenti generici: chiave stabile del dataset', () => {
    const mela = item({ name: 'Frutta - Mela', brand: null, barcode: null, source: 'usda', key: 'gen-frutta-mela' })
    expect(foodKey(mela)).toBe('gen-frutta-mela')
  })

  it('inseriti a mano: nome e marca normalizzati (accenti e maiuscole non contano)', () => {
    const a = item({ name: 'Torta di Mele', brand: 'Nonna Pìa', barcode: null, source: 'manual' })
    const b = item({ name: '  torta di mele ', brand: 'NONNA PIA', barcode: null, source: 'manual' })
    expect(foodKey(a)).toBe('n-torta-di-mele--nonna-pia')
    expect(foodKey(b)).toBe(foodKey(a))
    expect(foodKey(item({ name: 'x'.repeat(300), brand: null, barcode: null })).length).toBeLessThanOrEqual(100)
  })

  it('codici a barre non validi vengono ignorati', () => {
    expect(cleanBarcode('12345')).toBeNull()
    expect(cleanBarcode('abc')).toBeNull()
    expect(cleanBarcode('80768001')).toBe('80768001')
  })
})

describe('salvataggio senza duplicati', () => {
  it('nuovo prodotto scansionato: crea il documento con useCount 1', () => {
    const w = planFoodWrite(null, item(), { origin: 'scan', countUse: true })
    expect(w).toMatchObject({ op: 'create', id: '8076800195057' })
    if (w.op !== 'create') throw new Error()
    expect(w.data).toMatchObject({
      name: 'Spaghetti n.5',
      brand: 'Barilla',
      barcode: '8076800195057',
      per100,
      type: 'packaged',
      origin: 'scan',
      source: 'off',
      useCount: 1,
      favorite: false,
    })
  })

  it('stesso codice scansionato di nuovo: aggiorna solo lastUsedAt e useCount', () => {
    const w = planFoodWrite({ id: '8076800195057' }, item({ name: 'altro nome' }), { origin: 'scan', countUse: true })
    expect(w).toEqual({ op: 'touch', id: '8076800195057', countUse: true, favorite: false })
  })

  it('stella su un alimento già salvato: solo preferito, senza contare un uso', () => {
    expect(planFoodWrite({ id: 'x' }, item(), { origin: 'search', countUse: false, favorite: true })).toEqual({
      op: 'touch',
      id: 'x',
      countUse: false,
      favorite: true,
    })
  })

  it('tipo dell’alimento', () => {
    expect(foodTypeOf(item())).toBe('packaged')
    expect(foodTypeOf(item({ source: 'usda', barcode: null }))).toBe('generic')
    expect(foodTypeOf(item({ source: 'manual', barcode: null }))).toBe('custom')
    expect(foodTypeOf(item({ source: 'manual' }))).toBe('packaged')
  })

  it('nome mostrato: "Nome prodotto - Marca"', () => {
    expect(foodLabel({ name: 'Spaghetti n.5', brand: 'Barilla' })).toBe('Spaghetti n.5 - Barilla')
    expect(foodLabel({ name: 'Frutta - Mela', brand: null })).toBe('Frutta - Mela')
  })
})
