import { describe, expect, it } from 'vitest'
import {
  TUTORIAL_VERSION,
  clearOtherTutorialCaches,
  parseTutorialState,
  readCachedVersion,
  shouldShowTutorial,
  tutorialCacheKey,
  writeCachedVersion,
  type TutorialInput,
} from './tutorial'

const input = (over: Partial<TutorialInput> = {}): TutorialInput => ({
  blocked: false,
  error: false,
  fromCache: false,
  state: null,
  cachedVersion: null,
  ...over,
})
const done = (version = TUTORIAL_VERSION, skipped = false) => ({ completed: true, completedAt: new Date(), version, skipped })

/** localStorage in memoria. */
function memoryStore(initial: Record<string, string> = {}) {
  const m = new Map(Object.entries(initial))
  return {
    get length() {
      return m.size
    },
    key: (i: number) => [...m.keys()][i] ?? null,
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    keys: () => [...m.keys()],
  }
}

describe('shouldShowTutorial', () => {
  it('nuovo utente (campo assente, letto dal server): sì', () => {
    expect(shouldShowTutorial(input())).toBe(true)
  })

  it('tutorial completato o saltato: no', () => {
    expect(shouldShowTutorial(input({ state: done() }))).toBe(false)
    expect(shouldShowTutorial(input({ state: done(TUTORIAL_VERSION, true) }))).toBe(false)
  })

  it('errore di lettura: no (mai in loop)', () => {
    expect(shouldShowTutorial(input({ error: true }))).toBe(false)
  })

  it('dato solo dalla copia locale: no, finché il server non conferma', () => {
    expect(shouldShowTutorial(input({ fromCache: true }))).toBe(false)
  })

  it('durante il caricamento o l’onboarding del profilo: no', () => {
    expect(shouldShowTutorial(input({ blocked: true }))).toBe(false)
  })

  it('versione dei contenuti più alta di quella vista: sì', () => {
    expect(shouldShowTutorial(input({ state: done(1), version: 2 }))).toBe(true)
    expect(shouldShowTutorial(input({ state: done(2), version: 2 }))).toBe(false)
  })

  it('cache locale "già visto": nessun flash prima della risposta di Firestore', () => {
    expect(shouldShowTutorial(input({ cachedVersion: TUTORIAL_VERSION }))).toBe(false)
    // Cache di una versione precedente: decide Firestore.
    expect(shouldShowTutorial(input({ cachedVersion: 1, version: 2 }))).toBe(true)
  })
})

describe('parseTutorialState', () => {
  it('legge il campo salvato', () => {
    const at = new Date('2026-10-08T10:00:00Z')
    expect(parseTutorialState({ completed: true, completedAt: { toDate: () => at }, version: 1, skipped: true })).toEqual({
      completed: true,
      completedAt: at,
      version: 1,
      skipped: true,
    })
  })

  it('campo assente o malformato', () => {
    expect(parseTutorialState(undefined)).toBeNull()
    expect(parseTutorialState('sì')).toBeNull()
    expect(parseTutorialState({ completed: 'sì', version: 'uno' })).toEqual({
      completed: false,
      completedAt: null,
      version: 0,
      skipped: false,
    })
  })
})

describe('cache locale del tutorial', () => {
  it('salva e rilegge la versione vista, per utente', () => {
    const s = memoryStore()
    expect(readCachedVersion(s, 'alice')).toBeNull()
    writeCachedVersion(s, 'alice', 1)
    expect(readCachedVersion(s, 'alice')).toBe(1)
    expect(readCachedVersion(s, 'bob')).toBeNull()
    expect(tutorialCacheKey('alice')).toBe('contacalorie:tutorial:alice')
  })

  it('cancella le cache degli altri utenti e lascia il resto', () => {
    const s = memoryStore({
      'contacalorie:tutorial:alice': '1',
      'contacalorie:tutorial:bob': '1',
      'contacalorie:search': 'x',
      tema: 'dark',
    })
    clearOtherTutorialCaches(s, 'bob')
    expect(s.keys().sort()).toEqual(['contacalorie:search', 'contacalorie:tutorial:bob', 'tema'])
  })

  it('archiviazione assente o bloccata: nessun errore', () => {
    const blocked = {
      length: 0,
      key: () => null,
      getItem: () => {
        throw new Error('bloccato')
      },
      setItem: () => {
        throw new Error('bloccato')
      },
      removeItem: () => {},
    }
    expect(readCachedVersion(null, 'a')).toBeNull()
    expect(readCachedVersion(blocked, 'a')).toBeNull()
    expect(() => writeCachedVersion(blocked, 'a', 1)).not.toThrow()
    expect(() => clearOtherTutorialCaches(null, 'a')).not.toThrow()
  })
})
