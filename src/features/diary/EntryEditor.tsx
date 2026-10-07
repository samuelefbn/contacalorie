import { useState } from 'react'
import type { Entry, MealType } from '../../types'
import { useUid } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { deleteEntry, entryToItem, restoreEntry, updateEntry } from '../../services/entries'
import { itemToFoodInput, saveFood } from '../../services/foods'
import { isValidDateKey } from '../../lib/dates'
import { Sheet } from '../../components/ui/Sheet'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/ui/Fields'
import { PortionForm } from '../picker/PortionForm'
import { validGrams } from '../../lib/format'
import { MealSelect } from './MealSelect'

interface Props {
  entry: Entry
  onClose: () => void
}

/** Modifica quantità, pasto o giorno di una voce; eliminazione con "Annulla". */
export function EntryEditor({ entry, onClose }: Props) {
  const uid = useUid()
  const { notify, reportError } = useToast()
  const [grams, setGrams] = useState(String(entry.grams))
  const [meal, setMeal] = useState<MealType>(entry.mealType)
  const [date, setDate] = useState(entry.date)
  const g = validGrams(grams)
  const valid = g != null && isValidDateKey(date)

  const save = () => {
    if (!valid) return
    updateEntry(uid, entry.id, { grams: g, mealType: meal, date, per100: entry.per100 }).catch(reportError)
    onClose()
  }

  const remove = () => {
    deleteEntry(uid, entry.id).catch(reportError)
    notify(`${entry.name} eliminato`, { label: 'Annulla', run: () => restoreEntry(uid, entry).catch(reportError) })
    onClose()
  }

  const saveAsFood = () => {
    saveFood(uid, itemToFoodInput({ ...entryToItem(entry), defaultGrams: g ?? entry.grams })).done.catch(reportError)
    notify(`${entry.name} salvato tra i tuoi alimenti`)
  }

  return (
    <Sheet
      title="Modifica voce"
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          <Button variant="danger" onClick={remove}>
            Elimina
          </Button>
          <Button className="flex-1" onClick={save} disabled={!valid}>
            Salva
          </Button>
        </div>
      }
    >
      <PortionForm item={entryToItem(entry)} grams={grams} onGramsChange={setGrams}>
        <MealSelect value={meal} onChange={setMeal} />
        <TextField label="Giorno" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        {!entry.foodId && (
          <Button variant="ghost" size="sm" onClick={saveAsFood}>
            ⭐ Salva tra i miei alimenti
          </Button>
        )}
      </PortionForm>
    </Sheet>
  )
}
