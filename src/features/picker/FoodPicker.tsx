import { useMemo, useState } from 'react'
import type { FoodItem } from '../../types'
import { useUid } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { useFoods, useRecentFoods } from '../../hooks/data'
import { foodToItem, itemToFoodInput, saveFood, setFavorite } from '../../services/foods'
import { Segmented } from '../../components/ui/Fields'
import { EmptyState, ErrorNotice } from '../../components/ui/Feedback'
import { LoadingBlock } from '../../components/ui/Spinner'
import { PlusIcon, StarIcon } from '../../components/ui/Icons'
import { FoodRow } from './FoodRow'
import { ManualFoodForm } from './ManualFoodForm'
import { SearchTab } from './SearchTab'

type PickerTab = 'cerca' | 'miei' | 'recenti' | 'manuale'

export interface FoodPickerProps {
  /** Alimento scelto: il chiamante mostra la scelta della quantità. */
  onSelect: (item: FoodItem) => void
  /** Aggiunta diretta con quantità già nota (tasto "+" o inserimento manuale). */
  onDirect: (item: FoodItem, grams: number) => void
  manualSubmitLabel: string
}

export function FoodPicker({ onSelect, onDirect, manualSubmitLabel }: FoodPickerProps) {
  const uid = useUid()
  const { reportError } = useToast()
  const [tab, setTab] = useState<PickerTab>('cerca')
  const [manualPrefill, setManualPrefill] = useState<{ barcode: string | null; name: string }>({ barcode: null, name: '' })
  const foods = useFoods(uid)
  const recents = useRecentFoods(uid)
  const myItems = useMemo(() => foods.data.map(foodToItem), [foods.data])

  const quickAdd = (item: FoodItem) => (
    <button
      type="button"
      onClick={() => onDirect(item, item.defaultGrams)}
      aria-label={`Aggiungi ${item.name} (${item.defaultGrams} g)`}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white hover:bg-emerald-700"
    >
      <PlusIcon className="h-5 w-5" />
    </button>
  )

  const goManual = (prefill: { barcode: string | null; name: string }) => {
    setManualPrefill(prefill)
    setTab('manuale')
  }

  return (
    <div className="space-y-4">
      <Segmented<PickerTab>
        label="Origine alimento"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'cerca', label: 'Cerca' },
          { value: 'miei', label: 'Miei' },
          { value: 'recenti', label: 'Recenti' },
          { value: 'manuale', label: 'Manuale' },
        ]}
      />

      {tab === 'cerca' && (
        <SearchTab
          localItems={[...myItems, ...recents.all]}
          myFoods={foods.data}
          onSelect={onSelect}
          onNotFound={goManual}
        />
      )}

      {tab === 'miei' &&
        (foods.loading ? (
          <LoadingBlock />
        ) : foods.error ? (
          <ErrorNotice error={foods.error} />
        ) : foods.data.length === 0 ? (
          <EmptyState icon="⭐" title="Nessun alimento salvato">
            Salva gli alimenti che usi spesso (stella nei risultati di ricerca) o crea ricette dalla sezione Alimenti.
          </EmptyState>
        ) : (
          <ul>
            {foods.data.map((f) => {
              const item = foodToItem(f)
              return (
                <FoodRow
                  key={f.id}
                  item={item}
                  onSelect={() => onSelect(item)}
                  actions={
                    <>
                      <button
                        type="button"
                        aria-label={f.favorite ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
                        aria-pressed={f.favorite}
                        onClick={() => setFavorite(uid, f.id, !f.favorite).catch(reportError)}
                        className="flex h-9 w-9 items-center justify-center text-amber-500"
                      >
                        <StarIcon filled={f.favorite} className="h-5 w-5" />
                      </button>
                      {quickAdd(item)}
                    </>
                  }
                />
              )
            })}
          </ul>
        ))}

      {tab === 'recenti' &&
        (recents.loading ? (
          <LoadingBlock />
        ) : recents.error ? (
          <ErrorNotice error={recents.error} />
        ) : recents.data.length === 0 ? (
          <EmptyState icon="🕒" title="Ancora nessun alimento recente">
            Qui troverai gli ultimi alimenti registrati, da riaggiungere con un tap.
          </EmptyState>
        ) : (
          <ul>
            {recents.data.map((item) => (
              <FoodRow
                key={`${item.name}|${item.brand}`}
                item={item}
                onSelect={() => onSelect(item)}
                actions={quickAdd(item)}
              />
            ))}
          </ul>
        ))}

      {tab === 'manuale' && (
        <ManualFoodForm
          key={`${manualPrefill.barcode}|${manualPrefill.name}`}
          initialName={manualPrefill.name}
          barcode={manualPrefill.barcode}
          submitLabel={manualSubmitLabel}
          onSubmit={(item, grams, save) => {
            if (save) {
              const { id, done } = saveFood(uid, itemToFoodInput(item, false))
              done.catch(reportError)
              onDirect({ ...item, foodId: id, source: 'custom' }, grams)
            } else {
              onDirect(item, grams)
            }
          }}
        />
      )}
    </div>
  )
}
