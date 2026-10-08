import { deleteUser, reauthenticateWithPopup, type User } from 'firebase/auth'
import { deleteDoc, getDoc, getDocs, writeBatch, type CollectionReference } from 'firebase/firestore'
import { db, googleProvider } from '../lib/firebase'
import { entriesRef, foodsRef, pendingScansRef, userRef, weightsRef } from './refs'
import { toEntry, toFood, toPendingScan, toProfile, toWeight } from './mappers'

const subcollections = (uid: string): [string, CollectionReference][] => [
  ['entries', entriesRef(uid)],
  ['foods', foodsRef(uid)],
  ['weights', weightsRef(uid)],
  ['pendingScans', pendingScansRef(uid)],
]

/** Tutti i dati dell'utente, per "Esporta i miei dati" (JSON). Richiede la rete per i dati non in cache. */
export async function exportAllData(uid: string, user: Pick<User, 'email' | 'displayName'>) {
  const [profile, entries, foods, weights, pendingScans] = await Promise.all([
    getDoc(userRef(uid)).then(toProfile),
    getDocs(entriesRef(uid)).then((s) => s.docs.map(toEntry)),
    getDocs(foodsRef(uid)).then((s) => s.docs.map(toFood)),
    getDocs(weightsRef(uid)).then((s) => s.docs.map(toWeight)),
    getDocs(pendingScansRef(uid)).then((s) => s.docs.map(toPendingScan)),
  ])
  // `pending` è uno stato locale della sincronizzazione, non un dato dell'utente.
  const strip = <T extends { pending?: boolean }>(list: T[]) =>
    list.map((item) => {
      const copy: Partial<T> = { ...item }
      delete copy.pending
      return copy as Omit<T, 'pending'>
    })
  return {
    exportedAt: new Date().toISOString(),
    account: { email: user.email, displayName: user.displayName },
    profile,
    entries: strip(entries).sort((a, b) => a.date.localeCompare(b.date)),
    foods: strip(foods),
    weights: strip(weights),
    pendingScans: strip(pendingScans),
  }
}

const BATCH = 400

/** Cancella tutte le sottocollezioni dell'utente e poi il documento del profilo. Serve la rete. */
export async function deleteAllUserData(uid: string): Promise<number> {
  let deleted = 0
  for (const [, ref] of subcollections(uid)) {
    const snap = await getDocs(ref)
    for (let i = 0; i < snap.docs.length; i += BATCH) {
      const batch = writeBatch(db)
      snap.docs.slice(i, i + BATCH).forEach((d) => batch.delete(d.ref))
      await batch.commit()
    }
    deleted += snap.size
  }
  await deleteDoc(userRef(uid))
  return deleted + 1
}

export const needsRecentLogin = (err: unknown) => (err as { code?: string })?.code === 'auth/requires-recent-login'

/** Elimina l'account Firebase Auth. Lancia `auth/requires-recent-login` se l'accesso non è recente. */
export function deleteAuthAccount(user: User): Promise<void> {
  return deleteUser(user)
}

/** Nuovo accesso con Google (richiesto da Firebase per le operazioni sensibili), poi elimina l'account. */
export async function reauthenticateAndDelete(user: User): Promise<void> {
  await reauthenticateWithPopup(user, googleProvider)
  await deleteUser(user)
}
