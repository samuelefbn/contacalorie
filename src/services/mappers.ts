import type { DocumentSnapshot, QueryDocumentSnapshot, Timestamp } from 'firebase/firestore'
import type { Entry, Food, FoodOrigin, FoodSource, FoodType, Nutrients, PendingScan, Profile, RecipeIngredient, WeightEntry } from '../types'
import { ZERO } from '../lib/nutrition'
import { parseTutorialState, type TutorialState } from '../lib/tutorial'

type Data = Record<string, unknown>

const numOr = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)
const strOrNull = (v: unknown) => (typeof v === 'string' && v ? v : null)
const toDate = (v: unknown) => ((v as Timestamp | null)?.toDate?.() ?? null)

// "estimate" restituisce un orario stimato per le scritture non ancora confermate (es. offline).
const read = (d: DocumentSnapshot | QueryDocumentSnapshot): Data => d.data({ serverTimestamps: 'estimate' }) ?? {}

function toNutrients(v: unknown): Nutrients {
  const n = (v ?? {}) as Data
  return { kcal: numOr(n.kcal, 0), protein: numOr(n.protein, 0), carbs: numOr(n.carbs, 0), fat: numOr(n.fat, 0) }
}

export function toEntry(d: QueryDocumentSnapshot): Entry {
  const x = read(d)
  return {
    id: d.id,
    date: String(x.date),
    mealType: (x.mealType as Entry['mealType']) ?? 'snack',
    name: String(x.name ?? ''),
    brand: strOrNull(x.brand),
    grams: numOr(x.grams, 0),
    ...toNutrients(x),
    per100: x.per100 ? toNutrients(x.per100) : { ...ZERO },
    source: (x.source as Entry['source']) ?? 'manual',
    foodId: strOrNull(x.foodId),
    barcode: strOrNull(x.barcode),
    createdAt: toDate(x.createdAt),
    pending: d.metadata.hasPendingWrites,
  }
}

const FOOD_TYPES: FoodType[] = ['packaged', 'generic', 'custom', 'recipe']
const FOOD_ORIGINS: FoodOrigin[] = ['scan', 'search', 'manual', 'recipe']
const FOOD_SOURCES: FoodSource[] = ['off', 'usda', 'manual', 'custom', 'recipe']
const oneOf = <T extends string>(v: unknown, allowed: T[], fallback: T): T => (allowed.includes(v as T) ? (v as T) : fallback)

export function toFood(d: DocumentSnapshot): Food {
  const x = read(d)
  const ingredients = Array.isArray(x.ingredients) ? (x.ingredients as Data[]) : []
  const recipe = x.kind === 'recipe'
  const barcode = strOrNull(x.barcode)
  // I documenti creati prima di tipo/origine/utilizzi ricevono valori dedotti.
  const createdAt = toDate(x.createdAt)
  return {
    id: d.id,
    name: String(x.name ?? ''),
    brand: strOrNull(x.brand),
    barcode,
    per100: toNutrients(x.per100),
    defaultGrams: numOr(x.defaultGrams, 100),
    servingGrams: typeof x.servingGrams === 'number' ? x.servingGrams : null,
    favorite: x.favorite === true,
    kind: recipe ? 'recipe' : 'food',
    ingredients: ingredients.map(
      (i): RecipeIngredient => ({ name: String(i.name ?? ''), grams: numOr(i.grams, 0), per100: toNutrients(i.per100) }),
    ),
    source: recipe ? 'recipe' : oneOf(x.source, FOOD_SOURCES, 'custom'),
    type: recipe ? 'recipe' : oneOf(x.type, FOOD_TYPES, barcode ? 'packaged' : 'custom'),
    origin: recipe ? 'recipe' : oneOf(x.origin, FOOD_ORIGINS, 'manual'),
    createdAt,
    lastUsedAt: toDate(x.lastUsedAt) ?? createdAt,
    useCount: numOr(x.useCount, 0),
    pending: d.metadata.hasPendingWrites,
  }
}

export function toPendingScan(d: QueryDocumentSnapshot): PendingScan {
  const x = read(d)
  return {
    barcode: d.id,
    status: x.status === 'not_found' ? 'not_found' : 'pending',
    createdAt: toDate(x.createdAt),
    pending: d.metadata.hasPendingWrites,
  }
}

export function toWeight(d: QueryDocumentSnapshot): WeightEntry {
  const x = read(d)
  return { date: d.id, kg: numOr(x.kg, 0), pending: d.metadata.hasPendingWrites }
}

export const DEFAULT_PROFILE: Profile = {
  displayName: null,
  sex: 'male',
  age: 30,
  heightCm: 175,
  weightKg: 75,
  activityLevel: 'moderate',
  goal: 'maintain',
  kcalTarget: 2000,
  kcalManual: false,
  proteinTarget: 120,
  carbsTarget: 230,
  fatTarget: 65,
  onboarded: false,
}

export function toProfile(d: DocumentSnapshot): Profile | null {
  if (!d.exists()) return null
  const x = read(d)
  const p = DEFAULT_PROFILE
  return {
    displayName: strOrNull(x.displayName),
    sex: x.sex === 'female' ? 'female' : 'male',
    age: numOr(x.age, p.age),
    heightCm: numOr(x.heightCm, p.heightCm),
    weightKg: numOr(x.weightKg, p.weightKg),
    activityLevel: (x.activityLevel as Profile['activityLevel']) ?? p.activityLevel,
    goal: (x.goal as Profile['goal']) ?? p.goal,
    kcalTarget: numOr(x.kcalTarget, p.kcalTarget),
    kcalManual: x.kcalManual === true,
    proteinTarget: numOr(x.proteinTarget, p.proteinTarget),
    carbsTarget: numOr(x.carbsTarget, p.carbsTarget),
    fatTarget: numOr(x.fatTarget, p.fatTarget),
    // I profili salvati prima dell'onboarding non hanno il campo: valgono come completati.
    onboarded: x.onboarded !== false,
  }
}

/** Campo tutorial di users/{uid}, letto a parte: non fa parte del Profile, così saveProfile non lo tocca. */
export function toTutorialState(d: DocumentSnapshot): TutorialState | null {
  return d.exists() ? parseTutorialState(read(d).tutorial) : null
}
