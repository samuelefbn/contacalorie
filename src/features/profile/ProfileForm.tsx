import { useState } from 'react'
import type { ActivityLevel, Goal, Profile, Sex } from '../../types'
import { useUid } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { saveProfile } from '../../services/profile'
import { ACTIVITY_LEVELS, GOALS, bmr, defaultMacros, kcalFromMacros, recommendedKcal, tdee } from '../../lib/nutrition'
import { fmtInt, numToInput, parseNum } from '../../lib/format'
import { Card, SectionTitle } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { NumberField, Segmented, SelectField, Toggle } from '../../components/ui/Fields'

interface Props {
  profile: Profile
  isNew: boolean
  displayName: string | null
}

const inRange = (n: number, min: number, max: number) => Number.isFinite(n) && n >= min && n <= max

export function ProfileForm({ profile, isNew, displayName }: Props) {
  const uid = useUid()
  const { notify, reportError } = useToast()
  const [sex, setSex] = useState<Sex>(profile.sex)
  const [age, setAge] = useState(numToInput(profile.age))
  const [height, setHeight] = useState(numToInput(profile.heightCm))
  const [weight, setWeight] = useState(numToInput(profile.weightKg))
  const [activity, setActivity] = useState<ActivityLevel>(profile.activityLevel)
  const [goal, setGoal] = useState<Goal>(profile.goal)
  const [kcalManual, setKcalManual] = useState(profile.kcalManual)
  const [kcalInput, setKcalInput] = useState(numToInput(profile.kcalTarget))
  const [macros, setMacros] = useState({
    protein: numToInput(profile.proteinTarget),
    carbs: numToInput(profile.carbsTarget),
    fat: numToInput(profile.fatTarget),
  })
  const [error, setError] = useState<string | null>(null)

  const body = { sex, age: parseNum(age), heightCm: parseNum(height), weightKg: parseNum(weight) }
  const bodyValid = inRange(body.age, 10, 120) && inRange(body.heightCm, 50, 260) && inRange(body.weightKg, 20, 400)
  const recommended = bodyValid ? recommendedKcal({ ...body, activityLevel: activity, goal }) : null
  const kcalTarget = kcalManual ? parseNum(kcalInput) : recommended

  const m = { protein: parseNum(macros.protein), carbs: parseNum(macros.carbs), fat: parseNum(macros.fat) }
  const macroKcal = kcalFromMacros(m.protein || 0, m.carbs || 0, m.fat || 0)
  const pct = (g: number, perG: number) => (kcalTarget && g ? `${Math.round(((g * perG) / kcalTarget) * 100)}%` : '–')

  const autoMacros = () => {
    if (!kcalTarget || !bodyValid) return
    const d = defaultMacros(kcalTarget, body.weightKg, goal)
    setMacros({ protein: String(d.proteinTarget), carbs: String(d.carbsTarget), fat: String(d.fatTarget) })
  }

  const save = () => {
    if (!bodyValid) return setError('Controlla età (10–120), altezza (50–260 cm) e peso (20–400 kg).')
    if (kcalTarget == null || !inRange(kcalTarget, 500, 10000)) return setError('L’obiettivo calorico deve essere tra 500 e 10.000 kcal.')
    if (!inRange(m.protein, 0, 1000) || !inRange(m.carbs, 0, 2000) || !inRange(m.fat, 0, 1000))
      return setError('Controlla i target dei macronutrienti.')
    setError(null)
    saveProfile(uid, {
      displayName,
      ...body,
      activityLevel: activity,
      goal,
      kcalTarget: Math.round(kcalTarget),
      kcalManual,
      proteinTarget: Math.round(m.protein),
      carbsTarget: Math.round(m.carbs),
      fatTarget: Math.round(m.fat),
    }).catch(reportError)
    notify('Profilo salvato')
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-4">
        <SectionTitle>I tuoi dati</SectionTitle>
        <Segmented<Sex>
          label="Sesso"
          value={sex}
          onChange={setSex}
          options={[
            { value: 'male', label: 'Uomo' },
            { value: 'female', label: 'Donna' },
          ]}
        />
        <div className="grid grid-cols-3 gap-3">
          <NumberField label="Età" suffix="anni" value={age} onChange={(e) => setAge(e.target.value)} inputMode="numeric" />
          <NumberField label="Altezza" suffix="cm" value={height} onChange={(e) => setHeight(e.target.value)} />
          <NumberField label="Peso" suffix="kg" value={weight} onChange={(e) => setWeight(e.target.value)} />
        </div>
        <SelectField
          label="Livello di attività"
          value={activity}
          onChange={(e) => setActivity(e.target.value as ActivityLevel)}
          hint={ACTIVITY_LEVELS.find((a) => a.value === activity)?.hint}
        >
          {ACTIVITY_LEVELS.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </SelectField>
        <div>
          <p className="mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">Obiettivo</p>
          <Segmented<Goal> label="Obiettivo" value={goal} onChange={setGoal} options={GOALS.map((g) => ({ value: g.value, label: g.label }))} />
        </div>
      </Card>

      <Card className="space-y-3">
        <SectionTitle>Fabbisogno calorico</SectionTitle>
        {bodyValid ? (
          <dl className="grid grid-cols-3 gap-2 text-center">
            <Metric label="Metabolismo basale" value={fmtInt(bmr(body))} />
            <Metric label="Fabbisogno totale" value={fmtInt(tdee({ ...body, activityLevel: activity }))} />
            <Metric label="Consigliato" value={fmtInt(recommended ?? 0)} highlight />
          </dl>
        ) : (
          <p className="text-sm text-slate-500">Inserisci dati validi per calcolare il fabbisogno.</p>
        )}
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Formula di Mifflin-St Jeor × fattore di attività, con −500 kcal per dimagrire e +300 kcal per aumentare. È una stima:
          per esigenze specifiche consulta un professionista.
        </p>
        <Toggle label="Imposta l’obiettivo a mano" checked={kcalManual} onChange={setKcalManual} />
        {kcalManual && (
          <NumberField label="Obiettivo giornaliero" suffix="kcal" value={kcalInput} onChange={(e) => setKcalInput(e.target.value)} />
        )}
      </Card>

      <Card className="space-y-3">
        <SectionTitle
          action={
            <Button size="sm" variant="secondary" onClick={autoMacros} disabled={!kcalTarget || !bodyValid}>
              Calcola
            </Button>
          }
        >
          Target macronutrienti
        </SectionTitle>
        <div className="grid grid-cols-3 gap-3">
          <NumberField label="Proteine" suffix="g" value={macros.protein} onChange={(e) => setMacros((s) => ({ ...s, protein: e.target.value }))} hint={pct(m.protein, 4)} />
          <NumberField label="Carboidrati" suffix="g" value={macros.carbs} onChange={(e) => setMacros((s) => ({ ...s, carbs: e.target.value }))} hint={pct(m.carbs, 4)} />
          <NumberField label="Grassi" suffix="g" value={macros.fat} onChange={(e) => setMacros((s) => ({ ...s, fat: e.target.value }))} hint={pct(m.fat, 9)} />
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          I macro valgono {fmtInt(macroKcal)} kcal
          {kcalTarget ? ` su un obiettivo di ${fmtInt(kcalTarget)} kcal` : ''}. “Calcola” usa proteine in g/kg di peso, grassi al 25% e
          carboidrati per il resto.
        </p>
      </Card>

      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      <Button className="w-full" onClick={save}>
        {isNew ? 'Crea profilo' : 'Salva profilo'}
      </Button>
    </div>
  )
}

function Metric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex flex-col-reverse rounded-xl bg-slate-50 p-2 dark:bg-slate-950">
      <dt className="text-[11px] text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className={`text-lg font-bold tabular-nums ${highlight ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>{value}</dd>
    </div>
  )
}
