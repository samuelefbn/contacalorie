import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  type User,
} from 'firebase/auth'
import { auth, googleProvider } from '../lib/firebase'
import { isLeaving, secureSignOut, wipeLocalDataAndReload } from '../services/session'

interface AuthValue {
  user: User | null
  loading: boolean
  error: unknown
  signIn: () => Promise<void>
  /** Logout sicuro: esce, cancella i dati locali e ricarica (le modifiche in attesa vanno gestite prima). */
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

// Errori per cui il popup non è utilizzabile: si ripiega sul redirect.
const POPUP_FALLBACK = new Set(['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment'])

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)

  const lastUid = useRef<string | null>(null)

  useEffect(() => {
    getRedirectResult(auth).catch(setError)
    return onAuthStateChanged(auth, (u) => {
      // Uscita fatta in un'altra scheda (o account cambiato): anche qui si cancellano i dati locali.
      if (lastUid.current && lastUid.current !== u?.uid && !isLeaving()) {
        void wipeLocalDataAndReload()
        return
      }
      lastUid.current = u?.uid ?? null
      setUser(u)
      setLoading(false)
    })
  }, [])

  const signIn = useCallback(async () => {
    setError(null)
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (err) {
      const code = (err as { code?: string }).code ?? ''
      if (POPUP_FALLBACK.has(code)) await signInWithRedirect(auth, googleProvider)
      else setError(err)
    }
  }, [])

  const signOut = useCallback(() => secureSignOut(), [])

  const value = useMemo(() => ({ user, loading, error, signIn, signOut }), [user, loading, error, signIn, signOut])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth va usato dentro <AuthProvider>')
  return ctx
}

/** uid dell'utente autenticato: da usare solo nelle schermate protette. */
export function useUid(): string {
  const { user } = useAuth()
  if (!user) throw new Error('Utente non autenticato')
  return user.uid
}
