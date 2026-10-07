import { useState } from 'react'
import { useUid } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { fetchEntries } from '../../services/entries'
import { fetchWeights } from '../../services/weights'
import { downloadCsv, toCsv } from '../../lib/csv'
import { isValidDateKey, todayKey } from '../../lib/dates'
import { mealLabel } from '../../lib/nutrition'
import { Card, SectionTitle } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/ui/Fields'

const SOURCE_LABEL = { off: 'Open Food Facts', manual: 'Manuale', custom: 'Alimento personale', recipe: 'Ricetta' } as const

/** Esportazione in CSV di diario e peso (separatore ";" e virgola decimale, per Excel in italiano). */
export function ExportSection() {
  const uid = useUid()
  const { notify, reportError } = useToast()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [busy, setBusy] = useState<'entries' | 'weights' | null>(null)

  const rangeValid = (!from || isValidDateKey(from)) && (!to || isValidDateKey(to)) && (!from || !to || from <= to)

  const exportEntries = async () => {
    setBusy('entries')
    try {
      const entries = await fetchEntries(uid, from || undefined, to || undefined)
      if (entries.length === 0) return notify('Nessuna voce nel periodo selezionato.')
      const csv = toCsv(
        ['Data', 'Pasto', 'Alimento', 'Marca', 'Grammi', 'Kcal', 'Proteine (g)', 'Carboidrati (g)', 'Grassi (g)', 'Origine'],
        entries.map((e) => [e.date, mealLabel(e.mealType), e.name, e.brand, e.grams, e.kcal, e.protein, e.carbs, e.fat, SOURCE_LABEL[e.source]]),
      )
      downloadCsv(`contacalorie-diario-${from || 'inizio'}_${to || todayKey()}.csv`, csv)
    } catch (err) {
      reportError(err)
    } finally {
      setBusy(null)
    }
  }

  const exportWeights = async () => {
    setBusy('weights')
    try {
      const weights = (await fetchWeights(uid)).filter((w) => (!from || w.date >= from) && (!to || w.date <= to))
      if (weights.length === 0) return notify('Nessun peso registrato nel periodo selezionato.')
      downloadCsv(`contacalorie-peso-${todayKey()}.csv`, toCsv(['Data', 'Peso (kg)'], weights.map((w) => [w.date, w.kg])))
    } catch (err) {
      reportError(err)
    } finally {
      setBusy(null)
    }
  }

  return (
    <Card className="space-y-3">
      <SectionTitle>Esporta i dati (CSV)</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Dal" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <TextField label="Al" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">Lascia vuote le date per esportare tutto.</p>
      <div className="flex gap-2">
        <Button className="flex-1" variant="secondary" onClick={exportEntries} loading={busy === 'entries'} disabled={!rangeValid || busy !== null}>
          Diario
        </Button>
        <Button className="flex-1" variant="secondary" onClick={exportWeights} loading={busy === 'weights'} disabled={!rangeValid || busy !== null}>
          Peso
        </Button>
      </div>
    </Card>
  )
}
