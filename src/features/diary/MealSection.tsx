import type { Entry } from '../../types'
import { sumNutrients } from '../../lib/nutrition'
import { fmtDec, fmtInt } from '../../lib/format'
import { Card } from '../../components/ui/Card'
import { PlusIcon } from '../../components/ui/Icons'
import { PendingMark } from '../../components/ui/PendingMark'

interface Props {
  label: string
  icon: string
  entries: Entry[]
  onAdd: () => void
  onEdit: (e: Entry) => void
  onSaveRecipe: () => void
}

export function MealSection({ label, icon, entries, onAdd, onEdit, onSaveRecipe }: Props) {
  const total = sumNutrients(entries)
  return (
    <Card className="p-0">
      <div className="flex items-center gap-3 px-4 pt-3 pb-2">
        <span className="text-2xl" aria-hidden="true">
          {icon}
        </span>
        <div className="flex-1">
          <h2 className="font-semibold">{label}</h2>
          <p className="text-xs text-slate-500 tabular-nums dark:text-slate-400">
            {fmtInt(total.kcal)} kcal · P {fmtDec(total.protein)} · C {fmtDec(total.carbs)} · G {fmtDec(total.fat)}
          </p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          aria-label={`Aggiungi a ${label}`}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white shadow hover:bg-emerald-700"
        >
          <PlusIcon className="h-5 w-5" />
        </button>
      </div>
      {entries.length > 0 && (
        <>
          <ul className="border-t border-slate-100 dark:border-slate-800">
            {entries.map((e) => (
              <li key={e.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                <button type="button" onClick={() => onEdit(e)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <div className="min-w-0 flex-1">
                    <p className="flex min-w-0 items-center gap-1.5">
                      <span className="truncate">{e.name}</span>
                      {e.pending && <PendingMark />}
                    </p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {fmtInt(e.grams)} g{e.brand ? ` · ${e.brand}` : ''}
                    </p>
                  </div>
                  <span className="text-sm font-medium tabular-nums">{fmtInt(e.kcal)} kcal</span>
                </button>
              </li>
            ))}
          </ul>
          {entries.length > 1 && (
            <div className="px-4 py-2 text-right">
              <button type="button" onClick={onSaveRecipe} className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                Salva il pasto come ricetta
              </button>
            </div>
          )}
        </>
      )}
    </Card>
  )
}
