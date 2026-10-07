import type { ReactNode } from 'react'
import { errorMessage } from '../../lib/format'

export function ErrorNotice({ error, title = 'Impossibile caricare i dati' }: { error: unknown; title?: string }) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
    >
      <p className="font-medium">{title}</p>
      <p className="mt-1">{errorMessage(error)}</p>
    </div>
  )
}

export function EmptyState({ icon, title, children }: { icon: string; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-8 text-center text-slate-500 dark:text-slate-400">
      <span className="text-3xl" aria-hidden="true">
        {icon}
      </span>
      <p className="font-medium text-slate-700 dark:text-slate-200">{title}</p>
      {children && <div className="text-sm">{children}</div>}
    </div>
  )
}
