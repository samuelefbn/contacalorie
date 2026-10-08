import { useState } from 'react'
import { useAuth, useUid } from '../../contexts/AuthContext'
import { useSync } from '../../contexts/SyncContext'
import { useToast } from '../../contexts/ToastContext'
import { deleteAllUserData, deleteAuthAccount, exportAllData, needsRecentLogin, reauthenticateAndDelete } from '../../services/account'
import { wipeLocalDataAndReload } from '../../services/session'
import { downloadCsv, downloadJson, toCsv } from '../../lib/csv'
import { todayKey } from '../../lib/dates'
import { Card, SectionTitle } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/ui/Fields'
import { Sheet } from '../../components/ui/Sheet'

const CONFIRM_WORD = 'ELIMINA'

type DeleteStep = { step: 'closed' } | { step: 'confirm' } | { step: 'running' } | { step: 'reauth' }

/** "Esporta i miei dati" (JSON completo e alimenti in CSV) ed eliminazione dell'account con doppia conferma. */
export function MyDataSection() {
  const uid = useUid()
  const { user } = useAuth()
  const { online } = useSync()
  const { notify, reportError } = useToast()
  const [exporting, setExporting] = useState(false)
  const [del, setDel] = useState<DeleteStep>({ step: 'closed' })
  const [word, setWord] = useState('')

  const exportJson = async () => {
    if (!user) return
    setExporting(true)
    try {
      const data = await exportAllData(uid, user)
      downloadJson(`contacalorie-dati-${todayKey()}.json`, data)
      const csv = toCsv(
        ['Nome', 'Marca', 'Codice a barre', 'Kcal/100 g', 'Proteine/100 g', 'Carboidrati/100 g', 'Grassi/100 g', 'Porzione (g)', 'Tipo', 'Origine', 'Utilizzi', 'Ultimo uso'],
        data.foods.map((f) => [
          f.name, f.brand, f.barcode, f.per100.kcal, f.per100.protein, f.per100.carbs, f.per100.fat,
          f.defaultGrams, f.type, f.origin, f.useCount, f.lastUsedAt?.toISOString().slice(0, 10),
        ]),
      )
      downloadCsv(`contacalorie-alimenti-${todayKey()}.csv`, csv)
    } catch (err) {
      reportError(err)
    } finally {
      setExporting(false)
    }
  }

  const finishDeletion = async () => {
    notify('Account eliminato. Arrivederci!')
    await wipeLocalDataAndReload()
  }

  const runDeletion = async () => {
    if (!user) return
    setDel({ step: 'running' })
    try {
      await deleteAllUserData(uid)
      await deleteAuthAccount(user)
      await finishDeletion()
    } catch (err) {
      if (needsRecentLogin(err)) return setDel({ step: 'reauth' })
      setDel({ step: 'confirm' })
      reportError(err)
    }
  }

  const reauth = async () => {
    if (!user) return
    setDel({ step: 'running' })
    try {
      await reauthenticateAndDelete(user)
      await finishDeletion()
    } catch (err) {
      setDel({ step: 'reauth' })
      reportError(err)
    }
  }

  const askDelete = () => {
    if (!online) return notify('Per eliminare l’account serve una connessione a internet.')
    // Prima conferma.
    if (!confirm('Vuoi davvero eliminare il tuo account e TUTTI i tuoi dati (diario, alimenti, peso, profilo)? L’operazione è irreversibile.')) return
    setWord('')
    setDel({ step: 'confirm' })
  }

  return (
    <Card className="space-y-3">
      <SectionTitle>I miei dati</SectionTitle>
      <Button variant="secondary" className="w-full" onClick={() => void exportJson()} loading={exporting} disabled={exporting}>
        Esporta i miei dati (JSON + alimenti CSV)
      </Button>
      <Button variant="danger" className="w-full" onClick={askDelete}>
        Elimina il mio account e tutti i miei dati
      </Button>

      {del.step !== 'closed' && (
        <Sheet
          title="Elimina account"
          onClose={() => del.step !== 'running' && setDel({ step: 'closed' })}
          footer={
            del.step === 'reauth' ? (
              <Button className="w-full" variant="danger" onClick={() => void reauth()}>
                Accedi di nuovo con Google ed elimina
              </Button>
            ) : (
              <Button
                className="w-full"
                variant="danger"
                loading={del.step === 'running'}
                disabled={word.trim().toUpperCase() !== CONFIRM_WORD || del.step === 'running'}
                onClick={() => void runDeletion()}
              >
                Elimina definitivamente
              </Button>
            )
          }
        >
          {del.step === 'reauth' ? (
            <p className="text-sm">
              I tuoi dati sono stati cancellati. Per eliminare anche l’account Google di accesso, Firebase chiede di confermare di nuovo
              la tua identità: accedi ancora una volta con Google.
            </p>
          ) : (
            <div className="space-y-3">
              <p className="text-sm">
                Verranno cancellati per sempre diario, alimenti, ricette, pesi e profilo, e poi l’account. Ti consiglio di esportare
                prima i tuoi dati.
              </p>
              <TextField
                label={`Scrivi ${CONFIRM_WORD} per confermare`}
                value={word}
                onChange={(e) => setWord(e.target.value)}
                autoComplete="off"
              />
            </div>
          )}
        </Sheet>
      )}
    </Card>
  )
}
