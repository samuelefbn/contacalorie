import { describe, expect, it } from 'vitest'
import { clearLocalAppData } from './localData'

function fakeStorage(entries: Record<string, string>) {
  const map = new Map(Object.entries(entries))
  return {
    map,
    get length() {
      return map.size
    },
    key: (i: number) => [...map.keys()][i] ?? null,
    removeItem: (k: string) => void map.delete(k),
  }
}

function fakeCaches(names: string[]) {
  const set = new Set(names)
  return { set, keys: async () => [...set], delete: async (n: string) => set.delete(n) }
}

describe('pulizia dei dati locali al logout / cambio utente', () => {
  it('cancella cache delle ricerche, chiavi di Firebase e cache delle API; tiene tema e dati di altri siti', async () => {
    const local = fakeStorage({
      theme: 'dark',
      'firestore_clients_contacalorie-28e2d_[DEFAULT]_abc': '{}',
      'firebase:authUser:key:[DEFAULT]': '{"uid":"alice"}',
      'altro-sito:preferenze': 'x',
    })
    const session = fakeStorage({
      'contacalorie:food-search:v2:off|mela': '{"results":[]}',
      'contacalorie:food-search:v2:usda|mela': '{"results":[]}',
    })
    const caches = fakeCaches(['food-data', 'workbox-precache-v2-https://x.github.io/contacalorie/'])

    const out = await clearLocalAppData({ local, session, caches })

    expect([...local.map.keys()]).toEqual(['theme', 'altro-sito:preferenze'])
    expect(session.map.size).toBe(0)
    expect([...caches.set]).toEqual(['workbox-precache-v2-https://x.github.io/contacalorie/'])
    expect(out.removedCaches).toEqual(['food-data'])
    expect(out.removedKeys).toHaveLength(4)
  })

  it('funziona anche se l’archiviazione non è disponibile', async () => {
    await expect(clearLocalAppData({ local: null, session: null, caches: null })).resolves.toEqual({ removedKeys: [], removedCaches: [] })
  })
})
