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
 * e `map` deve essere stabile (funzione di modulo).
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
      (snap) => setState({ q, data: snap.docs.map(map), error: null }),
      (error) => setState({ q, data: [], error }),
    )
  }, [q, map])

  const current = state.q === q
  return { data: current ? state.data : [], loading: q !== null && !current, error: current ? state.error : null }
}

/** Listener in tempo reale su un singolo documento. */
export function useDocData<T>(ref: DocumentReference | null, map: (d: DocumentSnapshot) => T): Result<T | null> {
  const [state, setState] = useState<{ ref: DocumentReference | null; data: T | null; error: Error | null }>({
    ref: null,
    data: null,
    error: null,
  })

  useEffect(() => {
    if (!ref) return
    return onSnapshot(
      ref,
      (snap) => setState({ ref, data: map(snap), error: null }),
      (error) => setState({ ref, data: null, error }),
    )
  }, [ref, map])

  const current = state.ref === ref
  return { data: current ? state.data : null, loading: ref !== null && !current, error: current ? state.error : null }
}
