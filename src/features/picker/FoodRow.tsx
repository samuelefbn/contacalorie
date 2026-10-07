import type { ReactNode } from 'react'
import type { FoodItem } from '../../types'
import { fmtInt } from '../../lib/format'

const SOURCE_BADGE: Partial<Record<FoodItem['source'], string>> = {
  recipe: 'Ricetta',
  custom: 'Mio',
  off: 'Open Food Facts',
  usda: 'USDA',
}

interface Props {
  item: FoodItem
  onSelect: () => void
  actions?: ReactNode
}

/** Riga di un alimento in un elenco: tocco per scegliere la quantità, azioni opzionali a destra. */
export function FoodRow({ item, onSelect, actions }: Props) {
  const badge = SOURCE_BADGE[item.source]
  return (
    <li className="flex items-center gap-2 border-b border-slate-100 last:border-0 dark:border-slate-800">
      <button type="button" onClick={onSelect} className="flex min-w-0 flex-1 items-center gap-3 py-3 text-left">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt="" loading="lazy" className="h-10 w-10 shrink-0 rounded-lg bg-white object-contain" />
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">
            {item.name}
            {badge && (
              <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 align-middle text-[10px] font-semibold text-emerald-800 uppercase dark:bg-emerald-900/50 dark:text-emerald-300">
                {badge}
              </span>
            )}
          </p>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
            {item.brand ? `${item.brand} · ` : ''}
            {fmtInt(item.per100.kcal)} kcal/100 g · porzione {fmtInt(item.defaultGrams)} g
          </p>
        </div>
      </button>
      {actions}
    </li>
  )
}
