import { useMemo, useState } from 'react'
import type { Profile } from '../../types'
import { useUid } from '../../contexts/AuthContext'
import { useEntriesRange } from '../../hooks/data'
import { formatShortDate, lastNDays, todayKey } from '../../lib/dates'
import { fmtDec, fmtInt } from '../../lib/format'
import { DEFAULT_PROFILE } from '../../services/mappers'
import { Card, SectionTitle } from '../../components/ui/Card'
import { Segmented } from '../../components/ui/Fields'
import { EmptyState, ErrorNotice } from '../../components/ui/Feedback'
import { LoadingBlock } from '../../components/ui/Spinner'
import { CaloriesChart } from './CaloriesChart'
import { WeightSection } from './WeightSection'
import { average, dailyTotals, weeks } from './stats'

type Period = '7' | '30'

export default function HistoryPage({ profile }: { profile: Profile | null }) {
  const uid = useUid()
  const [period, setPeriod] = useState<Period>('7')
  const days = useMemo(() => lastNDays(todayKey(), Number(period)), [period])
  const { data: entries, loading, error } = useEntriesRange(uid, days[0], days[days.length - 1])
  const target = (profile ?? DEFAULT_PROFILE).kcalTarget

  const totals = useMemo(() => dailyTotals(days, entries), [days, entries])
  const avg = average(totals)
  const onTarget = totals.filter((d) => d.logged && d.kcal <= target).length

  return (
    <div className="space-y-4">
      <Card className="space-y-4">
        <SectionTitle>Calorie</SectionTitle>
        <Segmented<Period>
          label="Periodo"
          value={period}
          onChange={setPeriod}
          options={[
            { value: '7', label: 'Ultimi 7 giorni' },
            { value: '30', label: 'Ultimi 30 giorni' },
          ]}
        />
        {error ? (
          <ErrorNotice error={error} />
        ) : loading ? (
          <LoadingBlock />
        ) : !avg ? (
          <EmptyState icon="📊" title="Nessun dato nel periodo">
            Registra qualche pasto per vedere l’andamento.
          </EmptyState>
        ) : (
          <>
            <dl className="grid grid-cols-3 gap-2 text-center">
              <Tile label="Media giornaliera" value={`${fmtInt(avg.kcal)}`} unit="kcal" />
              <Tile label="Giorni registrati" value={`${avg.count}/${days.length}`} />
              <Tile label="Entro l’obiettivo" value={`${onTarget}/${avg.count}`} />
            </dl>
            <CaloriesChart data={totals} target={target} />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Macro medi: P {fmtDec(avg.protein)} g · C {fmtDec(avg.carbs)} g · G {fmtDec(avg.fat)} g. Le medie considerano solo i giorni
              registrati.
            </p>

            <div>
              <h3 className="mb-2 text-sm font-semibold">Media settimanale</h3>
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-slate-500">
                  <tr>
                    <th className="py-1 font-medium">Settimana</th>
                    <th className="py-1 text-right font-medium">Media kcal</th>
                    <th className="py-1 text-right font-medium">vs obiettivo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {weeks(totals).map((w) => {
                    const a = average(w)
                    const diff = a ? a.kcal - target : null
                    return (
                      <tr key={w[0].date}>
                        <td className="py-1.5">
                          {formatShortDate(w[0].date)} – {formatShortDate(w[w.length - 1].date)}
                        </td>
                        <td className="py-1.5 text-right tabular-nums">{a ? fmtInt(a.kcal) : '–'}</td>
                        <td className="py-1.5 text-right tabular-nums">{diff == null ? '–' : `${diff > 0 ? '+' : ''}${fmtInt(diff)}`}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <details className="text-sm">
              <summary className="cursor-pointer font-medium text-emerald-700 dark:text-emerald-400">Mostra dati giornalieri</summary>
              <table className="mt-2 w-full">
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {[...totals].reverse().map((d) => (
                    <tr key={d.date}>
                      <td className="py-1">{formatShortDate(d.date)}</td>
                      <td className="py-1 text-right tabular-nums">{d.logged ? `${fmtInt(d.kcal)} kcal` : '–'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </>
        )}
      </Card>

      <WeightSection profile={profile} />
    </div>
  )
}

function Tile({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="flex flex-col-reverse rounded-xl bg-slate-50 p-2 dark:bg-slate-950">
      <dt className="text-[11px] text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="text-lg font-bold tabular-nums">
        {value}
        {unit && <span className="ml-1 text-xs font-normal text-slate-500">{unit}</span>}
      </dd>
    </div>
  )
}
