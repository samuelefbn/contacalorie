import { describe, expect, it, vi } from 'vitest'
import type { PendingScan } from '../types'
import type { FoodResult } from './foodSearch/types'
import { completePendingScans } from './pendingScanQueue'

const scan = (barcode: string, status: PendingScan['status'] = 'pending'): PendingScan => ({ barcode, status, createdAt: null, pending: false })
const product = (barcode: string): FoodResult => ({
  id: `off:${barcode}`,
  name: 'Biscotti',
  brand: 'Mulino',
  source: 'off',
  kind: 'packaged',
  kcal100: 450,
  protein100: 7,
  carbs100: 70,
  fat100: 15,
  servingGrams: 30,
  barcode,
  imageUrl: null,
  isPrimitive: false,
})

function deps(lookup: (code: string) => Promise<FoodResult | null>) {
  return { lookup: vi.fn(lookup), save: vi.fn(), markNotFound: vi.fn(), remove: vi.fn(), notify: vi.fn() }
}

describe('coda "da completare"', () => {
  it('completa i codici trovati: salva il prodotto, lo toglie dalla coda e avvisa', async () => {
    const d = deps(async (code) => product(code))
    const out = await completePendingScans([scan('80000001')], d)
    expect(out.completed).toEqual(['80000001'])
    expect(d.save).toHaveBeenCalledWith(expect.objectContaining({ barcode: '80000001' }))
    expect(d.remove).toHaveBeenCalledWith('80000001')
    expect(d.notify).toHaveBeenCalledWith('Prodotto completato: Biscotti - Mulino')
  })

  it('codice inesistente: resta in coda come "non trovato"', async () => {
    const d = deps(async () => null)
    const out = await completePendingScans([scan('80000002')], d)
    expect(out.notFound).toEqual(['80000002'])
    expect(d.markNotFound).toHaveBeenCalledWith('80000002')
    expect(d.remove).not.toHaveBeenCalled()
    expect(d.save).not.toHaveBeenCalled()
  })

  it('rete ancora assente: non cambia nulla, si riprova più tardi', async () => {
    const d = deps(async () => {
      throw new TypeError('Failed to fetch')
    })
    const out = await completePendingScans([scan('80000003')], d)
    expect(out.retryLater).toEqual(['80000003'])
    expect(d.save).not.toHaveBeenCalled()
    expect(d.remove).not.toHaveBeenCalled()
    expect(d.markNotFound).not.toHaveBeenCalled()
  })

  it('i codici già segnati come non trovati non vengono ritentati', async () => {
    const d = deps(async (code) => product(code))
    await completePendingScans([scan('80000004', 'not_found')], d)
    expect(d.lookup).not.toHaveBeenCalled()
  })
})
