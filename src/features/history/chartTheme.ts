import type { CSSProperties } from 'react'

export const axisProps = {
  stroke: 'var(--chart-grid)',
  tick: { fill: 'var(--chart-axis)', fontSize: 12 },
  tickLine: false,
} as const

export const tooltipStyle: CSSProperties = {
  background: 'var(--chart-surface)',
  border: '1px solid var(--chart-grid)',
  borderRadius: 12,
  color: 'var(--chart-text)',
  fontSize: 13,
}
