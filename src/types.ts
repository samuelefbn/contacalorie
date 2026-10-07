export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export interface Nutrients {
  kcal: number
  protein: number
  carbs: number
  fat: number
}

/** Origine di un alimento o di una voce: Open Food Facts, inserimento manuale, alimento personale o ricetta. */
export type FoodSource = 'off' | 'manual' | 'custom' | 'recipe'

export type Sex = 'male' | 'female'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
export type Goal = 'lose' | 'maintain' | 'gain'

/** Documento users/{uid}. */
export interface Profile {
  displayName: string | null
  sex: Sex
  age: number
  heightCm: number
  weightKg: number
  activityLevel: ActivityLevel
  goal: Goal
  /** Obiettivo calorico effettivo (calcolato o impostato a mano). */
  kcalTarget: number
  /** true se l'utente ha sovrascritto a mano il valore calcolato. */
  kcalManual: boolean
  proteinTarget: number
  carbsTarget: number
  fatTarget: number
}

/** Documento users/{uid}/entries/{entryId}. I valori kcal/macro si riferiscono ai grammi indicati. */
export interface Entry extends Nutrients {
  id: string
  date: string
  mealType: MealType
  name: string
  brand: string | null
  grams: number
  per100: Nutrients
  source: FoodSource
  foodId: string | null
  barcode: string | null
  createdAt: Date | null
}

export interface RecipeIngredient {
  name: string
  grams: number
  per100: Nutrients
}

/** Documento users/{uid}/foods/{foodId}: alimento personale o ricetta. */
export interface Food {
  id: string
  name: string
  brand: string | null
  barcode: string | null
  per100: Nutrients
  defaultGrams: number
  favorite: boolean
  kind: 'food' | 'recipe'
  ingredients: RecipeIngredient[]
  createdAt: Date | null
}

/** Documento users/{uid}/weights/{date}. */
export interface WeightEntry {
  date: string
  kg: number
}

/** Alimento "candidato" da aggiungere al diario, qualunque sia la sua origine. */
export interface FoodItem {
  name: string
  brand: string | null
  barcode: string | null
  per100: Nutrients
  defaultGrams: number
  source: FoodSource
  foodId: string | null
  imageUrl?: string | null
}
