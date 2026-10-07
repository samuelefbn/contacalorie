import { deleteDoc, doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import type { Food, FoodItem } from '../types'
import { foodsRef } from './refs'

export type FoodInput = Omit<Food, 'id' | 'createdAt'>

/** Crea (senza id) o aggiorna un alimento personale/ricetta. Restituisce l'id. */
export function saveFood(uid: string, data: FoodInput, id?: string): { id: string; done: Promise<void> } {
  if (id) {
    return { id, done: updateDoc(doc(foodsRef(uid), id), { ...data, updatedAt: serverTimestamp() }) }
  }
  const ref = doc(foodsRef(uid))
  return { id: ref.id, done: setDoc(ref, { ...data, createdAt: serverTimestamp() }) }
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
    source: f.kind === 'recipe' ? 'recipe' : 'custom',
    foodId: f.id,
  }
}

/** Dati per salvare tra i "miei alimenti" un alimento trovato online o inserito a mano. */
export function itemToFoodInput(item: FoodItem, favorite = true): FoodInput {
  return {
    name: item.name,
    brand: item.brand,
    barcode: item.barcode,
    per100: item.per100,
    defaultGrams: item.defaultGrams,
    favorite,
    kind: 'food',
    ingredients: [],
  }
}
