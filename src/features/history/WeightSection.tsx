import { useState, type FormEvent } from 'react'
import type { Profile } from '../../types'
import { useUid } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { useWeights } from '../../hooks/data'
import { deleteWeight, logWeight } from '../../services/weights'
import { formatShortDate, isValidDateKey, todayKey } from '../../lib/dates'
import { fmtDec, numToInput, parseNum } from '../../lib/format'
import { Card, SectionTitle } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { NumberField, TextField } from '../../components/ui/Fields'
import { EmptyState, ErrorNotice } from '../../components/ui/Feedback'
import { LoadingBlock } from '../../components/ui/Spinner'
import { WeightChart } from './WeightChart'
import { PendingMark } from '../../components/ui/PendingMark'

export function WeightSection({ profile }: { profile: Profile | null }) {
  const uid = useUid()
  const { notify, reportError } = useToast()
  const weights = useWeights(uid)
  const [date, setDate] = useState(todayKey())
  const [kg, setKg] = useState(() => numToInput(profile?.weightKg))

  const value = parseNum(kg)
  const valid = Number.isFinite(value) && value >= 20 && value <= 400 && isValidDateKey(date)
  const last = weights.data[weights.data.length - 1]
  const first = weights.data[0]

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!valid) return
    logWeight(uid, date, Math.round(value * 10) / 10, profile).catch(reportError)
    notify(`Peso del ${formatShortDate(date)} registrato`)
  }

  return (
    <Card className="space-y-4">
      <SectionTitle>Peso</SectionTitle>
      <form onSubmit={submit} className="flex items-end gap-2">
        <TextField label="Data" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="flex-1" />
        <NumberField label="Peso" suffix="kg" value={kg} onChange={(e) => setKg(e.target.value)} className="w-28" />
        <Button type="submit" disabled={!valid}>
          Salva
        </Button>
      </form>

      {weights.loading ? (
        <LoadingBlock />
      ) : weights.error ? (
        <ErrorNotice error={weights.error} />
      ) : weights.data.length === 0 ? (
        <EmptyState icon="⚖️" title="Nessun peso registrato">
          Registra il peso regolarmente per vederne l’andamento.
        </EmptyState>
      ) : (
        <>
          {weights.data.length > 1 && (
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Ultimo: <strong>{fmtDec(last.kg)} kg</strong> · Variazione dal {formatShortDate(first.date)}:{' '}
              <strong>
                {last.kg - first.kg > 0 ? '+' : ''}
                {fmtDec(last.kg - first.kg)} kg
              </strong>
            </p>
          )}
          <WeightChart data={weights.data} />
          <details className="text-sm">
            <summary className="cursor-pointer font-medium text-emerald-700 dark:text-emerald-400">Mostra registrazioni</summary>
            <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
              {[...weights.data].reverse().map((w) => (
                <li key={w.date} className="flex items-center justify-between py-1.5">
                  <span>{formatShortDate(w.date)} {w.date.slice(0, 4)}</span>
                  <span className="flex items-center gap-2">
                    {w.pending && <PendingMark />}
                    <strong className="tabular-nums">{fmtDec(w.kg)} kg</strong>
                    <button
                      type="button"
                      aria-label={`Elimina il peso del ${formatShortDate(w.date)}`}
                      onClick={() => deleteWeight(uid, w.date).catch(reportError)}
                      className="h-8 w-8 rounded-full text-lg text-slate-400 hover:bg-slate-100 hover:text-red-600 dark:hover:bg-slate-800"
                    >
                      ×
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </details>
        </>
      )}
    </Card>
  )
}
