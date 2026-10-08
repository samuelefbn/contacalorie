/**
 * Tutorial di benvenuto: quando mostrarlo e cache locale dello stato.
 *
 * Lo stato vero sta in Firestore (users/{uid}.tutorial), così non riappare su un altro dispositivo.
 * La cache locale serve solo a non far comparire il tutorial per un attimo, a chi l'ha già visto,
 * prima che Firestore risponda.
 */

/** Versione corrente dei contenuti: aumentandola, chi ha visto una versione precedente lo rivede. */
export const TUTORIAL_VERSION = 1

/** Campo users/{uid}.tutorial come letto da Firestore. */
export interface TutorialState {
  completed: boolean
  completedAt: Date | null
  version: number
  skipped: boolean
}

export interface TutorialInput {
  /** Il profilo è ancora in caricamento oppure l'utente è nell'onboarding del profilo. */
  blocked: boolean
  /** Lettura del documento fallita. */
  error: boolean
  /** Il dato arriva dalla copia locale (es. offline): un campo assente potrebbe esistere sul server. */
  fromCache: boolean
  /** Stato salvato in Firestore (null se il campo non c'è). */
  state: TutorialState | null
  /** Versione già vista secondo la cache locale del dispositivo (null se assente). */
  cachedVersion: number | null
  version?: number
}

/**
 * true solo se è certo che l'utente non ha completato la versione corrente: in caso di errore,
 * di dato solo locale o di dubbio il tutorial NON compare (mai in loop, mai un "flash").
 */
export function shouldShowTutorial({ blocked, error, fromCache, state, cachedVersion, version = TUTORIAL_VERSION }: TutorialInput) {
  if (blocked || error) return false
  if (cachedVersion !== null && cachedVersion >= version) return false
  if (state?.completed && state.version >= version) return false
  return !fromCache
}

/** Lettura difensiva del campo dal documento (dati vecchi o malformati valgono come "assente"). */
export function parseTutorialState(v: unknown): TutorialState | null {
  if (!v || typeof v !== 'object') return null
  const x = v as Record<string, unknown>
  const at = (x.completedAt as { toDate?: () => Date } | null)?.toDate?.() ?? null
  return {
    completed: x.completed === true,
    completedAt: at,
    version: typeof x.version === 'number' && Number.isFinite(x.version) ? x.version : 0,
    skipped: x.skipped === true,
  }
}

// ---------- Cache locale (chiave con l'uid: un utente non eredita lo stato di un altro) ----------

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>

const PREFIX = 'contacalorie:tutorial:'
export const tutorialCacheKey = (uid: string) => PREFIX + uid

export function readCachedVersion(store: Store | null, uid: string): number | null {
  try {
    const v = Number(store?.getItem(tutorialCacheKey(uid)) ?? NaN)
    return Number.isFinite(v) ? v : null
  } catch {
    return null
  }
}

export function writeCachedVersion(store: Store | null, uid: string, version: number) {
  try {
    store?.setItem(tutorialCacheKey(uid), String(version))
  } catch {
    // Archiviazione bloccata (es. navigazione privata): resta solo lo stato in Firestore.
  }
}

/**
 * Cancella le cache del tutorial di altri utenti (cambio di account sullo stesso dispositivo).
 * Il logout le cancella già tutte insieme alle altre chiavi "contacalorie:".
 */
export function clearOtherTutorialCaches(store: Store | null, uid: string) {
  try {
    if (!store) return
    const keys: string[] = []
    for (let i = 0; i < store.length; i++) {
      const k = store.key(i)
      if (k?.startsWith(PREFIX) && k !== tutorialCacheKey(uid)) keys.push(k)
    }
    keys.forEach((k) => store.removeItem(k))
  } catch {
    // Archiviazione non accessibile: niente da pulire.
  }
}

export function browserStore(): Store | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}
