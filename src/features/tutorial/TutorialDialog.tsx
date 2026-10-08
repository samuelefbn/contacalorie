import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '../../components/ui/Button'
import { TUTORIAL_STEPS, type TutorialStep } from './steps'
import { TabIcon, TutorialArtwork } from './TutorialArtwork'

interface Props {
  /** completed = true con "Inizia" all'ultimo passo; false con "Salta tutorial", × o Esc. */
  onFinish: (completed: boolean) => void
  steps?: TutorialStep[]
}

const FOCUSABLE = 'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

/** Tutorial di benvenuto a passi: "bottom sheet" su mobile, finestra centrata su schermi larghi. */
export function TutorialDialog({ onFinish, steps = TUTORIAL_STEPS }: Props) {
  const id = useId()
  const [index, setIndex] = useState(0)
  const panelRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const onFinishRef = useRef(onFinish)
  useEffect(() => {
    onFinishRef.current = onFinish
  })

  const step = steps[index]
  const first = index === 0
  const last = index === steps.length - 1

  // Apertura: blocca lo scorrimento della pagina; chiusura: restituisce il focus a chi lo aveva.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = overflow
      previous?.focus?.()
    }
  }, [])

  // A ogni passo il focus va sul titolo, così il lettore di schermo legge il nuovo contenuto.
  useEffect(() => {
    titleRef.current?.focus()
  }, [index])

  // Tastiera sulla finestra (non sul pannello): Esc funziona anche se il focus è finito fuori.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onFinishRef.current(false)
        return
      }
      if (e.key !== 'Tab') return
      // Il focus resta dentro il tutorial (dialogo modale).
      const panel = panelRef.current
      const items = [...(panel?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])]
      if (!panel || items.length === 0) return
      const firstEl = items[0]
      const lastEl = items[items.length - 1]
      const active = document.activeElement
      const outside = !panel.contains(active)
      if (e.shiftKey && (outside || active === firstEl || active === titleRef.current)) {
        e.preventDefault()
        lastEl.focus()
      } else if (!e.shiftKey && (outside || active === lastEl)) {
        e.preventDefault()
        firstEl.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return createPortal(
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-slate-950/55" aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-body`}
        className="relative flex max-h-[92dvh] w-full flex-col rounded-t-3xl bg-white shadow-2xl sm:max-w-md sm:rounded-3xl dark:bg-slate-900"
      >
        <header className="flex items-center justify-between gap-2 px-4 pt-3">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400" aria-live="polite">
            {index + 1} di {steps.length}
          </p>
          <button
            type="button"
            onClick={() => onFinish(false)}
            className="rounded-lg px-2 py-1 text-sm font-medium text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-emerald-500 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Salta tutorial
          </button>
        </header>

        <div className="flex-1 overflow-y-auto overscroll-contain px-6 pt-2 pb-4">
          <TutorialArtwork art={step.art} className="mx-auto h-28 w-28" />
          <h2 id={`${id}-title`} ref={titleRef} tabIndex={-1} className="mt-4 text-center text-xl font-bold outline-none">
            {step.title}
          </h2>
          <div id={`${id}-body`} className="mt-3 space-y-2 text-center text-base leading-relaxed text-slate-700 dark:text-slate-300">
            {step.body.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
          {step.where && (
            <p className="mt-4 flex items-center justify-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
              <TabIcon tab={step.where.tab} className="h-5 w-5" />
              {step.where.text}
            </p>
          )}
        </div>

        <footer className="border-t border-slate-200 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] dark:border-slate-800">
          <ol className="mb-3 flex justify-center gap-1.5" aria-hidden="true">
            {steps.map((s, i) => (
              <li
                key={s.title}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? 'w-5 bg-emerald-600 dark:bg-emerald-400' : 'w-1.5 bg-slate-300 dark:bg-slate-700'
                }`}
              />
            ))}
          </ol>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setIndex(index - 1)} disabled={first}>
              Indietro
            </Button>
            {last ? (
              <Button className="flex-1" onClick={() => onFinish(true)}>
                Inizia
              </Button>
            ) : (
              <Button className="flex-1" onClick={() => setIndex(index + 1)}>
                Avanti
              </Button>
            )}
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  )
}
