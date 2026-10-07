import { describe, expect, it } from 'vitest'
import { toCsv } from './csv'

describe('toCsv', () => {
  it('usa ; e virgola decimale, con escape dei campi', () => {
    const csv = toCsv(['nome', 'kcal'], [['Pasta; integrale', 12.5], ['Yogurt "greco"', null]])
    expect(csv).toBe('nome;kcal\r\n"Pasta; integrale";12,5\r\n"Yogurt ""greco""";')
  })

  it('neutralizza le formule', () => {
    expect(toCsv(['x'], [['=SOMMA(A1)']])).toBe("x\r\n'=SOMMA(A1)")
  })
})
