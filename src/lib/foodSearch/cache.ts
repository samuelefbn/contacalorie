import type { FoodResult, ExternalSource } from './types'

export interface CachedSearch {
  results: FoodResult[]
  source: ExternalSource
}

interface Entry extends CachedSearch {
  savedAt: number
}

type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export interface SearchCacheOptions {
  ttlMs?: number
  /** Archivio persistente per la sessione del browser; null = solo memoria. */
  storage?: KeyValueStorage | null
  now?: () => number
}

const DAY_MS = 24 * 60 * 60 * 1000
const PREFIX = 'contacalorie:food-search:v1:'

function defaultStorage(): KeyValueStorage | null {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage : null
  } catch {
    return null // archiviazione bloccata (es. navigazione privata restrittiva)
  }
}

export const cacheKey = (query: string) => query.trim().toLowerCase().replace(/\s+/g, ' ')

/** Cache dei risultati per query: memoria + sessionStorage, con scadenza (24 ore di default). */
export function createSearchCache({ ttlMs = DAY_MS, storage = defaultStorage(), now = Date.now }: SearchCacheOptions = {}) {
  const memory = new Map<string, Entry>()
  const fresh = (e: Entry | undefined) => e != null && now() - e.savedAt < ttlMs

  return {
    get(query: string): CachedSearch | null {
      const key = cacheKey(query)
      let entry = memory.get(key)
      if (!entry && storage) {
        try {
          const raw = storage.getItem(PREFIX + key)
          entry = raw ? (JSON.parse(raw) as Entry) : undefined
          if (entry) memory.set(key, entry)
        } catch {
          entry = undefined
        }
      }
      if (!fresh(entry)) {
        memory.delete(key)
        try {
          storage?.removeItem(PREFIX + key)
        } catch {
          // ignora
        }
        return null
      }
      return { results: entry!.results, source: entry!.source }
    },

    set(query: string, value: CachedSearch) {
      const key = cacheKey(query)
      const entry: Entry = { ...value, savedAt: now() }
      memory.set(key, entry)
      try {
        storage?.setItem(PREFIX + key, JSON.stringify(entry))
      } catch {
        // spazio esaurito o archiviazione non disponibile: resta la cache in memoria
      }
    },
  }
}

export type SearchCache = ReturnType<typeof createSearchCache>
