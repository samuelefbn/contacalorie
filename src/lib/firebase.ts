import { initializeApp } from 'firebase/app'
import { GoogleAuthProvider, connectAuthEmulator, getAuth, type Auth } from 'firebase/auth'
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore'

// I valori arrivano da `.env` in locale e dai GitHub Secrets in CI: non sono mai nel codice.
// measurementId è letto ma Analytics NON viene inizializzato.
const env = import.meta.env
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID,
}

const REQUIRED = {
  VITE_FIREBASE_API_KEY: firebaseConfig.apiKey,
  VITE_FIREBASE_AUTH_DOMAIN: firebaseConfig.authDomain,
  VITE_FIREBASE_PROJECT_ID: firebaseConfig.projectId,
  VITE_FIREBASE_APP_ID: firebaseConfig.appId,
}

export const missingFirebaseKeys = Object.entries(REQUIRED)
  .filter(([, v]) => !v)
  .map(([k]) => k)

export const isFirebaseConfigured = missingFirebaseKeys.length === 0

function init() {
  const app = initializeApp(firebaseConfig)
  // Cache persistente su IndexedDB: l'app funziona offline e sincronizza al ritorno della rete.
  const db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  })
  const auth = getAuth(app)
  // Solo in sviluppo: `VITE_USE_EMULATORS=true npm run dev` usa gli emulatori locali di Firebase.
  if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === 'true') {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
    connectFirestoreEmulator(db, '127.0.0.1', 8080)
  }
  return { auth, db }
}

const services = isFirebaseConfigured ? init() : null

// L'app non monta nessun componente che usa auth/db se la configurazione manca (vedi App.tsx).
export const auth = services?.auth as Auth
export const db = services?.db as Firestore

export const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })
