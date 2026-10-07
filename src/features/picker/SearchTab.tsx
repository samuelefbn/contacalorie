import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import type { Food, FoodItem } from '../../types'
import { useUid } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { getProductByBarcode, resultToItem, searchFoods } from '../../lib/foodSearch'
import { isAbortError } from '../../lib/foodSearch/http'
import { matches, normalize } from '../../lib/text'
import { foodToItem, itemToFoodInput, saveFood } from '../../services/foods'
import { Button } from '../../components/ui/Button'
import { EmptyState, ErrorNotice } from '../../components/ui/Feedback'
import { BarcodeIcon, SearchIcon, StarIcon } from '../../components/ui/Icons'
import { LoadingBlock } from '../../components/ui/Spinner'
import { BarcodeScanner } from './BarcodeScanner'
import { FoodRow } from './FoodRow'

interface Props {
  /** Alimenti personali e usati di recente: cercati per primi, funzionano anche offline. */
  localItems: FoodItem[]
  myFoods: Food[]
  onSelect: (item: FoodItem) => void
  onNotFound: (prefill: { barcode: string | null; name: string }) => void
}

type Prefill = { barcode: string | null; name: string }

type Remote =
  | { status: 'idle' }
  | { status: 'loading'; label: string }
  | { status: 'done'; query: string; items: FoodItem[] }
  | { status: 'error'; error: unknown; retry: () => void; prefill: Prefill }

const MIN_CHARS = 2
const DEBOUNCE_MS = 500

const keyOf = (i: FoodItem) => normalize(`${i.name}|${i.brand ?? ''}`)

export function SearchTab({ localItems, myFoods, onSelect, onNotFound }: Props) {
  const uid = useUid()
  const { notify, reportError } = useToast()
  const [q, setQ] = useState('')
  const [remote, setRemote] = useState<Remote>({ status: 'idle' })
  const [scanning, setScanning] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(
    () => () => {
      clearTimeout(debounceRef.current)
      abortRef.current?.abort()
    },
    [],
  )

  const savedKeys = new Set(myFoods.map((f) => keyOf(foodToItem(f))))

  // Prima i tuoi alimenti e quelli già usati: immediati e disponibili anche offline.
  const local =
    q.trim().length >= MIN_CHARS
      ? Array.from(
          new Map(localItems.filter((i) => matches(`${i.name} ${i.brand ?? ''}`, q)).map((i) => [keyOf(i), i])).values(),
        ).slice(0, 8)
      : []
  const localKeys = new Set(local.map(keyOf))

  const cancelPending = () => {
    clearTimeout(debounceRef.current)
    abortRef.current?.abort()
    abortRef.current = null
  }

  const run = async (label: string, task: (signal: AbortSignal) => Promise<void>, onError: (error: unknown) => Remote) => {
    cancelPending()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setRemote({ status: 'loading', label })
    try {
      await task(ctrl.signal)
    } catch (error) {
      if (!isAbortError(error)) setRemote(onError(error))
    }
  }

  const runSearch = (raw: string) => {
    const query = raw.trim()
    if (query.length < MIN_CHARS) return
    void run(
      'Cerco negli archivi nutrizionali…',
      async (signal) => {
        const outcome = await searchFoods(query, { signal })
        setRemote({ status: 'done', query, items: outcome.results.map(resultToItem) })
      },
      // Compare solo se TUTTE le fonti hanno fallito (o se sei offline).
      (error) => ({ status: 'error', error, retry: () => runSearch(query), prefill: { barcode: null, name: query } }),
    )
  }

  const onQueryChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQ(value)
    cancelPending()
    if (value.trim().length >= MIN_CHARS) {
      debounceRef.current = setTimeout(() => runSearch(value), DEBOUNCE_MS)
    } else {
      setRemote({ status: 'idle' })
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    runSearch(q)
  }

  const lookupBarcode = (code: string) => {
    setScanning(false)
    const mine = myFoods.find((f) => f.barcode === code)
    if (mine) return onSelect(foodToItem(mine))
    void run(
      `Cerco il codice ${code}…`,
      async (signal) => {
        const result = await getProductByBarcode(code, signal)
        setRemote({ status: 'idle' })
        if (result) onSelect(resultToItem(result))
        else {
          notify('Prodotto non trovato su Open Food Facts (o senza valori nutrizionali completi): inseriscilo a mano.')
          onNotFound({ barcode: code, name: '' })
        }
      },
      (error) => ({
        status: 'error',
        error: new Error(
          'Open Food Facts non risponde in questo momento, quindi non posso leggere il codice a barre. ' +
            'Riprova tra poco oppure inserisci l’alimento a mano.',
          { cause: error },
        ),
        retry: () => lookupBarcode(code),
        prefill: { barcode: code, name: '' },
      }),
    )
  }

  const saveToMine = (item: FoodItem) => {
    saveFood(uid, itemToFoodInput(item, true)).done.catch(reportError)
    notify(`${item.name} salvato tra i tuoi alimenti`)
  }

  const onlineItems = remote.status === 'done' ? remote.items.filter((i) => !localKeys.has(keyOf(i))) : []

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="flex gap-2" role="search">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={q}
            onChange={onQueryChange}
            placeholder="Cerca un alimento…"
            aria-label="Cerca un alimento"
            enterKeyHint="search"
            className="h-11 w-full rounded-xl border border-slate-300 bg-white pr-3 pl-10 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 focus:outline-none dark:border-slate-700 dark:bg-slate-950"
          />
        </div>
        <Button type="submit" disabled={q.trim().length < MIN_CHARS}>
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
            <Button size="sm" variant="secondary" onClick={remote.retry}>
              Riprova
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onNotFound(remote.prefill)}>
              Inserisci a mano
            </Button>
          </div>
        </div>
      )}
      {remote.status === 'done' &&
        (remote.items.length === 0 ? (
          local.length === 0 && (
            <EmptyState icon="🔍" title={`Nessun risultato per “${remote.query}”`}>
              <button
                type="button"
                className="font-medium text-emerald-600"
                onClick={() => onNotFound({ barcode: null, name: remote.query })}
              >
                Inseriscilo a mano
              </button>
            </EmptyState>
          )
        ) : (
          onlineItems.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Risultati online</h3>
              <ul>
                {onlineItems.map((item, i) => {
                  const saved = savedKeys.has(keyOf(item))
                  return (
                    <FoodRow
                      key={`${item.source}-${item.barcode ?? ''}-${i}`}
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
          )
        ))}

      {remote.status === 'idle' && local.length === 0 && (
        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          Scrivi almeno 2 lettere: cerco tra i tuoi alimenti, su Open Food Facts e su USDA. Oppure scansiona il codice a barre.
        </p>
      )}

      {scanning && <BarcodeScanner onDetected={lookupBarcode} onClose={() => setScanning(false)} />}
    </div>
  )
}
