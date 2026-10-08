/**
 * Pulizia dei dati locali dell'app al logout o all'eliminazione dell'account, per i dispositivi
 * condivisi: il prossimo utente non deve trovare niente del precedente.
 *
 * Su GitHub Pages l'origine (utente.github.io) è condivisa con gli altri siti dello stesso account,
 * quindi si toccano solo le chiavi dell'app e di Firebase. Il tema (preferenza del dispositivo) resta.
 */

type KeyStore = Pick<Storage, 'length' | 'key' | 'removeItem'>
type Caches = Pick<CacheStorage, 'keys' | 'delete'>

/** Prefissi delle chiavi dell'app (cache delle ricerche) e di Firebase (coordinamento tra schede). */
export const APP_KEY_PREFIXES = ['contacalorie:', 'firestore_', 'firebase:']
/** Cache del service worker con le risposte di Open Food Facts/USDA (l'app shell resta, serve offline). */
export const RUNTIME_CACHES = ['food-data']

function removeAppKeys(store: KeyStore | null | undefined): string[] {
  if (!store) return []
  const keys: string[] = []
  for (let i = 0; i < store.length; i++) {
    const k = store.key(i)
    if (k && APP_KEY_PREFIXES.some((p) => k.startsWith(p))) keys.push(k)
  }
  keys.forEach((k) => store.removeItem(k))
  return keys
}

export interface LocalDataEnv {
  local?: KeyStore | null
  session?: KeyStore | null
  caches?: Caches | null
}

export async function clearLocalAppData(env: LocalDataEnv): Promise<{ removedKeys: string[]; removedCaches: string[] }> {
  const removedKeys = [...removeAppKeys(env.local), ...removeAppKeys(env.session)]
  const removedCaches: string[] = []
  if (env.caches) {
    for (const name of await env.caches.keys()) {
      if (RUNTIME_CACHES.includes(name) && (await env.caches.delete(name))) removedCaches.push(name)
    }
  }
  return { removedKeys, removedCaches }
}

/** Ambiente reale del browser (ogni accesso è protetto: l'archiviazione può essere bloccata). */
export function browserDataEnv(): LocalDataEnv {
  const safe = <T,>(get: () => T): T | null => {
    try {
      return get()
    } catch {
      return null
    }
  }
  return {
    local: safe(() => window.localStorage),
    session: safe(() => window.sessionStorage),
    caches: safe(() => ('caches' in window ? window.caches : null)),
  }
}
