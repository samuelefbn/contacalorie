/**
 * Test delle regole di sicurezza con l'emulatore Firestore: `npm run test:rules`
 * (avvia l'emulatore con firebase-tools, serve Java). Nessun progetto reale: "demo-*" è solo locale.
 */
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  Timestamp,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  collection,
  increment,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Firestore,
} from 'firebase/firestore'

let env: RulesTestEnvironment
let alice: Firestore
let bob: Firestore
let anon: Firestore

const BARCODE = '8076800195057'
const per100 = { kcal: 359, protein: 12.5, carbs: 71, fat: 1.5 }
const scannedFood = (over: Record<string, unknown> = {}) => ({
  name: 'Spaghetti n.5',
  brand: 'Barilla',
  barcode: BARCODE,
  per100,
  defaultGrams: 80,
  servingGrams: 80,
  favorite: false,
  kind: 'food',
  ingredients: [],
  source: 'off',
  type: 'packaged',
  origin: 'scan',
  useCount: 1,
  lastUsedAt: serverTimestamp(),
  createdAt: serverTimestamp(),
  ...over,
})
const entry = (over: Record<string, unknown> = {}) => ({
  date: '2026-10-08',
  mealType: 'lunch',
  name: 'Spaghetti n.5',
  brand: 'Barilla',
  grams: 80,
  kcal: 287,
  protein: 10,
  carbs: 56.8,
  fat: 1.2,
  per100,
  source: 'off',
  foodId: BARCODE,
  barcode: BARCODE,
  createdAt: serverTimestamp(),
  ...over,
})
const profile = (over: Record<string, unknown> = {}) => ({
  displayName: 'Alice',
  sex: 'female',
  age: 30,
  heightCm: 165,
  weightKg: 60,
  activityLevel: 'moderate',
  goal: 'maintain',
  kcalTarget: 1900,
  kcalManual: false,
  proteinTarget: 100,
  carbsTarget: 220,
  fatTarget: 60,
  onboarded: false,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...over,
})

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-contacalorie',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  })
  alice = env.authenticatedContext('alice').firestore() as unknown as Firestore
  bob = env.authenticatedContext('bob').firestore() as unknown as Firestore
  anon = env.unauthenticatedContext().firestore() as unknown as Firestore
})

beforeEach(() => env.clearFirestore())
afterAll(() => env?.cleanup())

describe('isolamento tra utenti', () => {
  beforeEach(async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore() as unknown as Firestore
      await setDoc(doc(db, 'users/alice'), { displayName: 'Alice' })
      await setDoc(doc(db, `users/alice/foods/${BARCODE}`), { name: 'x' })
      await setDoc(doc(db, 'users/alice/entries/e1'), { name: 'x' })
      await setDoc(doc(db, 'users/alice/weights/2026-10-08'), { kg: 60 })
      await setDoc(doc(db, `users/alice/pendingScans/${BARCODE}`), { barcode: BARCODE })
    })
  })

  it('A legge i propri dati', async () => {
    await assertSucceeds(getDoc(doc(alice, 'users/alice')))
    await assertSucceeds(getDocs(collection(alice, 'users/alice/foods')))
    await assertSucceeds(getDocs(collection(alice, 'users/alice/entries')))
    await assertSucceeds(getDocs(collection(alice, 'users/alice/pendingScans')))
  })

  it('B non può leggere i dati di A', async () => {
    await assertFails(getDoc(doc(bob, 'users/alice')))
    await assertFails(getDocs(collection(bob, 'users/alice/foods')))
    await assertFails(getDoc(doc(bob, `users/alice/foods/${BARCODE}`)))
    await assertFails(getDocs(collection(bob, 'users/alice/entries')))
    await assertFails(getDocs(collection(bob, 'users/alice/weights')))
    await assertFails(getDocs(collection(bob, 'users/alice/pendingScans')))
  })

  it('B non può scrivere né cancellare i dati di A (nemmeno con dati validi)', async () => {
    await assertFails(setDoc(doc(bob, `users/alice/foods/${BARCODE}`), scannedFood()))
    await assertFails(setDoc(doc(bob, 'users/alice/entries/e2'), entry()))
    await assertFails(setDoc(doc(bob, 'users/alice'), profile()))
    await assertFails(deleteDoc(doc(bob, 'users/alice/entries/e1')))
    await assertFails(deleteDoc(doc(bob, 'users/alice')))
  })

  it('senza login non si legge né si scrive nulla', async () => {
    await assertFails(getDoc(doc(anon, 'users/alice')))
    await assertFails(getDocs(collection(anon, 'users/alice/foods')))
    await assertFails(setDoc(doc(anon, `users/alice/foods/${BARCODE}`), scannedFood()))
  })

  it('qualsiasi altro percorso è vietato', async () => {
    await assertFails(getDoc(doc(alice, 'altro/doc')))
    await assertFails(setDoc(doc(alice, 'altro/doc'), { a: 1 }))
    await assertFails(setDoc(doc(alice, 'users/alice/segreti/x'), { a: 1 }))
    await assertFails(getDocs(collection(alice, 'users')))
  })
})

describe('validazione dei miei alimenti', () => {
  const ref = (id = BARCODE) => doc(alice, `users/alice/foods/${id}`)

  it('accetta un prodotto scansionato con il codice a barre come id', async () => {
    await assertSucceeds(setDoc(ref(), scannedFood()))
  })

  it('accetta un alimento generico e uno manuale', async () => {
    await assertSucceeds(
      setDoc(ref('gen-frutta-mela'), scannedFood({ name: 'Frutta - Mela', brand: null, barcode: null, source: 'usda', type: 'generic', origin: 'search' })),
    )
    await assertSucceeds(
      setDoc(ref('n-torta-della-nonna'), scannedFood({ name: 'Torta della nonna', brand: null, barcode: null, source: 'manual', type: 'custom', origin: 'manual' })),
    )
  })

  it('una nuova scansione aggiorna solo lastUsedAt e useCount', async () => {
    await assertSucceeds(setDoc(ref(), scannedFood()))
    await assertSucceeds(updateDoc(ref(), { lastUsedAt: serverTimestamp(), useCount: increment(1), updatedAt: serverTimestamp() }))
  })

  it.each([
    ['kcal negative', { per100: { ...per100, kcal: -1 } }],
    ['kcal non plausibili', { per100: { ...per100, kcal: 5000 } }],
    ['macro oltre 100 g', { per100: { ...per100, fat: 120 } }],
    ['kcal come testo', { per100: { ...per100, kcal: '359' } }],
    ['nome vuoto', { name: '' }],
    ['nome troppo lungo', { name: 'x'.repeat(201) }],
    ['marca troppo lunga', { brand: 'x'.repeat(201) }],
    ['campo non previsto', { hacker: true }],
    ['tipo sconosciuto', { type: 'altro' }],
    ['origine sconosciuta', { origin: 'boh' }],
    ['useCount negativo', { useCount: -1 }],
    ['useCount decimale', { useCount: 1.5 }],
    ['codice a barre non numerico', { barcode: 'abc' }],
    ['createdAt nel passato', { createdAt: Timestamp.fromDate(new Date('2020-01-01')) }],
  ])('rifiuta: %s', async (_label, over) => {
    await assertFails(setDoc(ref(), scannedFood(over)))
  })

  it('rifiuta una scansione salvata con un id diverso dal codice a barre', async () => {
    await assertFails(setDoc(ref('altro-id'), scannedFood()))
  })
})

describe('validazione di diario, peso, profilo e coda dei codici', () => {
  it('voci di diario', async () => {
    await assertSucceeds(setDoc(doc(alice, 'users/alice/entries/abc'), entry()))
    await assertFails(setDoc(doc(alice, 'users/alice/entries/b1'), entry({ grams: -5 })))
    await assertFails(setDoc(doc(alice, 'users/alice/entries/b2'), entry({ mealType: 'brunch' })))
    await assertFails(setDoc(doc(alice, 'users/alice/entries/b3'), entry({ date: '8/10/2026' })))
    await assertFails(setDoc(doc(alice, 'users/alice/entries/b4'), entry({ per100: { ...per100, kcal: 2000 } })))
  })

  it('peso', async () => {
    await assertSucceeds(setDoc(doc(alice, 'users/alice/weights/2026-10-08'), { date: '2026-10-08', kg: 60, updatedAt: serverTimestamp() }))
    await assertFails(setDoc(doc(alice, 'users/alice/weights/2026-10-09'), { date: '2026-10-08', kg: 60, updatedAt: serverTimestamp() }))
    await assertFails(setDoc(doc(alice, 'users/alice/weights/2026-10-10'), { date: '2026-10-10', kg: 5, updatedAt: serverTimestamp() }))
  })

  it('profilo con onboarding', async () => {
    await assertSucceeds(setDoc(doc(alice, 'users/alice'), profile()))
    await assertSucceeds(setDoc(doc(alice, 'users/alice'), { onboarded: true, age: 31, updatedAt: serverTimestamp() }, { merge: true }))
    await assertFails(setDoc(doc(alice, 'users/alice'), { age: 5, updatedAt: serverTimestamp() }, { merge: true }))
    await assertFails(setDoc(doc(alice, 'users/alice'), { onboarded: 'sì', updatedAt: serverTimestamp() }, { merge: true }))
    await assertFails(setDoc(doc(alice, 'users/alice'), { isAdmin: true, updatedAt: serverTimestamp() }, { merge: true }))
  })

  it('codici da completare', async () => {
    const pending = { barcode: BARCODE, status: 'pending', createdAt: serverTimestamp() }
    await assertSucceeds(setDoc(doc(alice, `users/alice/pendingScans/${BARCODE}`), pending))
    await assertSucceeds(updateDoc(doc(alice, `users/alice/pendingScans/${BARCODE}`), { status: 'not_found', updatedAt: serverTimestamp() }))
    await assertFails(setDoc(doc(alice, 'users/alice/pendingScans/123'), { ...pending, barcode: '123' }))
    await assertFails(setDoc(doc(alice, 'users/alice/pendingScans/80768001'), pending))
    await assertFails(setDoc(doc(alice, `users/alice/pendingScans/${BARCODE}`), { ...pending, status: 'boh' }))
    await assertSucceeds(deleteDoc(doc(alice, `users/alice/pendingScans/${BARCODE}`)))
  })
})

describe('tutorial di benvenuto (users/{uid}.tutorial)', () => {
  const tutorial = (over: Record<string, unknown> = {}) => ({
    tutorial: { completed: true, completedAt: serverTimestamp(), version: 1, skipped: false, ...over },
    updatedAt: serverTimestamp(),
  })

  beforeEach(async () => {
    await setDoc(doc(alice, 'users/alice'), profile({ onboarded: true }))
  })

  it('A salva il proprio stato del tutorial (completato o saltato)', async () => {
    await assertSucceeds(setDoc(doc(alice, 'users/alice'), tutorial(), { merge: true }))
    await assertSucceeds(setDoc(doc(alice, 'users/alice'), tutorial({ skipped: true }), { merge: true }))
    // Il profilo si salva ancora con il tutorial già memorizzato (completedAt ormai nel passato).
    await assertSucceeds(setDoc(doc(alice, 'users/alice'), { age: 32, updatedAt: serverTimestamp() }, { merge: true }))
  })

  it('B non può scrivere sul tutorial di A', async () => {
    await assertFails(setDoc(doc(bob, 'users/alice'), tutorial(), { merge: true }))
    await assertFails(updateDoc(doc(bob, 'users/alice'), { 'tutorial.completed': false, updatedAt: serverTimestamp() }))
  })

  it.each([
    ['completed come testo', { completed: 'sì' }],
    ['skipped mancante', { skipped: undefined }],
    ['versione decimale', { version: 1.5 }],
    ['versione zero', { version: 0 }],
    ['completedAt come testo', { completedAt: '2026-10-08' }],
    ['campo non previsto', { extra: true }],
  ])('rifiuta: %s', async (_label, over) => {
    const t = tutorial(over)
    // undefined = campo assente (Firestore non accetta valori undefined).
    t.tutorial = Object.fromEntries(Object.entries(t.tutorial).filter(([, v]) => v !== undefined)) as typeof t.tutorial
    await assertFails(setDoc(doc(alice, 'users/alice'), t, { merge: true }))
  })

  it('rifiuta un tutorial che non è una mappa', async () => {
    await assertFails(setDoc(doc(alice, 'users/alice'), { tutorial: true, updatedAt: serverTimestamp() }, { merge: true }))
  })
})
