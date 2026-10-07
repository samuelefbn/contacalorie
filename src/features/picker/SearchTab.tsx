import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { Food, FoodItem } from '../../types'
import { useUid } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { getProductByBarcode, searchProducts } from '../../lib/openFoodFacts'
import { matches, normalize } from '../../lib/text'
import { foodToItem, itemToFoodInput, saveFood } from '../../services/foods'
import { Button } from '../../components/ui/Button'
import { EmptyState, ErrorNotice } from '../../components/ui/Feedback'
import { BarcodeIcon, SearchIcon, StarIcon } from '../../components/ui/Icons'
import { LoadingBlock } from '../../components/ui/Spinner'
import { BarcodeScanner } from './BarcodeScanner'
import { FoodRow } from './FoodRow'

interface Props {
  /** Alimenti personali e recenti, filtrati localmente mentre si scrive. */
  localItems: FoodItem[]
  myFoods: Food[]
  onSelect: (item: FoodItem) => void
  onNotFound: (prefill: { barcode: string | null; name: string }) => void
}

type Remote =
  | { status: 'idle' }
  | { status: 'loading'; label: string }
  | { status: 'done'; query: string; items: FoodItem[] }
  | { status: 'error'; error: unknown }

const keyOf = (i: FoodItem) => normalize(`${i.name}|${i.brand ?? ''}`)

export function SearchTab({ localItems, myFoods, onSelect, onNotFound }: Props) {
  const uid = useUid()
  const { notify, reportError } = useToast()
  const [q, setQ] = useState('')
  const [remote, setRemote] = useState<Remote>({ status: 'idle' })
  const [scanning, setScanning] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => () => abortRef.current?.abort(), [])

  const savedKeys = new Set(myFoods.map((f) => keyOf(foodToItem(f))))

  const local = q.trim().length >= 2
    ? Array.from(new Map(localItems.filter((i) => matches(`${i.name} ${i.brand ?? ''}`, q)).map((i) => [keyOf(i), i])).values()).slice(0, 8)
    : []

  const run = async (label: string, task: (signal: AbortSignal) => Promise<void>) => {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setRemote({ status: 'loading', label })
    try {
      await task(ctrl.signal)
    } catch (error) {
      if ((error as Error).name !== 'AbortError') setRemote({ status: 'error', error })
    }
  }

  // La ricerca online parte solo all'invio: l'API di Open Food Facts limita le ricerche al minuto.
  const runSearch = () => {
    const query = q.trim()
    if (query.length < 2) return
    void run('Cerco su Open Food Facts…', async (signal) => {
      const items = await searchProducts(query, signal)
      setRemote({ status: 'done', query, items })
    })
  }

  const search = (e: FormEvent) => {
    e.preventDefault()
    runSearch()
  }

  const lookupBarcode = (code: string) => {
    setScanning(false)
    const mine = myFoods.find((f) => f.barcode === code)
    if (mine) return onSelect(foodToItem(mine))
    void run(`Cerco il codice ${code}…`, async (signal) => {
      const item = await getProductByBarcode(code, signal)
      setRemote({ status: 'idle' })
      if (item) onSelect(item)
      else {
        notify('Prodotto non trovato su Open Food Facts: inseriscilo a mano.')
        onNotFound({ barcode: code, name: '' })
      }
    })
  }

  const saveToMine = (item: FoodItem) => {
    saveFood(uid, itemToFoodInput(item, true)).done.catch(reportError)
    notify(`${item.name} salvato tra i tuoi alimenti`)
  }

  return (
    <div className="space-y-4">
      <form onSubmit={search} className="flex gap-2" role="search">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cerca un alimento…"
            aria-label="Cerca un alimento"
            enterKeyHint="search"
            className="h-11 w-full rounded-xl border border-slate-300 bg-white pr-3 pl-10 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 focus:outline-none dark:border-slate-700 dark:bg-slate-950"
          />
        </div>
        <Button type="submit" disabled={q.trim().length < 2}>
          Cerca
        </Button>
        <Button variant="secondary" size="icon" onClick={() => setScanning(true)} aria-label="Scansiona codice a barre">
          <BarcodeIcon className="h-5 w-5" />
        </Button>
      </form>

      {local.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Dai tuoi alimenti</h3>
          <ul>
            {local.map((item) => (
              <FoodRow key={keyOf(item)} item={item} onSelect={() => onSelect(item)} />
            ))}
          </ul>
        </section>
      )}

      {remote.status === 'loading' && <LoadingBlock label={remote.label} />}
      {remote.status === 'error' && (
        <div className="space-y-2">
          <ErrorNotice error={remote.error} title="Ricerca non riuscita" />
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={runSearch} disabled={q.trim().length < 2}>
              Riprova
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onNotFound({ barcode: null, name: q.trim() })}>
              Inserisci a mano
            </Button>
          </div>
        </div>
      )}
      {remote.status === 'done' &&
        (remote.items.length === 0 ? (
          <EmptyState icon="🔍" title={`Nessun risultato per “${remote.query}”`}>
            <button type="button" className="font-medium text-emerald-600" onClick={() => onNotFound({ barcode: null, name: remote.query })}>
              Inseriscilo a mano
            </button>
          </EmptyState>
        ) : (
          <section>
            <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Open Food Facts</h3>
            <ul>
              {remote.items.map((item, i) => {
                const saved = savedKeys.has(keyOf(item))
                return (
                  <FoodRow
                    key={`${item.barcode ?? ''}-${i}`}
                    item={item}
                    onSelect={() => onSelect(item)}
                    actions={
                      <button
                        type="button"
                        disabled={saved}
                        aria-label={saved ? 'Già tra i tuoi alimenti' : 'Salva tra i tuoi alimenti'}
                        onClick={() => saveToMine(item)}
                        className="flex h-9 w-9 items-center justify-center text-amber-500 disabled:opacity-100"
                      >
                        <StarIcon filled={saved} className="h-5 w-5" />
                      </button>
                    }
                  />
                )
              })}
            </ul>
          </section>
        ))}

      {remote.status === 'idle' && local.length === 0 && (
        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          Cerca per nome nel database Open Food Facts oppure scansiona il codice a barre.
        </p>
      )}

      {scanning && <BarcodeScanner onDetected={lookupBarcode} onClose={() => setScanning(false)} />}
    </div>
  )
}
