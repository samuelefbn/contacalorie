/** Categorie mostrate davanti al nome degli alimenti generici (elenco chiuso). */
export const DISPLAY_CATEGORIES = [
  'Frutta',
  'Verdura',
  'Legumi',
  'Cereali e derivati',
  'Carne',
  'Salumi',
  'Pesce',
  'Uova',
  'Latticini',
  'Grassi e oli',
  'Frutta secca',
  'Dolci',
  'Bevande',
  'Altro',
] as const

export type DisplayCategory = (typeof DISPLAY_CATEGORIES)[number]

/**
 * Nome strutturato di un alimento generico, in italiano. I campi restano separati
 * per ordinare e raggruppare; la stringa mostrata si ottiene con `formatFoodLabel`.
 */
export interface GenericFoodDisplay {
  category: DisplayCategory
  /** Nome comune al singolare con iniziale maiuscola (es. "Mela", "Pollo"). */
  baseName: string
  /** Parte o taglio, mostrato dopo il nome base (es. "petto" → "Pollo, petto"). */
  cut?: string
  /** Varietà, altre informazioni e stato di cottura, in quest'ordine (es. ["Fuji", "con buccia", "cruda"]). */
  details: string[]
}

/** "Categoria - Alimento, taglio (dettaglio, dettaglio)": es. "Carne - Pollo, petto (crudo)". */
export function formatFoodLabel(d: GenericFoodDisplay): string {
  const name = d.cut ? `${d.baseName}, ${d.cut}` : d.baseName
  return `${d.category} - ${name}${d.details.length ? ` (${d.details.join(', ')})` : ''}`
}

/** Stati di cottura riconosciuti (tutte le forme di genere e numero), con il loro ordine. */
const STATE_ORDER: [RegExp, number][] = [
  [/^crud[oaie]$/, 0],
  [/^fresc(o|a|hi|he)$/, 0],
  [/^secc(o|a|hi|he)$/, 1],
  [/^(lessat|bollit)[oaie]$/, 2],
  [/^cott[oaie]$/, 3],
  [/^(al vapore|in camicia|sod[oaie])$/, 3],
  [/^(grigliat[oaie]|alla griglia)$/, 4],
  [/^(arrosto|al forno|tostat[oaie])$/, 5],
  [/^(in padella|rosolat[oaie]|strapazzat[oaie])$/, 6],
  [/^brasat[oaie]$/, 7],
  [/^fritt[oaie]$/, 8],
  [/^(in scatola|sgocciolat[oaie]|surgelat[oaie]|affumicat[oaie])$/, 9],
]

/** Posizione dello stato di cottura (-1 se il dettaglio non è uno stato). */
export function stateRank(detail: string): number {
  return STATE_ORDER.find(([re]) => re.test(detail))?.[1] ?? -1
}

export const isStateDetail = (detail: string) => stateRank(detail) >= 0
