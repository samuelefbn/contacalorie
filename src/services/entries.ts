import { deleteDoc, doc, getDocs, orderBy, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore'
import type { Entry, FoodItem, MealType, Nutrients } from '../types'
import { scaleNutrients } from '../lib/nutrition'
import { entriesRef } from './refs'
import { toEntry } from './mappers'

/**
 * Nota sulle scritture: con la cache offline le Promise si risolvono solo quando il server conferma.
 * L'interfaccia quindi NON le attende per aggiornarsi (ci pensano i listener), ma ne intercetta gli errori.
 */
export function addEntry(
  uid: string,
  date: string,
  mealType: MealType,
  item: FoodItem,
  grams: number,
  id?: string,
): Promise<void> {
  const ref = id ? doc(entriesRef(uid), id) : doc(entriesRef(uid))
  return setDoc(ref, {
    date,
    mealType,
    name: item.name,
    brand: item.brand,
    grams,
    ...scaleNutrients(item.per100, grams),
    per100: item.per100,
    source: item.source,
    foodId: item.foodId,
    barcode: item.barcode,
    createdAt: serverTimestamp(),
  })
}

/** Ricrea una voce eliminata (per "Annulla"), con lo stesso id. */
export function restoreEntry(uid: string, e: Entry): Promise<void> {
  return addEntry(uid, e.date, e.mealType, entryToItem(e), e.grams, e.id)
}

export function entryToItem(e: Entry): FoodItem {
  return {
    name: e.name,
    brand: e.brand,
    barcode: e.barcode,
    per100: e.per100,
    defaultGrams: e.grams,
    source: e.source,
    foodId: e.foodId,
  }
}

export function updateEntry(
  uid: string,
  id: string,
  changes: { grams: number; mealType: MealType; date: string; per100: Nutrients },
): Promise<void> {
  return updateDoc(doc(entriesRef(uid), id), {
    grams: changes.grams,
    mealType: changes.mealType,
    date: changes.date,
    ...scaleNutrients(changes.per100, changes.grams),
    updatedAt: serverTimestamp(),
  })
}

export function deleteEntry(uid: string, id: string): Promise<void> {
  return deleteDoc(doc(entriesRef(uid), id))
}

/** Tutte le voci (opzionalmente in un intervallo di date) per l'esportazione. */
export async function fetchEntries(uid: string, from?: string, to?: string): Promise<Entry[]> {
  const filters = [...(from ? [where('date', '>=', from)] : []), ...(to ? [where('date', '<=', to)] : [])]
  const snap = await getDocs(query(entriesRef(uid), ...filters, orderBy('date')))
  return snap.docs.map(toEntry)
}
