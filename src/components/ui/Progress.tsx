import type { ReactNode } from 'react'
import { fmtDec, fmtInt } from '../../lib/format'

interface RingProps {
  value: number
  target: number
  size?: number
  stroke?: number
  children?: ReactNode
}

/** Anello di avanzamento: verde entro l'obiettivo, ambra oltre. */
export function ProgressRing({ value, target, size = 168, stroke = 14, children }: RingProps) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const ratio = target > 0 ? value / target : 0
  const over = ratio > 1
  const dash = c * Math.min(ratio, 1)
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-slate-200 dark:stroke-slate-800" />
        {dash > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c}`}
            className={`transition-[stroke-dasharray] duration-500 ${over ? 'stroke-amber-500' : 'stroke-emerald-500'}`}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  )
}

interface BarProps {
  label: string
  value: number
  target: number
  color: string
  unit?: string
}

export function MacroBar({ label, value, target, color, unit = 'g' }: BarProps) {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-slate-500 tabular-nums dark:text-slate-400">
          {fmtDec(value)} / {fmtInt(target)} {unit}
        </span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
        role="progressbar"
        aria-label={label}
        aria-valuenow={Math.round(value)}
        aria-valuemin={0}
        aria-valuemax={Math.round(target)}
      >
        <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}
