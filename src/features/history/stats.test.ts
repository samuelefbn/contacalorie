import { describe, expect, it } from 'vitest'
import type { Entry } from '../../types'
import { average, dailyTotals, weeks } from './stats'

const entry = (date: string, kcal: number): Entry => ({
  id: `${date}-${kcal}`,
  date,
  mealType: 'lunch',
  name: 'x',
  brand: null,
  grams: 100,
  kcal,
  protein: 10,
  carbs: 20,
  fat: 5,
  per100: { kcal, protein: 10, carbs: 20, fat: 5 },
  source: 'manual',
  foodId: null,
  barcode: null,
  createdAt: null,
  pending: false,
})

describe('statistiche storico', () => {
  const days = ['2024-01-01', '2024-01-02', '2024-01-03']
  const totals = dailyTotals(days, [entry('2024-01-01', 1000), entry('2024-01-01', 500), entry('2024-01-03', 2000)])

  it('somma per giorno e marca i giorni vuoti', () => {
    expect(totals.map((d) => [d.kcal, d.logged])).toEqual([
      [1500, true],
      [0, false],
      [2000, true],
    ])
  })

  it('media solo sui giorni registrati', () => {
    expect(average(totals)).toMatchObject({ kcal: 1750, count: 2 })
    expect(average([])).toBeNull()
  })

  it('raggruppa in settimane dalla più recente', () => {
    const many = dailyTotals(
      Array.from({ length: 10 }, (_, i) => `2024-01-${String(i + 1).padStart(2, '0')}`),
      [],
    )
    const w = weeks(many)
    expect(w.map((x) => x.length)).toEqual([7, 3])
    expect(w[0][0].date).toBe('2024-01-04')
  })
})
