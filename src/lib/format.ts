const intFmt = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0 })
const decFmt = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 })

export const fmtInt = (n: number) => intFmt.format(n)
export const fmtDec = (n: number) => decFmt.format(n)
export const fmtKcal = (n: number) => `${intFmt.format(n)} kcal`
export const fmtGrams = (n: number) => `${decFmt.format(n)} g`

/** Messaggio leggibile per errori Firebase / di rete. */
export function errorMessage(err: unknown): string {
  const code = (err as { code?: string })?.code ?? ''
  switch (code) {
    case 'permission-denied':
      return 'Permesso negato: verifica di aver pubblicato le regole Firestore.'
    case 'unavailable':
      return 'Servizio non raggiungibile: i dati verranno sincronizzati quando torni online.'
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Accesso annullato.'
    case 'auth/unauthorized-domain':
      return 'Dominio non autorizzato: aggiungilo ai domini autorizzati di Firebase Authentication.'
    case 'auth/network-request-failed':
      return 'Errore di rete durante l’accesso. Controlla la connessione.'
  }
  return err instanceof Error ? err.message : 'Si è verificato un errore imprevisto.'
}

/** Converte l'input testuale in numero accettando la virgola decimale; NaN se non valido. */
export function parseNum(s: string): number {
  const t = s.trim().replace(',', '.')
  return t === '' ? NaN : Number(t)
}

/** Numero → stringa per i campi di input, con virgola decimale. */
export const numToInput = (n: number | null | undefined) => (n == null || Number.isNaN(n) ? '' : String(n).replace('.', ','))

/** Valida i grammi inseriti: numero > 0 e ≤ 10 kg. */
export function validGrams(s: string): number | null {
  const g = parseNum(s)
  return Number.isFinite(g) && g > 0 && g <= 10000 ? g : null
}
