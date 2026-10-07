import { useState } from 'react'
import type { Food } from '../../types'
import { useUid } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { useFoods } from '../../hooks/data'
import { foodToItem, setFavorite } from '../../services/foods'
import { matches } from '../../lib/text'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Segmented } from '../../components/ui/Fields'
import { EmptyState, ErrorNotice } from '../../components/ui/Feedback'
import { StarIcon } from '../../components/ui/Icons'
import { LoadingBlock } from '../../components/ui/Spinner'
import { FoodRow } from '../picker/FoodRow'
import { FoodEditor } from './FoodEditor'
import { RecipeEditor } from './RecipeEditor'

type Filter = 'all' | 'favorites' | 'recipes'
type Editing = { kind: 'food' | 'recipe'; food?: Food } | null

export function FoodsPage() {
  const uid = useUid()
  const { reportError } = useToast()
  const foods = useFoods(uid)
  const [filter, setFilter] = useState<Filter>('all')
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<Editing>(null)

  const list = foods.data.filter(
    (f) =>
      (filter === 'all' || (filter === 'favorites' ? f.favorite : f.kind === 'recipe')) &&
      (!q.trim() || matches(`${f.name} ${f.brand ?? ''}`, q)),
  )

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button className="flex-1" onClick={() => setEditing({ kind: 'food' })}>
          + Alimento
        </Button>
        <Button className="flex-1" variant="secondary" onClick={() => setEditing({ kind: 'recipe' })}>
          + Ricetta
        </Button>
      </div>

      <Card className="space-y-3">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filtra i tuoi alimenti…"
          aria-label="Filtra i tuoi alimenti"
          className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 focus:outline-none dark:border-slate-700 dark:bg-slate-950"
        />
        <Segmented<Filter>
          label="Filtro"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'Tutti' },
            { value: 'favorites', label: 'Preferiti' },
            { value: 'recipes', label: 'Ricette' },
          ]}
        />

        {foods.loading ? (
          <LoadingBlock />
        ) : foods.error ? (
          <ErrorNotice error={foods.error} />
        ) : list.length === 0 ? (
          <EmptyState icon="🥗" title={foods.data.length === 0 ? 'Nessun alimento personale' : 'Nessun risultato'}>
            {foods.data.length === 0 &&
              'Crea alimenti e ricette ricorrenti, o salva con la stella quelli trovati nella ricerca: li riaggiungi al diario con un tap.'}
          </EmptyState>
        ) : (
          <ul>
            {list.map((f) => (
              <FoodRow
                key={f.id}
                item={foodToItem(f)}
                onSelect={() => setEditing({ kind: f.kind, food: f })}
                actions={
                  <button
                    type="button"
                    aria-label={f.favorite ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
                    aria-pressed={f.favorite}
                    onClick={() => setFavorite(uid, f.id, !f.favorite).catch(reportError)}
                    className="flex h-9 w-9 items-center justify-center text-amber-500"
                  >
                    <StarIcon filled={f.favorite} className="h-5 w-5" />
                  </button>
                }
              />
            ))}
          </ul>
        )}
      </Card>

      {editing?.kind === 'food' && <FoodEditor food={editing.food} onClose={() => setEditing(null)} />}
      {editing?.kind === 'recipe' && <RecipeEditor recipe={editing.food} onClose={() => setEditing(null)} />}
    </div>
  )
}
