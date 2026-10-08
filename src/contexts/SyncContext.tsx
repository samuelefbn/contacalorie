import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { limit, onSnapshot, orderBy, query, where, type DocumentReference, type Query } from 'firebase/firestore'
import { entriesRef, foodsRef, pendingScansRef, userRef, weightsRef } from '../services/refs'
import { addDays, todayKey } from '../lib/dates'
import { pendingInSnapshot, syncState, type SyncState } from '../lib/syncState'
import { useOnlineStatus } from '../hooks/useOnlineStatus'

interface SyncValue {
  online: boolean
  /** Modifiche salvate sul dispositivo e non ancora confermate dal server. */
  pendingCount: number
  state: SyncState
}

const SyncContext = createContext<SyncValue | null>(null)

/** Le voci di diario più vecchie di così raramente cambiano: non serve ascoltarle tutte. */
const ENTRY_DAYS = 90
const SYNCED_MS = 4000

/**
 * Conta le scritture in attesa ascoltando i dati dell'utente con `includeMetadataChanges`:
 * `hasPendingWrites` resta vero finché il server non conferma (Firestore le invia da solo al ritorno della rete).
 */
export function SyncProvider({ uid, children }: { uid: string; children: ReactNode }) {
  const online = useOnlineStatus()
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [justSynced, setJustSynced] = useState(false)
  const prevPending = useRef(0)

  useEffect(() => {
    const set = (key: string, n: number) => setCounts((c) => (c[key] === n ? c : { ...c, [key]: n }))
    const queries: [string, Query][] = [
      ['entries', query(entriesRef(uid), where('date', '>=', addDays(todayKey(), -ENTRY_DAYS)))],
      ['entriesRecent', query(entriesRef(uid), orderBy('createdAt', 'desc'), limit(50))],
      ['foods', query(foodsRef(uid))],
      ['weights', query(weightsRef(uid))],
      ['pendingScans', query(pendingScansRef(uid))],
    ]
    const docRef: DocumentReference = userRef(uid)
    const unsubs = queries.map(([key, q]) =>
      onSnapshot(q, { includeMetadataChanges: true }, (snap) =>
        set(key, pendingInSnapshot(snap.docs.filter((d) => d.metadata.hasPendingWrites).length, snap.metadata.hasPendingWrites)),
      ),
    )
    unsubs.push(onSnapshot(docRef, { includeMetadataChanges: true }, (snap) => set('profile', snap.metadata.hasPendingWrites ? 1 : 0)))
    return () => unsubs.forEach((u) => u())
  }, [uid])

  // Le due query sulle voci si sovrappongono: si prende la più alta invece di sommarle.
  const { entries = 0, entriesRecent = 0, ...rest } = counts
  const pendingCount = Math.max(entries, entriesRecent) + Object.values(rest).reduce((a, b) => a + b, 0)

  useEffect(() => {
    const was = prevPending.current
    prevPending.current = pendingCount
    if (was > 0 && pendingCount === 0 && online) {
      setJustSynced(true)
      const t = setTimeout(() => setJustSynced(false), SYNCED_MS)
      return () => clearTimeout(t)
    }
  }, [pendingCount, online])

  const value: SyncValue = { online, pendingCount, state: syncState(online, pendingCount, justSynced) }
  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>
}

export function useSync(): SyncValue {
  const ctx = useContext(SyncContext)
  if (!ctx) throw new Error('useSync va usato dentro <SyncProvider>')
  return ctx
}
