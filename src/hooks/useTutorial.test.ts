// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TUTORIAL_VERSION, tutorialCacheKey, type TutorialState } from '../lib/tutorial'

const saveTutorialDone = vi.fn(() => Promise.resolve())
const notify = vi.fn()
const reportError = vi.fn()
let docState: { data: TutorialState | null; loading: boolean; error: Error | null; fromCache: boolean }

vi.mock('../services/tutorial', () => ({ saveTutorialDone: (...a: unknown[]) => saveTutorialDone(...(a as [])) }))
vi.mock('../contexts/ToastContext', () => ({ useToast: () => ({ notify, reportError }) }))
vi.mock('./data', () => ({ useTutorialState: () => docState }))

const { useTutorial, SKIP_HINT } = await import('./useTutorial')

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  docState = { data: null, loading: false, error: null, fromCache: false }
})
afterEach(cleanup)

describe('useTutorial', () => {
  it('nuovo utente: si apre da solo dopo l’onboarding', () => {
    const { result, rerender } = renderHook(({ blocked }) => useTutorial('alice', blocked), { initialProps: { blocked: true } })
    expect(result.current.open).toBe(false)
    rerender({ blocked: false })
    expect(result.current).toMatchObject({ open: true, mode: 'first' })
  })

  it('"Inizia": salva completed senza skipped, chiude e ricorda sul dispositivo', () => {
    const { result } = renderHook(() => useTutorial('alice', false))
    act(() => result.current.finish(true))
    expect(saveTutorialDone).toHaveBeenCalledWith('alice', false)
    expect(result.current.open).toBe(false)
    expect(localStorage.getItem(tutorialCacheKey('alice'))).toBe(String(TUTORIAL_VERSION))
    expect(notify).not.toHaveBeenCalled()
  })

  it('"Salta": salva skipped e mostra una volta il suggerimento', () => {
    const { result } = renderHook(() => useTutorial('alice', false))
    act(() => result.current.finish(false))
    expect(saveTutorialDone).toHaveBeenCalledWith('alice', true)
    expect(notify).toHaveBeenCalledTimes(1)
    expect(notify).toHaveBeenCalledWith(SKIP_HINT)
    expect(result.current.open).toBe(false)
  })

  it('errore di salvataggio: segnalato, la UI non resta bloccata', async () => {
    saveTutorialDone.mockReturnValueOnce(Promise.reject(new Error('offline')))
    const { result } = renderHook(() => useTutorial('alice', false))
    act(() => result.current.finish(true))
    expect(result.current.open).toBe(false)
    await vi.waitFor(() => expect(reportError).toHaveBeenCalled())
  })

  it('"Rivedi il tutorial": si riapre senza modificare lo stato salvato', () => {
    docState.data = { completed: true, completedAt: null, version: TUTORIAL_VERSION, skipped: false }
    const { result } = renderHook(() => useTutorial('alice', false))
    expect(result.current.open).toBe(false)
    act(() => result.current.replay())
    expect(result.current).toMatchObject({ open: true, mode: 'replay' })
    act(() => result.current.finish(false))
    expect(result.current.open).toBe(false)
    expect(saveTutorialDone).not.toHaveBeenCalled()
    expect(notify).not.toHaveBeenCalled()
  })

  it('errore di lettura: non compare', () => {
    docState.error = new Error('permesso negato')
    const { result } = renderHook(() => useTutorial('alice', false))
    expect(result.current.open).toBe(false)
  })

  it('cache locale "già visto": non compare nemmeno prima di Firestore', () => {
    localStorage.setItem(tutorialCacheKey('alice'), String(TUTORIAL_VERSION))
    docState = { data: null, loading: true, error: null, fromCache: true }
    const { result, rerender } = renderHook(() => useTutorial('alice', false))
    expect(result.current.open).toBe(false)
    docState = { data: null, loading: false, error: null, fromCache: false }
    rerender()
    expect(result.current.open).toBe(false)
  })

  it('completato su un altro dispositivo: lo ricorda in locale; cancella le cache di altri utenti', () => {
    localStorage.setItem(tutorialCacheKey('bob'), '1')
    docState.data = { completed: true, completedAt: null, version: TUTORIAL_VERSION, skipped: true }
    renderHook(() => useTutorial('alice', false))
    expect(localStorage.getItem(tutorialCacheKey('alice'))).toBe(String(TUTORIAL_VERSION))
    expect(localStorage.getItem(tutorialCacheKey('bob'))).toBeNull()
  })
})
