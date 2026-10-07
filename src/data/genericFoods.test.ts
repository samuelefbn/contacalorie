import { describe, expect, it } from 'vitest'
import { GENERIC_DATASET } from '../lib/foodSearch/genericSearch'
import { isPlausible } from '../lib/foodSearch/validate'

describe('dataset alimenti generici', () => {
  it('ha i metadati richiesti', () => {
    expect(GENERIC_DATASET.source).toMatch(/USDA/)
    expect(GENERIC_DATASET.count).toBe(GENERIC_DATASET.foods.length)
    if (GENERIC_DATASET.foods.length > 0) expect(Date.parse(GENERIC_DATASET.generatedAt ?? '')).not.toBeNaN()
  })

  it('ogni voce viene da USDA e ha valori coerenti', () => {
    const ids = new Set<string>()
    for (const f of GENERIC_DATASET.foods) {
      expect(f.source).toBe('USDA')
      expect(f.fdcId).toBeGreaterThan(0)
      expect(f.usdaDescription).not.toBe('')
      expect(isPlausible(f), f.name).toBe(true)
      expect(ids.has(f.id), `id duplicato ${f.id}`).toBe(false)
      ids.add(f.id)
    }
  })
})
