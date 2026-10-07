import type { Nutrients, Profile } from '../../types'
import { fmtInt } from '../../lib/format'
import { Card } from '../../components/ui/Card'
import { MacroBar, ProgressRing } from '../../components/ui/Progress'

interface Props {
  totals: Nutrients
  targets: Pick<Profile, 'kcalTarget' | 'proteinTarget' | 'carbsTarget' | 'fatTarget'>
}

/** Dashboard del giorno: calorie consumate vs obiettivo, rimanenti e macro. */
export function DaySummary({ totals, targets }: Props) {
  const remaining = targets.kcalTarget - totals.kcal
  const over = remaining < 0
  return (
    <Card className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
      <ProgressRing value={totals.kcal} target={targets.kcalTarget}>
        <span className={`text-3xl font-bold tabular-nums ${over ? 'text-amber-600 dark:text-amber-400' : ''}`}>
          {fmtInt(Math.abs(remaining))}
        </span>
        <span className="text-xs text-slate-500 dark:text-slate-400">{over ? 'kcal oltre l’obiettivo' : 'kcal rimanenti'}</span>
      </ProgressRing>
      <div className="w-full flex-1 space-y-3">
        <div className="flex justify-between text-sm">
          <span>
            Consumate <strong className="tabular-nums">{fmtInt(totals.kcal)}</strong>
          </span>
          <span>
            Obiettivo <strong className="tabular-nums">{fmtInt(targets.kcalTarget)}</strong>
          </span>
        </div>
        <MacroBar label="Proteine" value={totals.protein} target={targets.proteinTarget} color="var(--color-protein)" />
        <MacroBar label="Carboidrati" value={totals.carbs} target={targets.carbsTarget} color="var(--color-carbs)" />
        <MacroBar label="Grassi" value={totals.fat} target={targets.fatTarget} color="var(--color-fat)" />
      </div>
    </Card>
  )
}
