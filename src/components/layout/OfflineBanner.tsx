import { useOnlineStatus } from '../../hooks/useOnlineStatus'

export function OfflineBanner() {
  const online = useOnlineStatus()
  if (online) return null
  return (
    <div role="status" className="bg-amber-500 px-4 py-1.5 text-center text-sm font-medium text-amber-950">
      Sei offline: puoi continuare a usare il diario, i dati si sincronizzeranno al ritorno della connessione.
    </div>
  )
}
