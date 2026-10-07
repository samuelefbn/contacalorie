import type { MealType } from '../../types'
import { MEALS } from '../../lib/nutrition'
import { Segmented } from '../../components/ui/Fields'

export function MealSelect({ value, onChange }: { value: MealType; onChange: (m: MealType) => void }) {
  return (
    <Segmented<MealType>
      label="Pasto"
      value={value}
      onChange={onChange}
      options={MEALS.map((m) => ({ value: m.type, label: m.label }))}
    />
  )
}
