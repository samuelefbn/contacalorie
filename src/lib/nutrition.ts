import type { ActivityLevel, Goal, MealType, Nutrients, Profile, Sex } from '../types'

export const MEALS: { type: MealType; label: string; icon: string }[] = [
  { type: 'breakfast', label: 'Colazione', icon: '☕' },
  { type: 'lunch', label: 'Pranzo', icon: '🍝' },
  { type: 'dinner', label: 'Cena', icon: '🍽️' },
  { type: 'snack', label: 'Spuntini', icon: '🍎' },
]

export const mealLabel = (t: MealType) => MEALS.find((m) => m.type === t)?.label ?? t

export const ACTIVITY_LEVELS: { value: ActivityLevel; label: string; hint: string; factor: number }[] = [
  { value: 'sedentary', label: 'Sedentario', hint: 'Lavoro da scrivania, poco movimento', factor: 1.2 },
  { value: 'light', label: 'Leggero', hint: 'Attività 1–3 volte a settimana', factor: 1.375 },
  { value: 'moderate', label: 'Moderato', hint: 'Attività 3–5 volte a settimana', factor: 1.55 },
  { value: 'active', label: 'Attivo', hint: 'Attività intensa 6–7 volte a settimana', factor: 1.725 },
  { value: 'very_active', label: 'Molto attivo', hint: 'Lavoro fisico o doppi allenamenti', factor: 1.9 },
]

export const GOALS: { value: Goal; label: string; kcalDelta: number; proteinPerKg: number }[] = [
  { value: 'lose', label: 'Dimagrire', kcalDelta: -500, proteinPerKg: 2.0 },
  { value: 'maintain', label: 'Mantenere', kcalDelta: 0, proteinPerKg: 1.6 },
  { value: 'gain', label: 'Aumentare', kcalDelta: 300, proteinPerKg: 1.8 },
]

export const ZERO: Nutrients = { kcal: 0, protein: 0, carbs: 0, fat: 0 }

const MIN_KCAL: Record<Sex, number> = { male: 1500, female: 1200 }

export const round = (n: number, digits = 0) => {
  const f = 10 ** digits
  return Math.round(n * f) / f
}

type BodyData = Pick<Profile, 'sex' | 'age' | 'heightCm' | 'weightKg'>

/** Metabolismo basale secondo Mifflin-St Jeor. */
export function bmr({ sex, age, heightCm, weightKg }: BodyData): number {
  return 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'male' ? 5 : -161)
}

/** Fabbisogno totale (TDEE) = BMR × fattore di attività. */
export function tdee(p: BodyData & Pick<Profile, 'activityLevel'>): number {
  const factor = ACTIVITY_LEVELS.find((a) => a.value === p.activityLevel)?.factor ?? 1.2
  return bmr(p) * factor
}

/** Obiettivo calorico consigliato, arrotondato a 10 kcal e mai sotto una soglia minima di sicurezza. */
export function recommendedKcal(p: BodyData & Pick<Profile, 'activityLevel' | 'goal'>): number {
  const delta = GOALS.find((g) => g.value === p.goal)?.kcalDelta ?? 0
  const kcal = Math.max(MIN_KCAL[p.sex], tdee(p) + delta)
  return Math.round(kcal / 10) * 10
}

/** Ripartizione macro predefinita: proteine in g/kg, grassi al 25% delle kcal, carboidrati il resto. */
export function defaultMacros(kcal: number, weightKg: number, goal: Goal) {
  const perKg = GOALS.find((g) => g.value === goal)?.proteinPerKg ?? 1.6
  const protein = Math.round(Math.min(weightKg * perKg, (kcal * 0.4) / 4))
  const fat = Math.round((kcal * 0.25) / 9)
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4))
  return { proteinTarget: protein, carbsTarget: carbs, fatTarget: fat }
}

/** Kcal derivate dai macro (4/4/9), utile per mostrare la coerenza dei target. */
export const kcalFromMacros = (protein: number, carbs: number, fat: number) => protein * 4 + carbs * 4 + fat * 9

/** Valori nutrizionali per una certa quantità a partire dai valori per 100 g. */
export function scaleNutrients(per100: Nutrients, grams: number): Nutrients {
  const f = grams / 100
  return {
    kcal: round(per100.kcal * f),
    protein: round(per100.protein * f, 1),
    carbs: round(per100.carbs * f, 1),
    fat: round(per100.fat * f, 1),
  }
}

export function sumNutrients(items: Nutrients[]): Nutrients {
  const t = items.reduce(
    (acc, n) => ({
      kcal: acc.kcal + n.kcal,
      protein: acc.protein + n.protein,
      carbs: acc.carbs + n.carbs,
      fat: acc.fat + n.fat,
    }),
    { ...ZERO },
  )
  return { kcal: round(t.kcal), protein: round(t.protein, 1), carbs: round(t.carbs, 1), fat: round(t.fat, 1) }
}

/** Valori per 100 g a partire dai totali di una quantità (es. una ricetta). */
export function per100FromTotals(totals: Nutrients, grams: number): Nutrients {
  if (grams <= 0) return { ...ZERO }
  const f = 100 / grams
  return {
    kcal: round(totals.kcal * f),
    protein: round(totals.protein * f, 1),
    carbs: round(totals.carbs * f, 1),
    fat: round(totals.fat * f, 1),
  }
}
