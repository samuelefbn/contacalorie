import { useMemo } from 'react'
import { limit, orderBy, query, where } from 'firebase/firestore'
import type { FoodItem } from '../types'
import { entriesRef, foodsRef, userRef, weightsRef } from '../services/refs'
import { toEntry, toFood, toProfile, toWeight } from '../services/mappers'
import { entryToItem } from '../services/entries'
import { useDocData, useQueryData } from './useFirestore'

// Tutte le query usano solo indici a campo singolo (creati automaticamente da Firestore):
// nessun indice composito da distribuire. L'ordinamento secondario avviene sul client.

export function useProfile(uid: string) {
  const ref = useMemo(() => userRef(uid), [uid])
  return useDocData(ref, toProfile)
}

export function useDayEntries(uid: string, date: string) {
  const q = useMemo(() => query(entriesRef(uid), where('date', '==', date)), [uid, date])
  const res = useQueryData(q, toEntry)
  const data = useMemo(
    () => [...res.data].sort((a, b) => (a.createdAt?.getTime() ?? Infinity) - (b.createdAt?.getTime() ?? Infinity)),
    [res.data],
  )
  return { ...res, data }
}

export function useEntriesRange(uid: string, from: string, to: string) {
  const q = useMemo(
    () => query(entriesRef(uid), where('date', '>=', from), where('date', '<=', to), orderBy('date')),
    [uid, from, to],
  )
  return useQueryData(q, toEntry)
}

export function useFoods(uid: string) {
  const q = useMemo(() => query(foodsRef(uid), orderBy('name')), [uid])
  const res = useQueryData(q, toFood)
  // Preferiti in cima, poi ordine alfabetico (senza distinzione maiuscole/minuscole).
  const data = useMemo(
    () =>
      [...res.data].sort(
        (a, b) => Number(b.favorite) - Number(a.favorite) || a.name.localeCompare(b.name, 'it', { sensitivity: 'base' }),
      ),
    [res.data],
  )
  return { ...res, data }
}

const RECENT_LIMIT = 20

/** "Ultimi usati": alimenti distinti dalle voci di diario più recenti. */
export function useRecentFoods(uid: string) {
  const q = useMemo(() => query(entriesRef(uid), orderBy('createdAt', 'desc'), limit(150)), [uid])
  const res = useQueryData(q, toEntry)
  const data = useMemo(() => {
    const seen = new Set<string>()
    const out: FoodItem[] = []
    for (const e of res.data) {
      const key = `${e.name}|${e.brand ?? ''}`.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      out.push(entryToItem(e))
      if (out.length >= RECENT_LIMIT) break
    }
    return out
  }, [res.data])
  return { ...res, data }
}

export function useWeights(uid: string) {
  const q = useMemo(() => query(weightsRef(uid), orderBy('date')), [uid])
  return useQueryData(q, toWeight)
}
