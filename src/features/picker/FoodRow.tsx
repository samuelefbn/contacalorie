import type { ReactNode } from 'react'
import type { FoodItem } from '../../types'
import { fmtDec, fmtInt } from '../../lib/format'

// Nessun badge della fonte (Open Food Facts / USDA): solo i tuoi alimenti e le ricette sono segnalati.
const OWN_BADGE: Partial<Record<FoodItem['source'], string>> = { recipe: 'Ricetta', custom: 'Mio' }

interface Props {
  item: FoodItem
  onSelect: () => void
  actions?: ReactNode
}

/** Riga di un alimento: nome in grassetto, sotto kcal e macro per 100 g (marca in secondo piano). */
export function FoodRow({ item, onSelect, actions }: Props) {
  const badge = OWN_BADGE[item.source]
  const n = item.per100
  return (
    <li className="flex items-center gap-2 border-b border-slate-100 last:border-0 dark:border-slate-800">
      <button type="button" onClick={onSelect} className="flex min-w-0 flex-1 items-center gap-3 py-3 text-left">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt="" loading="lazy" className="h-10 w-10 shrink-0 rounded-lg bg-white object-contain" />
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate font-semibold">{item.name}</p>
            {badge && (
              <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 uppercase dark:bg-slate-800 dark:text-slate-300">
                {badge}
              </span>
            )}
          </div>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
            {item.brand && <span className="text-slate-400 dark:text-slate-500">{item.brand} · </span>}
            {fmtInt(n.kcal)} kcal/100 g · P {fmtDec(n.protein)} · C {fmtDec(n.carbs)} · G {fmtDec(n.fat)}
          </p>
        </div>
      </button>
      {actions}
    </li>
  )
}
