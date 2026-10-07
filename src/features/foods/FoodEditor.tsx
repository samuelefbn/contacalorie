import { useState, type ChangeEvent } from 'react'
import type { Food } from '../../types'
import { useUid } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { deleteFood, saveFood } from '../../services/foods'
import { numToInput, parseNum } from '../../lib/format'
import { round } from '../../lib/nutrition'
import { Sheet } from '../../components/ui/Sheet'
import { Button } from '../../components/ui/Button'
import { NumberField, TextField, Toggle } from '../../components/ui/Fields'

interface Props {
  food?: Food
  onClose: () => void
}

/** Creazione/modifica di un alimento personale (valori per 100 g). */
export function FoodEditor({ food, onClose }: Props) {
  const uid = useUid()
  const { reportError } = useToast()
  const [name, setName] = useState(food?.name ?? '')
  const [brand, setBrand] = useState(food?.brand ?? '')
  const [barcode, setBarcode] = useState(food?.barcode ?? '')
  const [portion, setPortion] = useState(numToInput(food?.defaultGrams ?? 100))
  const [favorite, setFavorite] = useState(food?.favorite ?? true)
  const [v, setV] = useState({
    kcal: numToInput(food?.per100.kcal),
    protein: numToInput(food?.per100.protein),
    carbs: numToInput(food?.per100.carbs),
    fat: numToInput(food?.per100.fat),
  })
  const [error, setError] = useState<string | null>(null)

  const save = () => {
    const n = {
      kcal: parseNum(v.kcal),
      protein: parseNum(v.protein || '0'),
      carbs: parseNum(v.carbs || '0'),
      fat: parseNum(v.fat || '0'),
    }
    const p = parseNum(portion)
    if (!name.trim()) return setError('Inserisci il nome.')
    if (Object.values(n).some((x) => !Number.isFinite(x) || x < 0) || n.kcal > 1000) return setError('Controlla i valori per 100 g.')
    if (!Number.isFinite(p) || p <= 0 || p > 10000) return setError('Porzione non valida.')
    saveFood(
      uid,
      {
        name: name.trim(),
        brand: brand.trim() || null,
        barcode: barcode.replace(/\D/g, '') || null,
        per100: { kcal: round(n.kcal), protein: round(n.protein, 1), carbs: round(n.carbs, 1), fat: round(n.fat, 1) },
        defaultGrams: round(p),
        favorite,
        kind: 'food',
        ingredients: [],
      },
      food?.id,
    ).done.catch(reportError)
    onClose()
  }

  const remove = () => {
    if (!food || !confirm(`Eliminare “${food.name}”? Le voci di diario già registrate non vengono toccate.`)) return
    deleteFood(uid, food.id).catch(reportError)
    onClose()
  }

  const set = (k: keyof typeof v) => (e: ChangeEvent<HTMLInputElement>) => setV((s) => ({ ...s, [k]: e.target.value }))

  return (
    <Sheet
      title={food ? 'Modifica alimento' : 'Nuovo alimento'}
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          {food && (
            <Button variant="danger" onClick={remove}>
              Elimina
            </Button>
          )}
          <Button className="flex-1" onClick={save}>
            Salva
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <TextField label="Nome" value={name} onChange={(e) => setName(e.target.value)} maxLength={200} />
        <TextField label="Marca (facoltativa)" value={brand} onChange={(e) => setBrand(e.target.value)} maxLength={200} />
        <p className="text-sm font-medium">Valori per 100 g</p>
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Calorie" suffix="kcal" value={v.kcal} onChange={set('kcal')} />
          <NumberField label="Proteine" suffix="g" value={v.protein} onChange={set('protein')} />
          <NumberField label="Carboidrati" suffix="g" value={v.carbs} onChange={set('carbs')} />
          <NumberField label="Grassi" suffix="g" value={v.fat} onChange={set('fat')} />
        </div>
        <NumberField label="Porzione abituale" suffix="g" value={portion} onChange={(e) => setPortion(e.target.value)} />
        <TextField label="Codice a barre (facoltativo)" inputMode="numeric" value={barcode} onChange={(e) => setBarcode(e.target.value)} />
        <Toggle label="Preferito" checked={favorite} onChange={setFavorite} />
        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </div>
    </Sheet>
  )
}
