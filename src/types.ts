export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export interface Nutrients {
  kcal: number
  protein: number
  carbs: number
  fat: number
}

/** Origine di un alimento o di una voce: Open Food Facts, USDA, inserimento manuale, alimento personale o ricetta. */
export type FoodSource = 'off' | 'usda' | 'manual' | 'custom' | 'recipe'

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
  /** false finché il nuovo utente non completa l'onboarding (i profili esistenti valgono come completati). */
  onboarded: boolean
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
  /** Scrittura locale non ancora confermata dal server (es. offline). */
  pending: boolean
}

export interface RecipeIngredient {
  name: string
  grams: number
  per100: Nutrients
}

/** Tipo di alimento salvato: prodotto confezionato, alimento generico, personale o ricetta. */
export type FoodType = 'packaged' | 'generic' | 'custom' | 'recipe'
/** Come è entrato tra i "miei alimenti": scansione, ricerca, inserimento a mano o ricetta. */
export type FoodOrigin = 'scan' | 'search' | 'manual' | 'recipe'

/**
 * Documento users/{uid}/foods/{foodId}: ogni alimento usato (scansionato, aggiunto al diario,
 * salvato tra i preferiti) o creato. L'id è la chiave dell'alimento (es. il codice a barre),
 * così lo stesso alimento non viene mai salvato due volte.
 */
export interface Food {
  id: string
  name: string
  brand: string | null
  barcode: string | null
  per100: Nutrients
  /** Porzione proposta (quella del produttore se disponibile, altrimenti 100 g). */
  defaultGrams: number
  /** Porzione indicata dal produttore (prodotti confezionati), se disponibile. */
  servingGrams: number | null
  favorite: boolean
  kind: 'food' | 'recipe'
  ingredients: RecipeIngredient[]
  source: FoodSource
  type: FoodType
  origin: FoodOrigin
  createdAt: Date | null
  lastUsedAt: Date | null
  useCount: number
  pending: boolean
}

/** Documento users/{uid}/pendingScans/{barcode}: codice scansionato offline, da completare. */
export interface PendingScan {
  barcode: string
  status: 'pending' | 'not_found'
  createdAt: Date | null
  pending: boolean
}

/** Documento users/{uid}/weights/{date}. */
export interface WeightEntry {
  date: string
  kg: number
  pending?: boolean
}

/** Porzione indicativa (es. "1 mela media" ≈ 180 g): l'utente può sempre modificare i grammi. */
export interface Portion {
  label: string
  grams: number
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
  /** Porzioni rapide indicative (alimenti generici). */
  portions?: Portion[]
  /** Chiave stabile del risultato di ricerca (es. "gen-frutta-mela"), usata come id tra i miei alimenti. */
  key?: string | null
  /** Porzione del produttore, se nota. */
  servingGrams?: number | null
  /** Appena scansionato: la scansione ha già contato come utilizzo. */
  fromScan?: boolean
}
