import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatShortDate } from '../../lib/dates'
import { fmtInt } from '../../lib/format'
import { axisProps, tooltipStyle } from './chartTheme'

export interface DayPoint {
  date: string
  kcal: number
}

/** Calorie per giorno con la linea dell'obiettivo; i giorni oltre l'obiettivo sono in ambra. */
export function CaloriesChart({ data, target }: { data: DayPoint[]; target: number }) {
  const dense = data.length > 10
  return (
    <div className="h-56" role="img" aria-label={`Grafico delle calorie degli ultimi ${data.length} giorni`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barCategoryGap={dense ? 2 : '25%'}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis dataKey="date" {...axisProps} tickFormatter={formatShortDate} minTickGap={16} />
          <YAxis {...axisProps} axisLine={false} width={44} tickFormatter={(v) => fmtInt(Number(v))} />
          <Tooltip
            cursor={{ fill: 'var(--chart-grid)', opacity: 0.5 }}
            contentStyle={tooltipStyle}
            labelFormatter={(d) => formatShortDate(String(d))}
            formatter={(v) => {
              const n = Number(v)
              return [`${fmtInt(n)} kcal${n > target ? ' (oltre obiettivo)' : ''}`, 'Calorie']
            }}
          />
          <ReferenceLine
            y={target}
            ifOverflow="extendDomain"
            stroke="var(--chart-target)"
            strokeDasharray="4 4"
            label={{ value: `Obiettivo ${fmtInt(target)}`, position: 'insideTopRight', fill: 'var(--chart-axis)', fontSize: 11 }}
          />
          <Bar dataKey="kcal" radius={[4, 4, 0, 0]} maxBarSize={36}>
            {data.map((d) => (
              <Cell key={d.date} fill={d.kcal > target ? 'var(--chart-over)' : 'var(--chart-bar)'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
