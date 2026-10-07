import { deleteDoc, doc, getDocs, orderBy, query, serverTimestamp, setDoc } from 'firebase/firestore'
import type { Profile, WeightEntry } from '../types'
import { recommendedKcal } from '../lib/nutrition'
import { todayKey } from '../lib/dates'
import { weightsRef } from './refs'
import { toWeight } from './mappers'
import { saveProfile } from './profile'

/**
 * Registra il peso del giorno (l'id del documento è la data, quindi un solo valore al giorno).
 * Se è il peso di oggi aggiorna anche il profilo e, se l'obiettivo non è manuale, ricalcola le kcal.
 */
export function logWeight(uid: string, date: string, kg: number, profile: Profile | null): Promise<unknown> {
  const writes: Promise<unknown>[] = [setDoc(doc(weightsRef(uid), date), { date, kg, updatedAt: serverTimestamp() })]
  if (profile && date === todayKey()) {
    const next = { ...profile, weightKg: kg }
    if (!profile.kcalManual) next.kcalTarget = recommendedKcal(next)
    writes.push(saveProfile(uid, next))
  }
  return Promise.all(writes)
}

export function deleteWeight(uid: string, date: string): Promise<void> {
  return deleteDoc(doc(weightsRef(uid), date))
}

export async function fetchWeights(uid: string): Promise<WeightEntry[]> {
  const snap = await getDocs(query(weightsRef(uid), orderBy('date')))
  return snap.docs.map(toWeight)
}
