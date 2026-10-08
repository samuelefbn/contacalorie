import { signOut } from 'firebase/auth'
import { clearIndexedDbPersistence, terminate, waitForPendingWrites } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import { browserDataEnv, clearLocalAppData } from '../lib/localData'

let leaving = false

/** true mentre questa scheda sta uscendo (per non ripetere la pulizia quando arriva l'evento di logout). */
export const isLeaving = () => leaving

/**
 * Attende che il server confermi le modifiche in attesa. Restituisce false se non ci riesce
 * entro il tempo massimo (rete lenta o assente).
 */
export async function flushPendingWrites(timeoutMs = 15000): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<false>((resolve) => {
    timer = setTimeout(() => resolve(false), timeoutMs)
  })
  try {
    return await Promise.race([waitForPendingWrites(db).then(() => true as const), timeout])
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Cancella la copia locale di Firestore (IndexedDB). Fallisce se un'altra scheda la sta ancora
 * usando: si riprova qualche volta, dando tempo alle altre schede di chiudere la loro istanza.
 */
async function clearFirestoreCache() {
  await terminate(db)
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await clearIndexedDbPersistence(db)
      return
    } catch {
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)))
    }
  }
  console.warn('Copia locale di Firestore non cancellata: chiudi le altre schede di ContaCalorie.')
}

/** Pulisce tutto ciò che resta sul dispositivo (Firestore, cache dell'app) e ricarica l'app. */
export async function wipeLocalDataAndReload() {
  leaving = true
  try {
    await clearFirestoreCache()
    await clearLocalAppData(browserDataEnv())
  } finally {
    // Ricarica senza "#scheda": il prossimo utente riparte dal diario.
    window.location.replace(window.location.pathname + window.location.search)
  }
}

/**
 * Logout sicuro per dispositivi condivisi: esce da Google/Firebase, termina Firestore, cancella
 * la sua copia locale e le cache dell'app, poi ricarica. Le modifiche non sincronizzate vanno
 * gestite PRIMA (vedi AccountSection): dopo questa chiamata sono perse.
 */
export async function secureSignOut() {
  leaving = true
  await signOut(auth)
  await wipeLocalDataAndReload()
}
