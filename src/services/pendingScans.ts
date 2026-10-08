import { deleteDoc, doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { pendingScansRef } from './refs'

/** "Salva per dopo": il codice scansionato offline resta in coda finché non torna la rete. */
export function queuePendingScan(uid: string, barcode: string): Promise<void> {
  return setDoc(doc(pendingScansRef(uid), barcode), { barcode, status: 'pending', createdAt: serverTimestamp() })
}

export function markPendingNotFound(uid: string, barcode: string): Promise<void> {
  return updateDoc(doc(pendingScansRef(uid), barcode), { status: 'not_found', updatedAt: serverTimestamp() })
}

export function removePendingScan(uid: string, barcode: string): Promise<void> {
  return deleteDoc(doc(pendingScansRef(uid), barcode))
}
