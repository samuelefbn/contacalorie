import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { WeightEntry } from '../../types'
import { formatShortDate } from '../../lib/dates'
import { fmtDec } from '../../lib/format'
import { axisProps, tooltipStyle } from './chartTheme'

export function WeightChart({ data }: { data: WeightEntry[] }) {
  return (
    <div className="h-52" role="img" aria-label="Grafico dell'andamento del peso">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis dataKey="date" {...axisProps} tickFormatter={formatShortDate} minTickGap={24} />
          <YAxis {...axisProps} axisLine={false} width={48} domain={['dataMin - 1', 'dataMax + 1']} tickFormatter={(v) => fmtDec(Number(v))} />
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
