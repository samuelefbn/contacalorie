import { useState, type ChangeEvent, type FormEvent } from 'react'
import type { FoodItem, Nutrients } from '../../types'
import { per100FromTotals, round } from '../../lib/nutrition'
import { parseNum } from '../../lib/format'
import { NumberField, Segmented, TextField, Toggle } from '../../components/ui/Fields'
import { Button } from '../../components/ui/Button'
import { validGrams } from '../../lib/format'

interface Props {
  initialName?: string
  barcode?: string | null
  submitLabel: string
  /** `favorite` = l'utente vuole metterlo tra i preferiti (aggiunto al diario viene comunque salvato tra i suoi alimenti). */
  onSubmit: (item: FoodItem, grams: number, favorite: boolean) => void
}

type Basis = 'per100' | 'total'

/** Inserimento manuale di un alimento (valori per 100 g oppure per la quantità consumata). */
export function ManualFoodForm({ initialName = '', barcode = null, submitLabel, onSubmit }: Props) {
  const [name, setName] = useState(initialName)
  const [brand, setBrand] = useState('')
  const [grams, setGrams] = useState('100')
  const [basis, setBasis] = useState<Basis>('per100')
  const [values, setValues] = useState({ kcal: '', protein: '', carbs: '', fat: '' })
  const [favorite, setFavorite] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (k: keyof typeof values) => (e: ChangeEvent<HTMLInputElement>) =>
    setValues((v) => ({ ...v, [k]: e.target.value }))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const g = validGrams(grams)
    const parsed = {
      kcal: parseNum(values.kcal),
      // I macro sono facoltativi: vuoto = 0.
      protein: values.protein.trim() ? parseNum(values.protein) : 0,
      carbs: values.carbs.trim() ? parseNum(values.carbs) : 0,
      fat: values.fat.trim() ? parseNum(values.fat) : 0,
    }
    if (!name.trim()) return setError('Inserisci il nome dell’alimento.')
    if (g == null) return setError('Inserisci una quantità valida in grammi.')
    if (Object.values(parsed).some((n) => !Number.isFinite(n) || n < 0)) return setError('Controlla i valori nutrizionali.')

    const per100: Nutrients =
      basis === 'per100'
        ? { kcal: round(parsed.kcal), protein: round(parsed.protein, 1), carbs: round(parsed.carbs, 1), fat: round(parsed.fat, 1) }
        : per100FromTotals(parsed, g)
    if (per100.kcal > 1000) return setError('Valori non plausibili: oltre 1000 kcal per 100 g.')

    setError(null)
    onSubmit(
      {
        name: name.trim(),
        brand: brand.trim() || null,
        barcode,
        per100,
        defaultGrams: g,
        source: 'manual',
        foodId: null,
      },
      g,
      favorite,
    )
  }

  const unit = basis === 'per100' ? 'per 100 g' : 'totali'
  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <TextField label="Nome" value={name} onChange={(e) => setName(e.target.value)} maxLength={200} required />
      <TextField label="Marca (facoltativa)" value={brand} onChange={(e) => setBrand(e.target.value)} maxLength={200} />
      <NumberField label="Quantità" suffix="g" value={grams} onChange={(e) => setGrams(e.target.value)} />
      <Segmented<Basis>
        label="Riferimento dei valori"
        value={basis}
        onChange={setBasis}
        options={[
          { value: 'per100', label: 'Valori per 100 g' },
          { value: 'total', label: 'Valori della quantità' },
        ]}
      />
      <div className="grid grid-cols-2 gap-3">
        <NumberField label={`Calorie ${unit}`} suffix="kcal" value={values.kcal} onChange={set('kcal')} />
        <NumberField label="Proteine" suffix="g" value={values.protein} onChange={set('protein')} />
        <NumberField label="Carboidrati" suffix="g" value={values.carbs} onChange={set('carbs')} />
        <NumberField label="Grassi" suffix="g" value={values.fat} onChange={set('fat')} />
      </div>
      {barcode && <p className="text-xs text-slate-500">Codice a barre: {barcode}</p>}
      <Toggle label="Aggiungi ai preferiti" checked={favorite} onChange={setFavorite} />
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      <Button type="submit" className="w-full">
        {submitLabel}
      </Button>
    </form>
  )
}
