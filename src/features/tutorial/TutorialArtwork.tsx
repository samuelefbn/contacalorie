import type { ComponentType, SVGProps } from 'react'
import { AppleIcon, BarcodeIcon, BookIcon, ChartIcon, SearchIcon, UserIcon } from '../../components/ui/Icons'
import type { TutorialArt, TutorialTab } from './steps'

type IconType = ComponentType<SVGProps<SVGSVGElement>>
type P = SVGProps<SVGSVGElement>

// Le stesse icone della barra in basso, così il passo indica il pulsante reale.
const TAB_ICONS: Record<TutorialTab, IconType> = {
  diario: BookIcon,
  alimenti: AppleIcon,
  storico: ChartIcon,
  profilo: UserIcon,
}

export function TabIcon({ tab, ...p }: P & { tab: TutorialTab }) {
  const Icon = TAB_ICONS[tab]
  return <Icon {...p} />
}

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

// Disegni minimi (SVG in linea, nessuna immagine esterna) per i passi senza un'icona dell'app.
const ShieldIcon = (p: P) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke} {...p}>
    <path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
)
const CloudSyncIcon = (p: P) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke} {...p}>
    <path d="M7 18a4 4 0 0 1-.5-8A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9z" />
    <path d="M10 13.5l2-2 2 2M12 11.5V16" />
  </svg>
)

const ART: Record<TutorialArt, IconType> = {
  welcome: ShieldIcon,
  profile: UserIcon,
  diary: BookIcon,
  search: SearchIcon,
  scan: BarcodeIcon,
  history: ChartIcon,
  offline: CloudSyncIcon,
}

/** Illustrazione del passo: icona su un cerchio nei colori dell'app (chiaro e scuro). */
export function TutorialArtwork({ art, className = '' }: { art: TutorialArt; className?: string }) {
  const Icon = ART[art]
  return (
    <div
      aria-hidden="true"
      className={`flex items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300 ${className}`}
    >
      <Icon className="h-1/2 w-1/2" />
    </div>
  )
}
