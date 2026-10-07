import { usdaNutrients, type UsdaFood } from '../src/lib/foodSearch/usdaMap'
import { isPlausible } from '../src/lib/foodSearch/validate'
import { GLOBAL_EXCLUDE, type GenericFoodDef } from './genericFoods.defs'

const DATA_TYPE_RANK: Record<string, number> = { 'SR Legacy': 0, Foundation: 1 }

/** Ogni termine di `match` (con alternative "a|b") deve comparire nella descrizione; nessuno di `exclude`. */
export function matchesDef(def: GenericFoodDef, description: string): boolean {
  const d = description.toLowerCase()
  const required = def.match.every((term) => term.split('|').some((alt) => d.includes(alt.toLowerCase())))
  const excluded = [...GLOBAL_EXCLUDE, ...(def.exclude ?? [])].some((x) => d.includes(x.toLowerCase()))
  return required && !excluded
}

/**
 * Sceglie, tra i risultati di ricerca USDA, la voce che corrisponde alla definizione:
 * descrizione compatibile, nutrienti completi e coerenti. A parità preferisce SR Legacy
 * (profilo nutrizionale completo) e la descrizione più corta (la più generica).
 */
export function pickUsdaFood(def: GenericFoodDef, foods: UsdaFood[]): UsdaFood | null {
  const candidates = foods
    .filter((f) => f.description && matchesDef(def, f.description))
    .filter((f) => {
      const n = usdaNutrients(f)
      return n != null && isPlausible({ name: def.name, ...n })
    })
    .sort(
      (a, b) =>
        (DATA_TYPE_RANK[a.dataType ?? ''] ?? 9) - (DATA_TYPE_RANK[b.dataType ?? ''] ?? 9) ||
        (a.description ?? '').length - (b.description ?? '').length,
    )
  return candidates[0] ?? null
}
