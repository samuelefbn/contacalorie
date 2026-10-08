import type { PendingScan } from '../types'
import type { FoodResult } from './foodSearch/types'

export interface PendingScanDeps {
  /** Cerca il prodotto (Open Food Facts); null se non esiste, eccezione se la rete non risponde. */
  lookup: (barcode: string) => Promise<FoodResult | null>
  /** Salva il prodotto tra i miei alimenti. */
  save: (result: FoodResult) => void
  markNotFound: (barcode: string) => void
  remove: (barcode: string) => void
  notify: (message: string) => void
}

export interface PendingScanOutcome {
  completed: string[]
  notFound: string[]
  /** Codici rimasti in coda perché la rete non ha risposto: si riprova al prossimo ritorno online. */
  retryLater: string[]
}

/**
 * Completa i codici a barre salvati offline ("Salva per dopo"): per ciascuno recupera i dati da
 * Open Food Facts, salva il prodotto tra i miei alimenti e lo toglie dalla coda, avvisando l'utente.
 * I codici inesistenti restano in coda come "non trovato" (da inserire a mano).
 */
export async function completePendingScans(items: PendingScan[], deps: PendingScanDeps): Promise<PendingScanOutcome> {
  const out: PendingScanOutcome = { completed: [], notFound: [], retryLater: [] }
  for (const item of items) {
    if (item.status !== 'pending') continue
    let result: FoodResult | null
    try {
      result = await deps.lookup(item.barcode)
    } catch {
      out.retryLater.push(item.barcode)
      continue
    }
    if (result) {
      deps.save(result)
      deps.remove(item.barcode)
      deps.notify(`Prodotto completato: ${result.brand ? `${result.name} - ${result.brand}` : result.name}`)
      out.completed.push(item.barcode)
    } else {
      deps.markNotFound(item.barcode)
      deps.notify(`Il codice ${item.barcode} non è su Open Food Facts: inseriscilo a mano dai tuoi alimenti.`)
      out.notFound.push(item.barcode)
    }
  }
  return out
}
