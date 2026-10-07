/** Risposta HTTP non riuscita (status ≠ 2xx). */
export class HttpError extends Error {
  readonly status: number
  constructor(status: number) {
    super(`HTTP ${status}`)
    this.name = 'HttpError'
    this.status = status
  }
}

/** La richiesta ha superato il timeout. */
export class TimeoutError extends Error {
  constructor() {
    super('Timeout')
    this.name = 'TimeoutError'
  }
}

/** Errore di rete/CORS: il browser non espone lo status (es. un 503 senza intestazione CORS). */
export class NetworkError extends Error {
  constructor(cause: unknown) {
    super('Errore di rete', { cause })
    this.name = 'NetworkError'
  }
}

export interface FetchJsonOptions {
  signal?: AbortSignal
  /** Timeout di ogni singolo tentativo. */
  timeoutMs?: number
  /** Tentativi aggiuntivi dopo il primo. */
  retries?: number
  /** Attesa prima del primo retry; raddoppia a ogni tentativo. */
  baseDelayMs?: number
  /**
   * Ritenta anche gli errori di rete. Utile solo per servizi che rispondono 503 senza CORS
   * (il browser li vede come errore di rete); altrimenti un blocco CORS fallirebbe sempre.
   */
  retryNetworkErrors?: boolean
  /** Restituisce null invece di un errore per il 404 (es. prodotto inesistente). */
  allow404?: boolean
}

export const DEFAULT_TIMEOUT_MS = 8000
export const DEFAULT_RETRIES = 2
export const DEFAULT_BASE_DELAY_MS = 500

export const isAbortError = (err: unknown) => (err as Error | null)?.name === 'AbortError'

function abortReason(signal: AbortSignal): unknown {
  return signal.reason ?? new DOMException('Operazione annullata', 'AbortError')
}

export function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(abortReason(signal))
    const onAbort = () => {
      clearTimeout(t)
      reject(abortReason(signal!))
    }
    const t = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

async function attempt(url: string, signal: AbortSignal | undefined, timeoutMs: number, allow404: boolean) {
  const ctrl = new AbortController()
  const onAbort = () => ctrl.abort()
  signal?.addEventListener('abort', onAbort, { once: true })
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    ctrl.abort()
  }, timeoutMs)
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } })
    if (allow404 && res.status === 404) return null
    if (!res.ok) throw new HttpError(res.status)
    return (await res.json()) as unknown
  } catch (err) {
    if (signal?.aborted) throw abortReason(signal)
    if (timedOut) throw new TimeoutError()
    if (err instanceof HttpError || err instanceof SyntaxError) throw err
    throw new NetworkError(err)
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onAbort)
  }
}

function isRetryable(err: unknown, retryNetworkErrors: boolean): boolean {
  if (err instanceof TimeoutError) return true
  if (err instanceof HttpError) return err.status >= 500 || err.status === 429
  return retryNetworkErrors && err instanceof NetworkError
}

/** GET JSON con timeout per tentativo e retry con backoff esponenziale su 5xx, 429 e timeout. */
export async function fetchJson(url: string, opts: FetchJsonOptions = {}): Promise<unknown> {
  const {
    signal,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retries = DEFAULT_RETRIES,
    baseDelayMs = DEFAULT_BASE_DELAY_MS,
    retryNetworkErrors = false,
    allow404 = false,
  } = opts
  for (let i = 0; ; i++) {
    try {
      return await attempt(url, signal, timeoutMs, allow404)
    } catch (err) {
      if (isAbortError(err) || i >= retries || !isRetryable(err, retryNetworkErrors)) throw err
      await wait(baseDelayMs * 2 ** i, signal)
    }
  }
}
