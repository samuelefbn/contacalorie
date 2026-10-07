import { describe, expect, it } from 'vitest'
import { addDays, formatDayLabel, isValidDateKey, lastNDays, toDateKey } from './dates'

describe('date locali', () => {
  it('formatta senza conversione UTC', () => {
    expect(toDateKey(new Date(2024, 0, 5, 23, 59))).toBe('2024-01-05')
  })

  it('somma i giorni attraversando mesi e anni bisestili', () => {
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29')
    expect(addDays('2024-03-01', -1)).toBe('2024-02-29')
    expect(addDays('2023-12-31', 1)).toBe('2024-01-01')
  })

  it('genera gli ultimi N giorni', () => {
    expect(lastNDays('2024-01-02', 3)).toEqual(['2023-12-31', '2024-01-01', '2024-01-02'])
  })

  it('valida le chiavi', () => {
    expect(isValidDateKey('2024-02-29')).toBe(true)
    expect(isValidDateKey('2023-02-29')).toBe(false)
    expect(isValidDateKey('ieri')).toBe(false)
  })

  it('etichetta oggi/ieri/domani', () => {
    expect(formatDayLabel('2024-05-10', '2024-05-10')).toBe('Oggi')
    expect(formatDayLabel('2024-05-09', '2024-05-10')).toBe('Ieri')
    expect(formatDayLabel('2024-05-11', '2024-05-10')).toBe('Domani')
  })
})
