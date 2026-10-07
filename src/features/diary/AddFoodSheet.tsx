import { useState } from 'react'
import type { FoodItem, MealType } from '../../types'
import { useUid } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { addEntry } from '../../services/entries'
import { itemToFoodInput, saveFood } from '../../services/foods'
import { mealLabel } from '../../lib/nutrition'
import { fmtInt, validGrams } from '../../lib/format'
import { Sheet } from '../../components/ui/Sheet'
import { Button } from '../../components/ui/Button'
import { Toggle } from '../../components/ui/Fields'
import { FoodPicker } from '../picker/FoodPicker'
import { PortionForm } from '../picker/PortionForm'
import { MealSelect } from './MealSelect'

interface Props {
  date: string
  initialMeal: MealType
  onClose: () => void
}

/**
 * Aggiunta di alimenti al diario. Il pannello resta aperto dopo ogni aggiunta
 * per poter registrare più alimenti di fila.
 */
export function AddFoodSheet({ date, initialMeal, onClose }: Props) {
  const uid = useUid()
  const { notify, reportError } = useToast()
  const [meal, setMeal] = useState<MealType>(initialMeal)
  const [selected, setSelected] = useState<FoodItem | null>(null)
  const [grams, setGrams] = useState('')
  const [saveToMine, setSaveToMine] = useState(false)

  const add = (item: FoodItem, g: number) => {
    // Non si attende la Promise: offline si risolve solo alla sincronizzazione, ma il listener aggiorna subito la UI.
    addEntry(uid, date, meal, item, g).catch(reportError)
    notify(`${item.name} (${fmtInt(g)} g) aggiunto a ${mealLabel(meal).toLowerCase()}`)
  }

  const select = (item: FoodItem) => {
    setSelected(item)
    setGrams(String(item.defaultGrams))
    setSaveToMine(false)
  }

  const confirm = () => {
    const g = validGrams(grams)
    if (!selected || g == null) return
    let item = selected
    if (saveToMine && !item.foodId) {
      const { id, done } = saveFood(uid, itemToFoodInput({ ...item, defaultGrams: g }))
      done.catch(reportError)
      item = { ...item, foodId: id, source: 'custom' }
    }
    add(item, g)
    setSelected(null)
  }

  if (selected) {
    return (
      <Sheet
        title="Quantità"
        onClose={onClose}
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setSelected(null)}>
              Indietro
            </Button>
            <Button className="flex-1" onClick={confirm} disabled={validGrams(grams) == null}>
              Aggiungi a {mealLabel(meal).toLowerCase()}
            </Button>
          </div>
        }
      >
        <PortionForm item={selected} grams={grams} onGramsChange={setGrams}>
          <MealSelect value={meal} onChange={setMeal} />
          {!selected.foodId && <Toggle label="Salva tra i miei alimenti (preferiti)" checked={saveToMine} onChange={setSaveToMine} />}
        </PortionForm>
      </Sheet>
    )
  }

  return (
    <Sheet title={`Aggiungi a ${mealLabel(meal).toLowerCase()}`} onClose={onClose} tall>
      <div className="space-y-4">
        <MealSelect value={meal} onChange={setMeal} />
        <FoodPicker onSelect={select} onDirect={add} manualSubmitLabel="Aggiungi al diario" />
      </div>
    </Sheet>
  )
}
