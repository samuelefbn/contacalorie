import { describe, expect, it } from 'vitest'
import type { Food } from '../types'
import { createMyFoodsSearch, usageScore } from './myFoodsSearch'

const NOW = new Date('2026-10-08T12:00:00Z').getTime()
const daysAgo = (d: number) => new Date(NOW - d * 86400000)
let n = 0
const food = (over: Partial<Food>): Food => ({
  id: `f${n++}`,
  name: 'x',
  brand: null,
  barcode: null,
  per100: { kcal: 100, protein: 1, carbs: 1, fat: 1 },
  defaultGrams: 100,
  servingGrams: null,
  favorite: false,
  kind: 'food',
  ingredients: [],
  source: 'off',
  type: 'packaged',
  origin: 'scan',
  createdAt: daysAgo(30),
  lastUsedAt: daysAgo(30),
  useCount: 1,
  pending: false,
  ...over,
})

describe('ricerca nei miei alimenti', () => {
  const foods = [
    food({ id: 'yog-old', name: 'Yogurt greco', brand: 'Fage', lastUsedAt: daysAgo(60), useCount: 2 }),
    food({ id: 'yog-hot', name: 'Yogurt magro', brand: 'Müller', lastUsedAt: daysAgo(1), useCount: 12 }),
    food({ id: 'caffe', name: 'Caffè macinato', brand: 'Lavazza', barcode: '8000070012345' }),
    food({ id: 'mela', name: 'Frutta - Mela', source: 'usda', type: 'generic' }),
  ]
  const search = createMyFoodsSearch(foods, NOW)

  it('ignora accenti e maiuscole', () => {
    expect(search('CAFFE').map((f) => f.id)).toEqual(['caffe'])
    expect(search('muller').map((f) => f.id)).toEqual(['yog-hot'])
  })

  it('cerca anche per marca e codice a barre', () => {
    expect(search('lavazza').map((f) => f.id)).toEqual(['caffe'])
    expect(search('80000700').map((f) => f.id)).toEqual(['caffe'])
  })

  it('ordina per uso recente e frequente', () => {
    expect(search('yogurt').map((f) => f.id)).toEqual(['yog-hot', 'yog-old'])
    expect(usageScore(foods[1], NOW)).toBeGreaterThan(usageScore(foods[0], NOW))
  })

  it('tollera gli errori di battitura, dopo le corrispondenze esatte', () => {
    expect(search('yougurt').map((f) => f.id)).toContain('yog-hot')
    expect(search('mela').map((f) => f.id)).toEqual(['mela'])
  })

  it('serve almeno 2 caratteri', () => {
    expect(search('y')).toEqual([])
  })
})
