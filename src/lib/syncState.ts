/** Stato della sincronizzazione mostrato nell'header. */
export type SyncState = 'offline' | 'syncing' | 'synced' | 'online'

/**
 * Modifiche in attesa in uno snapshot: i documenti con scritture non confermate, oppure almeno 1
 * se lo snapshot ha scritture in attesa ma nessun documento visibile (es. un'eliminazione).
 */
export function pendingInSnapshot(docsPending: number, snapshotHasPendingWrites: boolean): number {
  return docsPending > 0 ? docsPending : snapshotHasPendingWrites ? 1 : 0
}

export function syncState(online: boolean, pendingCount: number, justSynced: boolean): SyncState {
  if (!online) return 'offline'
  if (pendingCount > 0) return 'syncing'
  return justSynced ? 'synced' : 'online'
}

export function syncLabel(state: SyncState, pendingCount: number): string {
  const n = pendingCount === 1 ? '1 modifica in attesa' : `${pendingCount} modifiche in attesa`
  switch (state) {
    case 'offline':
      return pendingCount > 0 ? `Offline · ${n}` : 'Offline'
    case 'syncing':
      return `Sincronizzazione in corso (${n})`
    case 'synced':
      return 'Tutto sincronizzato'
    default:
      return 'Online'
  }
}
