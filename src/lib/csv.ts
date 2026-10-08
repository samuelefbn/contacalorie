export type CsvCell = string | number | null | undefined

// Formato pensato per Excel/Numbers in italiano: separatore ";" e virgola decimale.
const SEP = ';'

function formatCell(v: CsvCell): string {
  if (v == null) return ''
  let s = typeof v === 'number' ? String(v).replace('.', ',') : v
  // Evita la "CSV injection": un testo che inizia con =, +, -, @ verrebbe interpretato come formula.
  if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(header: string[], rows: CsvCell[][]): string {
  return [header, ...rows].map((r) => r.map(formatCell).join(SEP)).join('\r\n')
}

export function downloadCsv(filename: string, csv: string) {
  // Il BOM fa riconoscere a Excel la codifica UTF-8 (accenti corretti).
  downloadBlob(filename, new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' }))
}

export function downloadJson(filename: string, data: unknown) {
  downloadBlob(filename, new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
