import type { Food, FoodItem, FoodOrigin, FoodSource, FoodType, Nutrients } from '../types'
import { normalize } from './text'

/**
 * Regole dei "miei alimenti" (users/{uid}/foods), indipendenti da Firestore per poterle testare.
 *
 * Ogni alimento ha una chiave stabile che fa da id del documento: lo stesso alimento
 * (stesso codice a barre, stessa voce del dataset generico, stesso nome e marca inseriti a mano)
 * finisce sempre nello stesso documento, quindi non viene mai salvato due volte.
 */

const BARCODE = /^[0-9]{6,14}$/
const MAX_ID = 100

export const cleanBarcode = (code: string | null | undefined): string | null => {
  const digits = (code ?? '').replace(/\D/g, '')
  return BARCODE.test(digits) ? digits : null
}

const slug = (s: string) =>
  normalize(s)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

/** Id del documento per un alimento: id esistente, codice a barre, chiave del risultato o nome+marca. */
export function foodKey(item: Pick<FoodItem, 'foodId' | 'barcode' | 'key' | 'name' | 'brand'>): string {
  if (item.foodId) return item.foodId
  const barcode = cleanBarcode(item.barcode)
  if (barcode) return barcode
  if (item.key) return item.key.slice(0, MAX_ID)
  const brand = item.brand ? `--${slug(item.brand)}` : ''
  return `n-${slug(item.name) || 'alimento'}${brand}`.slice(0, MAX_ID)
}

export function foodTypeOf(item: Pick<FoodItem, 'source' | 'barcode'>): FoodType {
  if (item.source === 'recipe') return 'recipe'
  if (item.source === 'off') return 'packaged'
  if (item.source === 'usda') return 'generic'
  return cleanBarcode(item.barcode) ? 'packaged' : 'custom'
}

/** Campi di un nuovo documento (senza i timestamp, aggiunti da chi scrive). */
export interface NewFoodData {
  name: string
  brand: string | null
  barcode: string | null
  per100: Nutrients
  defaultGrams: number
  servingGrams: number | null
  favorite: boolean
  kind: 'food'
  ingredients: []
  source: FoodSource
  type: FoodType
  origin: FoodOrigin
  useCount: number
}

export type FoodWrite =
  | { op: 'create'; id: string; data: NewFoodData }
  | { op: 'touch'; id: string; countUse: boolean; favorite: boolean }

export interface FoodUseOptions {
  origin: FoodOrigin
  /** Conta come utilizzo (diario o scansione): aggiorna lastUsedAt e useCount. */
  countUse: boolean
  /** Mette l'alimento tra i preferiti (non lo toglie mai). */
  favorite?: boolean
}

/**
 * Decide come registrare un alimento: se il documento esiste già si aggiornano solo
 * lastUsedAt/useCount (ed eventualmente il preferito), altrimenti si crea.
 */
export function planFoodWrite(existing: Pick<Food, 'id'> | null | undefined, item: FoodItem, opts: FoodUseOptions): FoodWrite {
  const id = existing?.id ?? foodKey(item)
  if (existing) return { op: 'touch', id, countUse: opts.countUse, favorite: opts.favorite === true }
  return {
    op: 'create',
    id,
    data: {
      name: item.name.slice(0, 200),
      brand: item.brand ? item.brand.slice(0, 200) : null,
      barcode: cleanBarcode(item.barcode),
      per100: item.per100,
      defaultGrams: item.defaultGrams,
      servingGrams: item.servingGrams ?? null,
      favorite: opts.favorite === true,
      kind: 'food',
      ingredients: [],
      source: item.source === 'custom' || item.source === 'recipe' ? 'manual' : item.source,
      type: foodTypeOf(item),
      origin: opts.origin,
      useCount: opts.countUse ? 1 : 0,
    },
  }
}

/** Nome mostrato tra i miei alimenti: "Nome prodotto - Marca" per i prodotti con marca. */
export const foodLabel = (f: Pick<Food, 'name' | 'brand'>) => (f.brand ? `${f.name} - ${f.brand}` : f.name)
