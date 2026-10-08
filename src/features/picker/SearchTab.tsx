import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import type { Food, FoodItem } from '../../types'
import { useUid } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import {
  AllSourcesFailedError,
  allSourcesFailed,
  getProductByBarcode,
  mergeGeneric,
  rankGenericResults,
  OfflineError,
  resultToItem,
  searchGenericDataset,
  searchOnline,
  type FoodResult,
  type OnlineOutcome,
} from '../../lib/foodSearch'
import { isAbortError } from '../../lib/foodSearch/http'
import { matches, normalize } from '../../lib/text'
import { cleanBarcode, foodKey, foodLabel } from '../../lib/foodLibrary'
import { createMyFoodsSearch } from '../../lib/myFoodsSearch'
import { findSavedFood, foodToItem, recordFoodUse, setFavorite } from '../../services/foods'
import { queuePendingScan } from '../../services/pendingScans'
import { Button } from '../../components/ui/Button'
import { EmptyState, ErrorNotice } from '../../components/ui/Feedback'
import { BarcodeIcon, SearchIcon, StarIcon } from '../../components/ui/Icons'
import { LoadingBlock, Spinner } from '../../components/ui/Spinner'
import { BarcodeScanner } from './BarcodeScanner'
import { FoodRow } from './FoodRow'

interface Props {
  /** I miei alimenti (scansionati, usati, preferiti, ricette): cercati per primi, anche offline. */
  myFoods: Food[]
  /** Alimenti delle voci di diario recenti (anche quelle registrate prima dei "miei alimenti"). */
  recentItems: FoodItem[]
  onSelect: (item: FoodItem) => void
  onNotFound: (prefill: { barcode: string | null; name: string }) => void
}

type Prefill = { barcode: string | null; name: string }

type Remote =
  | { status: 'idle' }
  | { status: 'loading'; query: string }
  | { status: 'done'; query: string; outcome: OnlineOutcome }
  | { status: 'barcode'; label: string }
  | { status: 'offlineScan'; code: string }
  | { status: 'error'; error: unknown; retry: () => void; prefill: Prefill }

const MIN_CHARS = 2
const DEBOUNCE_MS = 500
/** Se il dataset incluso trova già almeno questi generici, USDA live non serve. */
const DATASET_ENOUGH = 5

const keyOf = (i: FoodItem) => normalize(`${i.name}|${i.brand ?? ''}`)
const toItems = (results: FoodResult[]) => results.map(resultToItem)

export function SearchTab({ myFoods, recentItems, onSelect, onNotFound }: Props) {
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

  const query = q.trim()
  const active = query.length >= MIN_CHARS
  const savedIds = new Set(myFoods.map((f) => f.id))
  const savedKeys = new Set(myFoods.map((f) => keyOf(foodToItem(f))))
  const isSaved = (item: FoodItem) => savedIds.has(foodKey(item)) || savedKeys.has(keyOf(item))

  // (a) I miei alimenti: ricerca sul dispositivo (Fuse.js), ordinati per uso recente e frequente.
  const searchMine = useMemo(() => createMyFoodsSearch(myFoods), [myFoods])
  const mineFoods = active ? searchMine(query) : []
  const mineIds = new Set(mineFoods.map((f) => f.id))
  // Voci di diario registrate prima dei "miei alimenti" e non ancora salvate.
  const olderRecents = active
    ? recentItems.filter((i) => !isSaved(i) && matches(`${i.name} ${i.brand ?? ''}`, query)).slice(0, Math.max(0, 8 - mineFoods.length))
    : []
  const local = [...mineFoods.map(foodToItem), ...olderRecents]

  // (b) Dataset generico incluso nell'app: istantaneo, anche offline e con le API giù.
  const dataset = active ? searchGenericDataset(query) : []

  const cancelPending = () => {
    clearTimeout(debounceRef.current)
    abortRef.current?.abort()
    abortRef.current = null
  }

  const startController = () => {
    cancelPending()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    return ctrl
  }

  // (c) Fonti online in parallelo: USDA live (se il dataset non basta) e Open Food Facts.
  const runSearch = (raw: string) => {
    const text = raw.trim()
    if (text.length < MIN_CHARS) return
    const ctrl = startController()
    setRemote({ status: 'loading', query: text })
    const includeUsda = searchGenericDataset(text).length < DATASET_ENOUGH
    searchOnline(text, { signal: ctrl.signal, includeUsda })
      .then((outcome) => setRemote({ status: 'done', query: text, outcome }))
      .catch((error: unknown) => {
        if (!isAbortError(error)) {
          setRemote({ status: 'error', error, retry: () => runSearch(text), prefill: { barcode: null, name: text } })
        }
      })
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

  /** Prodotto già salvato: niente Open Food Facts, la scansione aggiorna solo lastUsedAt e useCount. */
  const pickSaved = (food: Food) => {
    setRemote({ status: 'idle' })
    const item = foodToItem(food)
    recordFoodUse(uid, item, { origin: 'scan', countUse: true }).done.catch(reportError)
    onSelect({ ...item, fromScan: true })
  }

  const lookupBarcode = async (raw: string) => {
    setScanning(false)
    const code = cleanBarcode(raw) ?? raw.replace(/\D/g, '')
    const mine = myFoods.find((f) => f.id === code || f.barcode === code)
    if (mine) return pickSaved(mine)
    const ctrl = startController()
    setRemote({ status: 'barcode', label: `Cerco il codice ${code}…` })
    // Copia locale/Firestore prima di Open Food Facts (anche se la lista non è ancora caricata).
    const saved = await findSavedFood(uid, code)
    if (ctrl.signal.aborted) return
    if (saved) return pickSaved(saved)
    if (!navigator.onLine) return setRemote({ status: 'offlineScan', code })
    getProductByBarcode(code, ctrl.signal)
      .then((result) => {
        setRemote({ status: 'idle' })
        if (result) {
          // Ogni prodotto scansionato viene salvato tra i miei alimenti (id = codice a barre).
          const item = resultToItem(result)
          const { id, done } = recordFoodUse(uid, item, { origin: 'scan', countUse: true })
          done.catch(reportError)
          onSelect({ ...item, foodId: id, fromScan: true })
        } else {
          notify('Prodotto non trovato su Open Food Facts (o senza valori nutrizionali completi): inseriscilo a mano.')
          onNotFound({ barcode: code, name: '' })
        }
      })
      .catch((error: unknown) => {
        if (isAbortError(error)) return
        if (!navigator.onLine) return setRemote({ status: 'offlineScan', code })
        setRemote({
          status: 'error',
          error: new Error(
            'Open Food Facts non risponde in questo momento, quindi non posso leggere il codice a barre. ' +
              'Riprova tra poco, salvalo per dopo oppure inserisci l’alimento a mano.',
            { cause: error },
          ),
          retry: () => void lookupBarcode(code),
          prefill: { barcode: code, name: '' },
        })
      })
  }

  const saveForLater = (code: string) => {
    queuePendingScan(uid, code).catch(reportError)
    setRemote({ status: 'idle' })
    notify(`Codice ${code} salvato: completerò il prodotto appena torni online.`)
  }

  const saveToMine = (item: FoodItem) => {
    recordFoodUse(uid, item, { origin: 'search', countUse: false, favorite: true }).done.catch(reportError)
    notify(`${item.name} salvato tra i tuoi alimenti`)
  }

  // I risultati online valgono solo per la query mostrata (mentre si scrive restano quelli locali).
  const current = (remote.status === 'loading' || remote.status === 'done') && remote.query === query ? remote : null
  const outcome = current?.status === 'done' ? current.outcome : null
  const loading = active && (!current || current.status === 'loading') && remote.status !== 'error'

  const localKeys = new Set(local.map(keyOf))
  const notLocal = (items: FoodItem[]) => items.filter((i) => !localKeys.has(keyOf(i)) && !mineIds.has(foodKey(i)))
  // Generici: dataset + USDA live, tradotti, deduplicati e ordinati (prima gli alimenti semplici).
  const ranked = rankGenericResults(query, mergeGeneric(dataset, outcome?.usda ?? []))
  const genericItems = notLocal(toItems(ranked.main))
  const processedItems = notLocal(toItems(ranked.processed))
  const packagedItems = notLocal(toItems(outcome?.packaged ?? []))

  const everythingFailed = outcome != null && allSourcesFailed(local.length, dataset.length, outcome)
  const offline = outcome != null && [outcome.usdaError, outcome.packagedError].some((e) => e instanceof OfflineError)

  const star = (item: FoodItem) => {
    const food = item.foodId ? myFoods.find((f) => f.id === item.foodId) : undefined
    if (food) {
      return (
        <button
          type="button"
          aria-label={food.favorite ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
          aria-pressed={food.favorite}
          onClick={() => setFavorite(uid, food.id, !food.favorite).catch(reportError)}
          className="flex h-9 w-9 items-center justify-center text-amber-500"
        >
          <StarIcon filled={food.favorite} className="h-5 w-5" />
        </button>
      )
    }
    if (item.foodId) return null
    const saved = isSaved(item)
    return (
      <button
        type="button"
        disabled={saved}
        aria-label={saved ? 'Già tra i tuoi alimenti' : 'Salva tra i tuoi alimenti'}
        onClick={() => saveToMine(item)}
        className="flex h-9 w-9 items-center justify-center text-amber-500 disabled:opacity-100"
      >
        <StarIcon filled={saved} className="h-5 w-5" />
      </button>
    )
  }

  const retryButton = (label = 'Riprova') => (
    <button type="button" className="font-medium text-emerald-700 underline dark:text-emerald-400" onClick={() => runSearch(query)}>
      {label}
    </button>
  )

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
        <Button type="submit" disabled={!active}>
          Cerca
        </Button>
        <Button variant="secondary" size="icon" onClick={() => setScanning(true)} aria-label="Scansiona codice a barre">
          <BarcodeIcon className="h-5 w-5" />
        </Button>
      </form>

      {remote.status === 'barcode' && <LoadingBlock label={remote.label} />}

      {remote.status === 'offlineScan' && (
        <div className="space-y-2" role="alert">
          <ErrorNotice
            error={
              new Error(
                `Sei offline e il codice ${remote.code} non è tra i tuoi alimenti: per leggerne i dati serve Open Food Facts. ` +
                  'Salvalo per dopo: appena torni online completo il prodotto in automatico e ti avviso.',
              )
            }
            title="Codice non disponibile offline"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => saveForLater(remote.code)}>
              Salva per dopo
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onNotFound({ barcode: remote.code, name: '' })}>
              Inserisci a mano
            </Button>
          </div>
        </div>
      )}

      {remote.status === 'error' && (
        <div className="space-y-2">
          <ErrorNotice error={remote.error} title="Ricerca non riuscita" />
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={remote.retry}>
              Riprova
            </Button>
            {remote.prefill.barcode && (
              <Button size="sm" variant="secondary" onClick={() => saveForLater(remote.prefill.barcode!)}>
                Salva per dopo
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => onNotFound(remote.prefill)}>
              Inserisci a mano
            </Button>
          </div>
        </div>
      )}

      {active && everythingFailed && (
        <div className="space-y-2">
          <ErrorNotice error={offline ? new OfflineError() : new AllSourcesFailedError()} title="Ricerca non riuscita" />
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => runSearch(query)}>
              Riprova
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onNotFound({ barcode: null, name: query })}>
              Inserisci a mano
            </Button>
          </div>
        </div>
      )}

      {active && !everythingFailed && remote.status !== 'error' && (
        <>
          {local.length > 0 && (
            <section aria-label="I miei alimenti">
              <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">I miei alimenti</h3>
              <ul>
                {local.map((item, i) => (
                  <FoodRow
                    key={`${item.foodId ?? keyOf(item)}-${i}`}
                    item={item}
                    title={foodLabel(item)}
                    showBrand={false}
                    pending={item.foodId ? myFoods.find((f) => f.id === item.foodId)?.pending : false}
                    onSelect={() => onSelect(item)}
                    actions={star(item)}
                  />
                ))}
              </ul>
            </section>
          )}
          <ResultSection
            title="Alimenti generici"
            items={genericItems}
            onSelect={onSelect}
            actions={star}
            pending={loading && genericItems.length === 0 && dataset.length < DATASET_ENOUGH}
            note={
              outcome?.usdaError && genericItems.length > 0 ? (
                <>USDA non risponde: mostro solo gli alimenti generici inclusi nell’app. {retryButton()}</>
              ) : null
            }
            empty={outcome && !loading ? 'Nessun alimento generico trovato.' : null}
          />
          {processedItems.length > 0 && (
            <details className="group -mt-2">
              <summary className="cursor-pointer list-none text-sm font-medium text-emerald-700 dark:text-emerald-400">
                <span className="group-open:hidden">Mostra anche prodotti trasformati ({processedItems.length})</span>
                <span className="hidden group-open:inline">Nascondi prodotti trasformati</span>
              </summary>
              <ul className="mt-1">
                {processedItems.map((item, i) => (
                  <FoodRow key={`${keyOf(item)}-${i}`} item={item} onSelect={() => onSelect(item)} actions={star(item)} />
                ))}
              </ul>
            </details>
          )}
          <ResultSection
            title="Prodotti confezionati"
            items={packagedItems}
            onSelect={onSelect}
            actions={star}
            pending={loading}
            note={
              outcome?.packagedError ? (
                <>
                  {outcome.packagedError instanceof OfflineError
                    ? 'Sei offline: prodotti confezionati non disponibili.'
                    : 'Prodotti confezionati non disponibili al momento (Open Food Facts non risponde).'}{' '}
                  {retryButton()}
                </>
              ) : null
            }
            empty={outcome && !loading && !outcome.packagedError ? 'Nessun prodotto confezionato trovato.' : null}
          />
          {outcome && genericItems.length === 0 && processedItems.length === 0 && packagedItems.length === 0 && !outcome.packagedError && (
            <EmptyState icon="🔍" title={`Nessun risultato per “${query}”`}>
              <button type="button" className="font-medium text-emerald-600" onClick={() => onNotFound({ barcode: null, name: query })}>
                Inseriscilo a mano
              </button>
            </EmptyState>
          )}
        </>
      )}

      {!active && remote.status === 'idle' && (
        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          Scrivi almeno 2 lettere: cerco tra i tuoi alimenti, negli alimenti generici (frutta, verdura, carne, pesce…) e
          nei prodotti confezionati. Oppure scansiona il codice a barre.
        </p>
      )}

      {scanning && <BarcodeScanner onDetected={lookupBarcode} onClose={() => setScanning(false)} />}
    </div>
  )
}

interface SectionProps {
  title: string
  items: FoodItem[]
  onSelect: (item: FoodItem) => void
  actions: (item: FoodItem) => ReactNode
  pending: boolean
  note: ReactNode
  empty: string | null
}

function ResultSection({ title, items, onSelect, actions, pending, note, empty }: SectionProps) {
  if (items.length === 0 && !pending && !note && !empty) return null
  return (
    <section aria-label={title}>
      <h3 className="flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
        {title}
        {pending && <Spinner className="h-3.5 w-3.5" />}
      </h3>
      {items.length > 0 && (
        <ul>
          {items.map((item, i) => (
            <FoodRow key={`${keyOf(item)}-${i}`} item={item} onSelect={() => onSelect(item)} actions={actions(item)} />
          ))}
        </ul>
      )}
      {note && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{note}</p>}
      {items.length === 0 && !pending && !note && empty && (
        <p className="py-2 text-sm text-slate-500 dark:text-slate-400">{empty}</p>
      )}
    </section>
  )
}
