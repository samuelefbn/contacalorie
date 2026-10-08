import { serverTimestamp, setDoc } from 'firebase/firestore'
import type { Profile } from '../types'
import { DEFAULT_PROFILE } from './mappers'
import { userRef } from './refs'

export function saveProfile(uid: string, profile: Profile): Promise<void> {
  return setDoc(userRef(uid), { ...profile, updatedAt: serverTimestamp() }, { merge: true })
}

/**
 * Primo accesso: crea users/{uid} con il profilo base. L'onboarding lo completa (onboarded = true).
 * Va chiamata solo quando il server ha confermato che il documento non esiste.
 */
export function createUserDoc(uid: string, displayName: string | null): Promise<void> {
  return setDoc(userRef(uid), {
    ...DEFAULT_PROFILE,
    displayName: displayName?.slice(0, 100) ?? null,
    onboarded: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}
