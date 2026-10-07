import { useCallback, useSyncExternalStore } from 'react'

export const TABS = ['diario', 'alimenti', 'storico', 'profilo'] as const
export type Tab = (typeof TABS)[number]

function subscribe(cb: () => void) {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}

function readTab(): Tab {
  const h = window.location.hash.replace(/^#\/?/, '')
  return (TABS as readonly string[]).includes(h) ? (h as Tab) : 'diario'
}

/** Sezione corrente salvata nell'hash dell'URL: funziona su GitHub Pages e con il tasto Indietro. */
export function useHashTab(): [Tab, (t: Tab) => void] {
  const tab = useSyncExternalStore(subscribe, readTab, () => 'diario' as Tab)
  const setTab = useCallback((t: Tab) => {
    window.location.hash = `/${t}`
    window.scrollTo({ top: 0 })
  }, [])
  return [tab, setTab]
}
