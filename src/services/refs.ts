import { collection, doc } from 'firebase/firestore'
import { db } from '../lib/firebase'

// Tutti i dati vivono sotto users/{uid}: è il confine applicato dalle regole Firestore.
export const userRef = (uid: string) => doc(db, 'users', uid)
export const entriesRef = (uid: string) => collection(db, 'users', uid, 'entries')
export const foodsRef = (uid: string) => collection(db, 'users', uid, 'foods')
export const weightsRef = (uid: string) => collection(db, 'users', uid, 'weights')
