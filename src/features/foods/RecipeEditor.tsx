import { useState } from 'react'
import type { Food, FoodItem, RecipeIngredient } from '../../types'
import { useUid } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { deleteFood, saveFood } from '../../services/foods'
import { per100FromTotals, round, scaleNutrients, sumNutrients } from '../../lib/nutrition'
import { fmtDec, fmtInt, numToInput, parseNum, validGrams } from '../../lib/format'
import { Sheet } from '../../components/ui/Sheet'
import { Button } from '../../components/ui/Button'
import { NumberField, TextField, Toggle } from '../../components/ui/Fields'
import { EmptyState } from '../../components/ui/Feedback'
import { FoodPicker } from '../picker/FoodPicker'
import { PortionForm } from '../picker/PortionForm'

interface Props {
  recipe?: Food
  /** Ingredienti iniziali, es. da "Salva il pasto come ricetta". */
  initialIngredients?: RecipeIngredient[]
  initialName?: string
  onClose: () => void
}

/** Per una ricetta esistente ricava peso finale e porzioni dai valori salvati. */
function initialWeights(recipe?: Food): { finalWeight: string; servings: string } {
  if (!recipe) return { finalWeight: '', servings: '1' }
  const raw = recipe.ingredients.reduce((s, i) => s + i.grams, 0)
  const kcal = sumNutrients(recipe.ingredients.map((i) => scaleNutrients(i.per100, i.grams))).kcal
  const weight = recipe.per100.kcal > 0 ? round((kcal * 100) / recipe.per100.kcal) : raw
  const finalWeight = Math.abs(weight - raw) > 1 ? numToInput(weight) : ''
  const servings = recipe.defaultGrams > 0 ? Math.max(1, Math.round(weight / recipe.defaultGrams)) : 1
  return { finalWeight, servings: String(servings) }
}

/**
 * Ricetta = elenco di ingredienti. I valori per 100 g si calcolano sul peso finale
 * (che può differire dalla somma degli ingredienti, es. pasta cotta).
 */
export function RecipeEditor({ recipe, initialIngredients = [], initialName = '', onClose }: Props) {
  const uid = useUid()
  const { reportError } = useToast()
  const [name, setName] = useState(recipe?.name ?? initialName)
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>(recipe?.ingredients ?? initialIngredients)
  const [initial] = useState(() => initialWeights(recipe))
  const [finalWeight, setFinalWeight] = useState(initial.finalWeight)
  const [servings, setServings] = useState(initial.servings)
  const [favorite, setFavorite] = useState(recipe?.favorite ?? true)
  const [picking, setPicking] = useState(false)
  const [selected, setSelected] = useState<FoodItem | null>(null)
  const [grams, setGrams] = useState('')
  const [error, setError] = useState<string | null>(null)

  const totals = sumNutrients(ingredients.map((i) => scaleNutrients(i.per100, i.grams)))
  const rawWeight = ingredients.reduce((s, i) => s + i.grams, 0)
  const fw = parseNum(finalWeight)
  const weight = Number.isFinite(fw) && fw > 0 ? fw : rawWeight
  const per100 = per100FromTotals(totals, weight)
  const nServ = Math.max(1, Math.round(parseNum(servings) || 1))
  const portion = round(weight / nServ)

  const addIngredient = (item: FoodItem, g: number) => {
    setIngredients((list) => [...list, { name: item.name, grams: g, per100: item.per100 }])
    setSelected(null)
    setPicking(false)
  }

  const save = () => {
    if (!name.trim()) return setError('Dai un nome alla ricetta.')
    if (ingredients.length === 0 || weight <= 0) return setError('Aggiungi almeno un ingrediente.')
    if (per100.kcal > 1000) return setError('Valori non plausibili: controlla il peso finale.')
    saveFood(
      uid,
      { name: name.trim(), brand: null, barcode: null, per100, defaultGrams: portion, favorite, kind: 'recipe', ingredients },
      recipe?.id,
    ).done.catch(reportError)
    onClose()
  }

  const remove = () => {
    if (!recipe || !confirm(`Eliminare la ricetta “${recipe.name}”?`)) return
    deleteFood(uid, recipe.id).catch(reportError)
    onClose()
  }

  return (
    <Sheet
      title={recipe ? 'Modifica ricetta' : 'Nuova ricetta'}
      onClose={onClose}
      tall
      footer={
        <div className="flex gap-2">
          {recipe && (
            <Button variant="danger" onClick={remove}>
              Elimina
            </Button>
          )}
          <Button className="flex-1" onClick={save}>
            Salva ricetta
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <TextField label="Nome della ricetta" value={name} onChange={(e) => setName(e.target.value)} maxLength={200} />

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium">Ingredienti</p>
            <Button size="sm" variant="secondary" onClick={() => setPicking(true)}>
              + Ingrediente
            </Button>
          </div>
          {ingredients.length === 0 ? (
            <EmptyState icon="🥣" title="Nessun ingrediente" />
          ) : (
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
              {ingredients.map((ing, i) => (
                <li key={i} className="flex items-center gap-2 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{ing.name}</p>
                    <p className="text-xs text-slate-500">
                      {fmtInt(ing.grams)} g · {fmtInt(scaleNutrients(ing.per100, ing.grams).kcal)} kcal
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIngredients((list) => list.filter((_, j) => j !== i))}
                    aria-label={`Rimuovi ${ing.name}`}
                    className="h-8 w-8 rounded-full text-lg text-slate-400 hover:bg-slate-100 hover:text-red-600 dark:hover:bg-slate-800"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="Peso finale"
            suffix="g"
            placeholder={fmtInt(rawWeight)}
            value={finalWeight}
            onChange={(e) => setFinalWeight(e.target.value)}
            hint="Vuoto = somma ingredienti"
          />
          <NumberField label="Porzioni" value={servings} onChange={(e) => setServings(e.target.value)} hint={`1 porzione = ${fmtInt(portion)} g`} />
        </div>

        <div className="rounded-2xl bg-slate-50 p-3 text-sm dark:bg-slate-950">
          <p>
            Totale: <strong>{fmtInt(totals.kcal)} kcal</strong> · P {fmtDec(totals.protein)} · C {fmtDec(totals.carbs)} · G{' '}
            {fmtDec(totals.fat)}
          </p>
          <p className="text-slate-500 dark:text-slate-400">
            Per 100 g: {fmtInt(per100.kcal)} kcal · Per porzione: {fmtInt(scaleNutrients(per100, portion).kcal)} kcal
          </p>
        </div>

        <Toggle label="Preferita" checked={favorite} onChange={setFavorite} />
        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </div>

      {picking && !selected && (
        <Sheet title="Aggiungi ingrediente" onClose={() => setPicking(false)} tall>
          <FoodPicker
            onSelect={(item) => {
              setSelected(item)
              setGrams(String(item.defaultGrams))
            }}
            onDirect={addIngredient}
            manualSubmitLabel="Aggiungi ingrediente"
          />
        </Sheet>
      )}
      {selected && (
        <Sheet
          title="Quantità ingrediente"
          onClose={() => setSelected(null)}
          footer={
            <Button
              className="w-full"
              disabled={validGrams(grams) == null}
              onClick={() => {
                const g = validGrams(grams)
                if (g != null) addIngredient(selected, g)
              }}
            >
              Aggiungi ingrediente
            </Button>
          }
        >
          <PortionForm item={selected} grams={grams} onGramsChange={setGrams} />
        </Sheet>
      )}
    </Sheet>
  )
}
