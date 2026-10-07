import type { ReactNode } from 'react'
import type { FoodItem } from '../../types'
import { scaleNutrients } from '../../lib/nutrition'
import { fmtDec, fmtInt, parseNum } from '../../lib/format'
import { NumberField } from '../../components/ui/Fields'

interface Props {
  item: FoodItem
  grams: string
  onGramsChange: (v: string) => void
  children?: ReactNode
}

const QUICK = [50, 100, 150, 200]

/** Scelta della quantità con anteprima live di calorie e macro. */
export function PortionForm({ item, grams, onGramsChange, children }: Props) {
  const g = parseNum(grams)
  const n = scaleNutrients(item.per100, Number.isFinite(g) ? g : 0)
  const portions = item.portions ?? []
  const portionGrams = new Set(portions.map((p) => p.grams))
  const chips = Array.from(new Set([item.defaultGrams, ...QUICK])).filter((x) => x > 0 && !portionGrams.has(x))
  const chipCls =
    'rounded-full bg-slate-100 px-3 py-1 text-sm hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700'

  return (
    <div className="space-y-4">
      <div>
        <p className="text-lg font-semibold">{item.name}</p>
        {item.brand && <p className="text-sm text-slate-500 dark:text-slate-400">{item.brand}</p>}
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Per 100 g: {fmtInt(item.per100.kcal)} kcal · P {fmtDec(item.per100.protein)} · C {fmtDec(item.per100.carbs)} · G{' '}
          {fmtDec(item.per100.fat)}
        </p>
      </div>

      <NumberField label="Quantità" suffix="g" value={grams} onChange={(e) => onGramsChange(e.target.value)} autoFocus />
      {portions.length > 0 && (
        <div>
          <div className="flex flex-wrap gap-2">
            {portions.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => onGramsChange(String(p.grams))}
                className="rounded-full bg-emerald-50 px-3 py-1 text-sm text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
              >
                {p.label} ≈ {fmtInt(p.grams)} g
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Porzioni indicative: pesa l’alimento o modifica i grammi per un valore preciso.
          </p>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {chips.map((c) => (
          <button key={c} type="button" onClick={() => onGramsChange(String(c))} className={chipCls}>
            {c === item.defaultGrams && c !== 100 ? `Porzione ${fmtInt(c)} g` : `${fmtInt(c)} g`}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-2 rounded-2xl bg-slate-50 p-3 text-center dark:bg-slate-950">
        <Stat label="kcal" value={fmtInt(n.kcal)} strong />
        <Stat label="Proteine" value={`${fmtDec(n.protein)} g`} />
        <Stat label="Carboidrati" value={`${fmtDec(n.carbs)} g`} />
        <Stat label="Grassi" value={`${fmtDec(n.fat)} g`} />
      </div>

      {children}
    </div>
  )
}

function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <p className={strong ? 'text-xl font-bold text-emerald-600 dark:text-emerald-400' : 'font-semibold'}>{value}</p>
      <p className="text-[11px] text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  )
}
