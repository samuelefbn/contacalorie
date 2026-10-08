import { serverTimestamp, setDoc } from 'firebase/firestore'
import { TUTORIAL_VERSION } from '../lib/tutorial'
import { userRef } from './refs'

/**
 * Segna il tutorial come completato (o saltato) in users/{uid}.tutorial. Con merge si tocca solo
 * questo campo (più updatedAt): il profilo resta com'è. Offline la scrittura va nella coda di
 * Firestore; il chiamante non la attende.
 */
export function saveTutorialDone(uid: string, skipped: boolean, version = TUTORIAL_VERSION): Promise<void> {
  return setDoc(
    userRef(uid),
    { tutorial: { completed: true, completedAt: serverTimestamp(), version, skipped }, updatedAt: serverTimestamp() },
    { merge: true },
  )
}
