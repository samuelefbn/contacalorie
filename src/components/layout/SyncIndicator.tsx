import { useSync } from '../../contexts/SyncContext'
import { syncLabel } from '../../lib/syncState'

const DOT = {
  offline: 'bg-slate-400',
  syncing: 'bg-amber-500 animate-pulse',
  synced: 'bg-emerald-500',
  online: 'bg-emerald-500',
} as const

const HINT = {
  offline: 'Sei offline: puoi continuare a usare l’app, le modifiche si sincronizzano al ritorno della connessione.',
  syncing: 'Invio delle modifiche fatte sul dispositivo.',
  synced: 'Tutte le modifiche sono salvate sul server.',
  online: 'Connesso: le modifiche vengono salvate subito.',
} as const

/** Stato della connessione e della sincronizzazione, discreto nell'header. */
export function SyncIndicator() {
  const { state, pendingCount } = useSync()
  return (
    <p
      role="status"
      aria-live="polite"
      title={HINT[state]}
      className="flex shrink-0 items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400"
    >
      <span className={`h-2 w-2 rounded-full ${DOT[state]}`} aria-hidden="true" />
      {syncLabel(state, pendingCount)}
    </p>
  )
}
