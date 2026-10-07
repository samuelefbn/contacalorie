import { useRef } from 'react'
import { addDays, formatDayLabel, isValidDateKey, todayKey } from '../../lib/dates'
import { ChevronLeft, ChevronRight } from '../../components/ui/Icons'

interface Props {
  date: string
  onChange: (date: string) => void
}

/** Giorno precedente/successivo, ritorno a oggi e calendario nativo. */
export function DayNavigator({ date, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const today = todayKey()

  const openCalendar = () => {
    const input = inputRef.current
    if (!input) return
    try {
      input.showPicker()
    } catch {
      input.focus()
    }
  }

  const arrowCls =
    'flex h-10 w-10 items-center justify-center rounded-full text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800'

  return (
    <div className="flex items-center justify-between gap-2">
      <button type="button" className={arrowCls} onClick={() => onChange(addDays(date, -1))} aria-label="Giorno precedente">
        <ChevronLeft />
      </button>
      <div className="relative flex flex-col items-center">
        <button type="button" onClick={openCalendar} className="rounded-lg px-3 py-1 text-lg font-semibold hover:bg-slate-200 dark:hover:bg-slate-800">
          📅 {formatDayLabel(date, today)}
        </button>
        {date !== today && (
          <button type="button" onClick={() => onChange(today)} className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
            Torna a oggi
          </button>
        )}
        <input
          ref={inputRef}
          type="date"
          value={date}
          onChange={(e) => isValidDateKey(e.target.value) && onChange(e.target.value)}
          aria-label="Scegli una data"
          className="pointer-events-none absolute inset-0 opacity-0"
          tabIndex={-1}
        />
      </div>
      <button type="button" className={arrowCls} onClick={() => onChange(addDays(date, 1))} aria-label="Giorno successivo">
        <ChevronRight />
      </button>
    </div>
  )
}
