import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchJson, HttpError, NetworkError, TimeoutError } from './http'

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })

describe('fetchJson', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('ritenta 5xx e 429 con backoff esponenziale (max 2 retry)', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(new Response('', { status: 429 }))
      .mockResolvedValueOnce(json({ ok: true }))
    vi.stubGlobal('fetch', fetchMock)
    const p = fetchJson('https://x.test')
    await vi.advanceTimersByTimeAsync(499)
    expect(fetchMock).toHaveBeenCalledTimes(1) // primo retry dopo 500 ms
    await vi.advanceTimersByTimeAsync(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(1000) // secondo retry dopo 1000 ms
    await expect(p).resolves.toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('si arrende dopo 3 tentativi', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 503 }))
    vi.stubGlobal('fetch', fetchMock)
    const p = fetchJson('https://x.test')
    const assertion = expect(p).rejects.toBeInstanceOf(HttpError)
    await vi.runAllTimersAsync()
    await assertion
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('va in timeout dopo 8 secondi e ritenta', async () => {
    const hanging = (_url: string, init: RequestInit) =>
      new Promise<Response>((_, reject) => init.signal?.addEventListener('abort', () => reject(new DOMException('x', 'AbortError'))))
    const fetchMock = vi.fn().mockImplementationOnce(hanging).mockResolvedValueOnce(json([1]))
    vi.stubGlobal('fetch', fetchMock)
    const p = fetchJson('https://x.test')
    await vi.advanceTimersByTimeAsync(8000 + 500)
    await expect(p).resolves.toEqual([1])
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('timeout ripetuti diventano TimeoutError', async () => {
    const hanging = (_url: string, init: RequestInit) =>
      new Promise<Response>((_, reject) => init.signal?.addEventListener('abort', () => reject(new DOMException('x', 'AbortError'))))
    vi.stubGlobal('fetch', vi.fn().mockImplementation(hanging))
    const p = fetchJson('https://x.test', { retries: 0 })
    const assertion = expect(p).rejects.toBeInstanceOf(TimeoutError)
    await vi.advanceTimersByTimeAsync(8000)
    await assertion
  })

  it('non ritenta 4xx né errori di rete (salvo richiesta esplicita)', async () => {
    const notFound = vi.fn().mockResolvedValue(new Response('', { status: 400 }))
    vi.stubGlobal('fetch', notFound)
    await expect(fetchJson('https://x.test')).rejects.toBeInstanceOf(HttpError)
    expect(notFound).toHaveBeenCalledTimes(1)

    const network = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    vi.stubGlobal('fetch', network)
    await expect(fetchJson('https://x.test')).rejects.toBeInstanceOf(NetworkError)
    expect(network).toHaveBeenCalledTimes(1)

    network.mockClear()
    const p = fetchJson('https://x.test', { retryNetworkErrors: true })
    const assertion = expect(p).rejects.toBeInstanceOf(NetworkError)
    await vi.runAllTimersAsync()
    await assertion
    expect(network).toHaveBeenCalledTimes(3)
  })

  it('restituisce null sul 404 se richiesto', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 404 })))
    await expect(fetchJson('https://x.test', { allow404: true })).resolves.toBeNull()
  })

  it("l'annullamento interrompe subito, anche durante l'attesa del retry", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 503 }))
    vi.stubGlobal('fetch', fetchMock)
    const ctrl = new AbortController()
    const p = fetchJson('https://x.test', { signal: ctrl.signal })
    const assertion = expect(p).rejects.toMatchObject({ name: 'AbortError' })
    await vi.advanceTimersByTimeAsync(100)
    ctrl.abort()
    await assertion
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
