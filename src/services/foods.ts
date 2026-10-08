import { deleteDoc, doc, getDoc, getDocFromCache, increment, serverTimestamp, setDoc, updateDoc, type DocumentReference } from 'firebase/firestore'
import type { Food, FoodItem } from '../types'
import { cleanBarcode, foodTypeOf, planFoodWrite, type FoodUseOptions, type FoodWrite } from '../lib/foodLibrary'
import { foodsRef } from './refs'
import { toFood } from './mappers'

/** Campi modificabili dagli editor di alimenti personali e ricette. */
export type FoodInput = Pick<Food, 'name' | 'brand' | 'barcode' | 'per100' | 'defaultGrams' | 'favorite' | 'kind' | 'ingredients'>

/**
 * Crea o aggiorna un alimento personale/ricetta. Un nuovo alimento con codice a barre usa il codice
 * come id (lo stesso prodotto scansionato non si duplica). Restituisce subito l'id: la Promise `done`
 * si risolve solo quando il server conferma, quindi l'interfaccia non la attende.
 */
export function saveFood(uid: string, data: FoodInput, id?: string): { id: string; done: Promise<void> } {
  if (id) {
    return { id, done: updateDoc(doc(foodsRef(uid), id), { ...data, updatedAt: serverTimestamp() }) }
  }
  const barcode = cleanBarcode(data.barcode)
  const ref = barcode ? doc(foodsRef(uid), barcode) : doc(foodsRef(uid))
  const recipe = data.kind === 'recipe'
  return {
    id: ref.id,
    done: setDoc(ref, {
      ...data,
      barcode,
      servingGrams: null,
      source: recipe ? 'recipe' : 'manual',
      type: recipe ? 'recipe' : foodTypeOf({ source: 'manual', barcode }),
      origin: recipe ? 'recipe' : 'manual',
      useCount: 0,
      lastUsedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    }),
  }
}

function applyFoodWrite(ref: DocumentReference, w: FoodWrite): Promise<void> {
  if (w.op === 'create') {
    return setDoc(ref, { ...w.data, lastUsedAt: serverTimestamp(), createdAt: serverTimestamp() })
  }
  if (!w.countUse && !w.favorite) return Promise.resolve()
  return updateDoc(ref, {
    ...(w.countUse ? { lastUsedAt: serverTimestamp(), useCount: increment(1) } : {}),
    ...(w.favorite ? { favorite: true } : {}),
    updatedAt: serverTimestamp(),
  })
}

/**
 * Registra l'uso di un alimento tra i "miei alimenti": se esiste già (letto dalla copia locale,
 * quindi funziona anche offline) aggiorna solo lastUsedAt e useCount, altrimenti lo crea.
 * L'id è restituito subito, da usare come `foodId` della voce di diario.
 */
export function recordFoodUse(uid: string, item: FoodItem, opts: FoodUseOptions): { id: string; done: Promise<void> } {
  const write = planFoodWrite(null, item, opts)
  const ref = doc(foodsRef(uid), write.id)
  const done = getDocFromCache(ref)
    .then((snap) => snap.exists(), () => false)
    .then((exists) => applyFoodWrite(ref, exists ? planFoodWrite({ id: write.id }, item, opts) : write))
  return { id: write.id, done }
}

export function setFavorite(uid: string, id: string, favorite: boolean): Promise<void> {
  return updateDoc(doc(foodsRef(uid), id), { favorite, updatedAt: serverTimestamp() })
}

export function deleteFood(uid: string, id: string): Promise<void> {
  return deleteDoc(doc(foodsRef(uid), id))
}

export function foodToItem(f: Food): FoodItem {
  return {
    name: f.name,
    brand: f.brand,
    barcode: f.barcode,
    per100: f.per100,
    defaultGrams: f.defaultGrams,
    servingGrams: f.servingGrams,
    source: f.kind === 'recipe' ? 'recipe' : f.source,
    foodId: f.id,
  }
}

/**
 * Alimento già salvato con questo id (es. codice a barre): prima la copia locale, poi il server
 * se c'è rete. Così un codice già scansionato non richiede di nuovo Open Food Facts.
 */
export async function findSavedFood(uid: string, id: string): Promise<Food | null> {
  const ref = doc(foodsRef(uid), id)
  try {
    const cached = await getDocFromCache(ref)
    if (cached.exists()) return toFood(cached)
  } catch {
    // non presente nella copia locale
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) return null
  try {
    const snap = await getDoc(ref)
    return snap.exists() ? toFood(snap) : null
  } catch {
    return null
  }
}
