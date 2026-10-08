import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useSync } from '../../contexts/SyncContext'
import { useToast } from '../../contexts/ToastContext'
import { flushPendingWrites } from '../../services/session'
import { Card, SectionTitle } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'

const fmtDateTime = (iso: string | undefined) =>
  iso ? new Date(iso).toLocaleString('it-IT', { dateStyle: 'medium', timeStyle: 'short' }) : '–'

const modifiche = (n: number) => (n === 1 ? '1 modifica non ancora sincronizzata' : `${n} modifiche non ancora sincronizzate`)

/** Account Google: foto, nome, email, ultimo accesso e logout sicuro per dispositivi condivisi. */
export function AccountSection() {
  const { user, signOut } = useAuth()
  const { online, pendingCount } = useSync()
  const { reportError } = useToast()
  const [busy, setBusy] = useState<string | null>(null)

  const leave = async () => {
    try {
      if (online) {
        // Prima di uscire si aspetta che il server confermi le modifiche fatte sul dispositivo.
        setBusy('Sincronizzo le ultime modifiche…')
        const synced = await flushPendingWrites()
        if (
          !synced &&
          !confirm('Alcune modifiche non sono ancora state inviate al server. Se esci ora andranno perse. Uscire comunque?')
        ) {
          return setBusy(null)
        }
      } else {
        const msg =
          pendingCount > 0
            ? `Sei offline e hai ${modifiche(pendingCount)}: se esci ora andranno perse. Uscire comunque?`
            : 'Sei offline: le eventuali modifiche non ancora sincronizzate andranno perse. Uscire comunque?'
        if (!confirm(msg)) return
      }
      setBusy('Esco e cancello i dati da questo dispositivo…')
      await signOut()
    } catch (err) {
      setBusy(null)
      reportError(err)
    }
  }

  if (!user) return null
  return (
    <Card className="space-y-3">
      <SectionTitle>Account</SectionTitle>
      <div className="flex items-center gap-3">
        {user.photoURL ? (
          <img src={user.photoURL} alt="" className="h-12 w-12 rounded-full" referrerPolicy="no-referrer" />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-xl dark:bg-emerald-900">👤</div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{user.displayName ?? 'Utente'}</p>
          <p className="truncate text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Ultimo accesso: {fmtDateTime(user.metadata.lastSignInTime)}</p>
        </div>
      </div>
      <Button variant="secondary" className="w-full" onClick={() => void leave()} loading={busy !== null} disabled={busy !== null}>
        {busy ?? 'Esci'}
      </Button>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Uscendo, i tuoi dati vengono cancellati da questo dispositivo (restano al sicuro sul tuo account): il prossimo utente non
        vedrà nulla di tuo.
      </p>
    </Card>
  )
}
