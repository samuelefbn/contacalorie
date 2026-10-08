import { describe, expect, it } from 'vitest'
import { pendingInSnapshot, syncLabel, syncState } from './syncState'

describe('stato della sincronizzazione', () => {
  it('conta le scritture in attesa (eliminazioni comprese)', () => {
    expect(pendingInSnapshot(3, true)).toBe(3)
    expect(pendingInSnapshot(0, true)).toBe(1)
    expect(pendingInSnapshot(0, false)).toBe(0)
  })

  it('etichette dell’header', () => {
    expect(syncLabel(syncState(false, 0, false), 0)).toBe('Offline')
    expect(syncLabel(syncState(false, 2, false), 2)).toBe('Offline · 2 modifiche in attesa')
    expect(syncLabel(syncState(true, 1, false), 1)).toBe('Sincronizzazione in corso (1 modifica in attesa)')
    expect(syncLabel(syncState(true, 0, true), 0)).toBe('Tutto sincronizzato')
    expect(syncLabel(syncState(true, 0, false), 0)).toBe('Online')
  })
})
