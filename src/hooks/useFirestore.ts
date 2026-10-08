import { useEffect, useState } from 'react'
import {
  onSnapshot,
  type DocumentReference,
  type DocumentSnapshot,
  type Query,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'

interface Result<T> {
  data: T
  loading: boolean
  error: Error | null
}

/**
 * Listener in tempo reale su una query. La query va memoizzata dal chiamante (useMemo)
 * e `map` deve essere stabile (funzione di modulo). Con `includeMetadataChanges` ogni voce
 * si aggiorna anche quando il server conferma una scrittura fatta offline (campo `pending`).
 */
export function useQueryData<T>(q: Query | null, map: (d: QueryDocumentSnapshot) => T): Result<T[]> {
  const [state, setState] = useState<{ q: Query | null; data: T[]; error: Error | null }>({
    q: null,
    data: [],
    error: null,
  })

  useEffect(() => {
    if (!q) return
    return onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snap) => setState({ q, data: snap.docs.map(map), error: null }),
      (error) => setState({ q, data: [], error }),
    )
  }, [q, map])

  const current = state.q === q
  return { data: current ? state.data : [], loading: q !== null && !current, error: current ? state.error : null }
}

/**
 * Listener in tempo reale su un singolo documento. `fromCache` dice se il dato arriva dalla copia
 * locale (es. offline): un documento "inesistente" in cache potrebbe esistere sul server.
 */
export function useDocData<T>(
  ref: DocumentReference | null,
  map: (d: DocumentSnapshot) => T,
): Result<T | null> & { fromCache: boolean } {
  const [state, setState] = useState<{ ref: DocumentReference | null; data: T | null; error: Error | null; fromCache: boolean }>({
    ref: null,
    data: null,
    error: null,
    fromCache: true,
  })

  useEffect(() => {
    if (!ref) return
    return onSnapshot(
      ref,
      { includeMetadataChanges: true },
      (snap) => setState({ ref, data: map(snap), error: null, fromCache: snap.metadata.fromCache }),
      (error) => setState({ ref, data: null, error, fromCache: true }),
    )
  }, [ref, map])

  const current = state.ref === ref
  return {
    data: current ? state.data : null,
    loading: ref !== null && !current,
    error: current ? state.error : null,
    fromCache: current ? state.fromCache : true,
  }
}
