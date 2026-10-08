import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { onAuthStateChanged, signInWithPopup, type User } from 'firebase/auth'
import { auth, googleProvider } from '../lib/firebase'
import { classifySignInError } from '../lib/inAppBrowser'
import { isLeaving, secureSignOut, wipeLocalDataAndReload } from '../services/session'

interface AuthValue {
  user: User | null
  loading: boolean
  error: unknown
  /** true se il popup di Google non si è potuto aprire (bloccato o non supportato da questo browser). */
  popupUnavailable: boolean
  /**
   * Accesso con il popup di Google. Va chiamata direttamente nel gestore del click: il popup parte
   * subito, senza await prima, altrimenti Safari lo blocca.
   */
  signIn: () => Promise<void>
  /** Logout sicuro: esce, cancella i dati locali e ricarica (le modifiche in attesa vanno gestite prima). */
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

// Solo popup, niente signInWithRedirect: l'app è su GitHub Pages, un dominio diverso da authDomain
// (firebaseapp.com), e con il partizionamento dello storage di Safari/iOS e dei browser in-app il
// redirect perde il suo stato ("missing initial state").

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [popupUnavailable, setPopupUnavailable] = useState(false)

  const lastUid = useRef<string | null>(null)

  useEffect(() => {
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
    // Il popup parte per primo, in modo sincrono rispetto al click (nessun await prima).
    const popup = signInWithPopup(auth, googleProvider)
    setError(null)
    setPopupUnavailable(false)
    try {
      await popup
    } catch (err) {
      const kind = classifySignInError(err)
      if (kind === 'popup-unavailable') setPopupUnavailable(true)
      else if (kind === 'error') setError(err)
      // 'ignore': popup chiuso dall'utente o sostituito da un altro, nessun messaggio.
    }
  }, [])

  const signOut = useCallback(() => secureSignOut(), [])

  const value = useMemo(
    () => ({ user, loading, error, popupUnavailable, signIn, signOut }),
    [user, loading, error, popupUnavailable, signIn, signOut],
  )
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
