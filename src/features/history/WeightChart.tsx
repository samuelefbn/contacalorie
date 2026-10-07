import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { WeightEntry } from '../../types'
import { formatShortDate } from '../../lib/dates'
import { fmtDec } from '../../lib/format'
import { axisProps, tooltipStyle } from './chartTheme'

/** Asse Y a passo intero regolare, con un po' di margine sopra e sotto. */
function yTicks(data: WeightEntry[]): number[] {
  const kgs = data.map((d) => d.kg)
  const min = Math.floor(Math.min(...kgs) - 1)
  const max = Math.ceil(Math.max(...kgs) + 1)
  const step = Math.max(1, Math.ceil((max - min) / 5))
  const ticks: number[] = []
  for (let t = min; t < max + step; t += step) ticks.push(t)
  return ticks
}

export function WeightChart({ data }: { data: WeightEntry[] }) {
  const ticks = yTicks(data)
  return (
    <div className="h-52" role="img" aria-label="Grafico dell'andamento del peso">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis dataKey="date" {...axisProps} tickFormatter={formatShortDate} minTickGap={24} />
          <YAxis
            {...axisProps}
            axisLine={false}
            width={44}
            domain={[ticks[0], ticks[ticks.length - 1]]}
            ticks={ticks}
            tickFormatter={(v) => fmtDec(Number(v))}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            cursor={{ stroke: 'var(--chart-axis)', strokeDasharray: '3 3' }}
            labelFormatter={(d) => formatShortDate(String(d))}
            formatter={(v) => [`${fmtDec(Number(v))} kg`, 'Peso']}
          />
          <Line
            type="monotone"
            dataKey="kg"
            stroke="var(--chart-line)"
            strokeWidth={2}
            dot={data.length <= 31 ? { r: 4, strokeWidth: 2, stroke: 'var(--chart-surface)', fill: 'var(--chart-line)' } : false}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
