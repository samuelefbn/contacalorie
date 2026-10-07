import { serverTimestamp, setDoc } from 'firebase/firestore'
import type { Profile } from '../types'
import { userRef } from './refs'

export function saveProfile(uid: string, profile: Profile): Promise<void> {
  return setDoc(userRef(uid), { ...profile, updatedAt: serverTimestamp() }, { merge: true })
}
