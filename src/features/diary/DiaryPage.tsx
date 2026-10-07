import { useMemo, useState } from 'react'
import type { Entry, MealType, Profile } from '../../types'
import { useUid } from '../../contexts/AuthContext'
import { useDayEntries } from '../../hooks/data'
import { MEALS, sumNutrients } from '../../lib/nutrition'
import { formatShortDate } from '../../lib/dates'
import { DEFAULT_PROFILE } from '../../services/mappers'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { ErrorNotice } from '../../components/ui/Feedback'
import { LoadingBlock } from '../../components/ui/Spinner'
import { RecipeEditor } from '../foods/RecipeEditor'
import { AddFoodSheet } from './AddFoodSheet'
import { DayNavigator } from './DayNavigator'
import { DaySummary } from './DaySummary'
import { EntryEditor } from './EntryEditor'
import { MealSection } from './MealSection'

interface Props {
  date: string
  onDateChange: (d: string) => void
  profile: Profile | null
  onOpenProfile: () => void
}

/** Ora del giorno → pasto proposto di default quando si aggiunge dal pulsante principale. */
function mealForNow(): MealType {
  const h = new Date().getHours()
  if (h < 11) return 'breakfast'
  if (h < 15) return 'lunch'
  if (h >= 18 && h < 23) return 'dinner'
  return 'snack'
}

export function DiaryPage({ date, onDateChange, profile, onOpenProfile }: Props) {
  const uid = useUid()
  const { data: entries, loading, error } = useDayEntries(uid, date)
  const [adding, setAdding] = useState<MealType | null>(null)
  const [editing, setEditing] = useState<Entry | null>(null)
  const [recipeFrom, setRecipeFrom] = useState<{ name: string; entries: Entry[] } | null>(null)

  const totals = useMemo(() => sumNutrients(entries), [entries])
  const targets = profile ?? DEFAULT_PROFILE

  return (
    <div className="space-y-4">
      <DayNavigator date={date} onChange={onDateChange} />

      {!profile && (
        <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40">
          <p className="font-medium">Benvenuto! 👋</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Completa il profilo per calcolare il tuo fabbisogno calorico. Nel frattempo usiamo un obiettivo di 2000 kcal.
          </p>
          <Button size="sm" className="mt-3" onClick={onOpenProfile}>
            Completa il profilo
          </Button>
        </Card>
      )}

      {error ? (
        <ErrorNotice error={error} />
      ) : loading ? (
        <LoadingBlock />
      ) : (
        <>
          <DaySummary totals={totals} targets={targets} />
          {MEALS.map((m) => (
            <MealSection
              key={m.type}
              label={m.label}
              icon={m.icon}
              entries={entries.filter((e) => e.mealType === m.type)}
              onAdd={() => setAdding(m.type)}
              onEdit={setEditing}
              onSaveRecipe={() =>
                setRecipeFrom({
                  name: `${m.label} del ${formatShortDate(date)}`,
                  entries: entries.filter((e) => e.mealType === m.type),
                })
              }
            />
          ))}
        </>
      )}

      <button
        type="button"
        onClick={() => setAdding(mealForNow())}
        aria-label="Aggiungi alimento"
        className="fixed right-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-3xl text-white shadow-lg hover:bg-emerald-700 sm:right-[calc(50%-20rem)]"
      >
        +
      </button>

      {adding && <AddFoodSheet date={date} initialMeal={adding} onClose={() => setAdding(null)} />}
      {editing && <EntryEditor entry={editing} onClose={() => setEditing(null)} />}
      {recipeFrom && (
        <RecipeEditor
          initialName={recipeFrom.name}
          initialIngredients={recipeFrom.entries.map((e) => ({ name: e.name, grams: e.grams, per100: e.per100 }))}
          onClose={() => setRecipeFrom(null)}
        />
      )}
    </div>
  )
}
