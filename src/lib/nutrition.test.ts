import { describe, expect, it } from 'vitest'
import { bmr, defaultMacros, per100FromTotals, recommendedKcal, scaleNutrients, sumNutrients, tdee } from './nutrition'

describe('Mifflin-St Jeor', () => {
  const man = { sex: 'male', age: 30, heightCm: 180, weightKg: 80 } as const
  const woman = { sex: 'female', age: 30, heightCm: 165, weightKg: 60 } as const

  it('calcola il metabolismo basale', () => {
    expect(bmr(man)).toBe(1780) // 800 + 1125 - 150 + 5
    expect(bmr(woman)).toBeCloseTo(1320.25) // 600 + 1031.25 - 150 - 161
  })

  it('applica il fattore di attività', () => {
    expect(tdee({ ...man, activityLevel: 'moderate' })).toBeCloseTo(1780 * 1.55)
  })

  it("applica l'obiettivo e arrotonda a 10 kcal", () => {
    expect(recommendedKcal({ ...man, activityLevel: 'moderate', goal: 'maintain' })).toBe(2760)
    expect(recommendedKcal({ ...man, activityLevel: 'moderate', goal: 'lose' })).toBe(2260)
    expect(recommendedKcal({ ...man, activityLevel: 'moderate', goal: 'gain' })).toBe(3060)
  })

  it('non scende sotto la soglia minima', () => {
    const tiny = { sex: 'female', age: 80, heightCm: 145, weightKg: 40, activityLevel: 'sedentary', goal: 'lose' } as const
    expect(recommendedKcal(tiny)).toBe(1200)
  })
})

describe('macro', () => {
  it('ripartisce le kcal in modo coerente', () => {
    const m = defaultMacros(2000, 70, 'maintain')
    expect(m.proteinTarget).toBe(112)
    expect(m.fatTarget).toBe(56)
    const kcal = m.proteinTarget * 4 + m.carbsTarget * 4 + m.fatTarget * 9
    expect(Math.abs(kcal - 2000)).toBeLessThan(10)
  })
})

describe('calcoli per quantità', () => {
  const per100 = { kcal: 350, protein: 12.5, carbs: 70, fat: 1.5 }

  it('scala i valori sui grammi', () => {
    expect(scaleNutrients(per100, 80)).toEqual({ kcal: 280, protein: 10, carbs: 56, fat: 1.2 })
  })

  it('somma e ricava i valori per 100 g', () => {
    const tot = sumNutrients([scaleNutrients(per100, 80), scaleNutrients(per100, 120)])
    expect(tot.kcal).toBe(700)
    expect(per100FromTotals(tot, 200)).toEqual(per100)
    expect(per100FromTotals(tot, 0).kcal).toBe(0)
  })
})
