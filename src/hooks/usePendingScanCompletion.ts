import { useEffect, useRef } from 'react'
import { useToast } from '../contexts/ToastContext'
import { getProductByBarcode, resultToItem } from '../lib/foodSearch'
import { completePendingScans } from '../lib/pendingScanQueue'
import { recordFoodUse } from '../services/foods'
import { markPendingNotFound, removePendingScan } from '../services/pendingScans'
import { usePendingScans } from './data'
import { useOnlineStatus } from './useOnlineStatus'

/**
 * Appena c'è connessione completa i codici a barre "salvati per dopo": recupera i dati da
 * Open Food Facts, salva il prodotto tra i miei alimenti e avvisa con una notifica.
 */
export function usePendingScanCompletion(uid: string) {
  const online = useOnlineStatus()
  const { data } = usePendingScans(uid)
  const { notify, reportError } = useToast()
  const inFlight = useRef(new Set<string>())

  useEffect(() => {
    if (!online) return
    const todo = data.filter((p) => p.status === 'pending' && !inFlight.current.has(p.barcode))
    if (todo.length === 0) return
    todo.forEach((p) => inFlight.current.add(p.barcode))
    void completePendingScans(todo, {
      lookup: (code) => getProductByBarcode(code),
      save: (result) => recordFoodUse(uid, resultToItem(result), { origin: 'scan', countUse: true }).done.catch(reportError),
      markNotFound: (code) => markPendingNotFound(uid, code).catch(reportError),
      remove: (code) => removePendingScan(uid, code).catch(reportError),
      notify,
    }).finally(() => todo.forEach((p) => inFlight.current.delete(p.barcode)))
  }, [online, data, uid, notify, reportError])
}
