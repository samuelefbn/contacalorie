import type { ComponentType, SVGProps } from 'react'
import type { Tab } from '../../hooks/useHashTab'
import { AppleIcon, BookIcon, ChartIcon, UserIcon } from '../ui/Icons'

const ITEMS: { tab: Tab; label: string; Icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  { tab: 'diario', label: 'Diario', Icon: BookIcon },
  { tab: 'alimenti', label: 'Alimenti', Icon: AppleIcon },
  { tab: 'storico', label: 'Storico', Icon: ChartIcon },
  { tab: 'profilo', label: 'Profilo', Icon: UserIcon },
]

export function BottomNav({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav
      aria-label="Navigazione principale"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/95"
    >
      <ul className="mx-auto flex max-w-2xl">
        {ITEMS.map(({ tab: t, label, Icon }) => {
          const active = t === tab
          return (
            <li key={t} className="flex-1">
              <button
                type="button"
                onClick={() => onChange(t)}
                aria-current={active ? 'page' : undefined}
                className={`flex w-full flex-col items-center gap-0.5 py-2 text-xs font-medium ${
                  active ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <Icon className="h-6 w-6" />
                {label}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
