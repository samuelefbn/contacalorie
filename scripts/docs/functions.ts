/**
 * Genera docs/FUNCTIONS.md: firme, righe e chiamanti dal compilatore TypeScript (scripts/docs/exports.ts),
 * descrizioni in italiano dai commenti TSDoc del codice e da scripts/docs/descriptions.ts.
 *
 *   npm run docs:functions          → scrive docs/FUNCTIONS.md
 *   tsx scripts/docs/functions.ts --check → esce con errore se il file non è aggiornato
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ROOT, collectExports, moduleDependencies, type ExportInfo } from './exports'
import { DESCRIPTIONS, FILE_EFFECTS } from './descriptions'

export const OUTPUT = resolve(ROOT, 'docs/FUNCTIONS.md')

interface Group {
  key: string
  title: string
  match: (file: string) => boolean
}

const GROUPS: Group[] = [
  { key: 'services', title: 'Servizi (`src/services/`)', match: (f) => f.startsWith('src/services/') },
  { key: 'hooks', title: 'Hook (`src/hooks/`)', match: (f) => f.startsWith('src/hooks/') },
  { key: 'contexts', title: 'Context (`src/contexts/`)', match: (f) => f.startsWith('src/contexts/') },
  { key: 'lib', title: 'Utilità e logica (`src/lib/`)', match: (f) => f.startsWith('src/lib/') && !f.startsWith('src/lib/foodSearch/') },
  { key: 'foodSearch', title: 'Ricerca alimenti (`src/lib/foodSearch/`)', match: (f) => f.startsWith('src/lib/foodSearch/') },
  { key: 'components', title: 'Componenti di base (`src/components/`)', match: (f) => f.startsWith('src/components/') },
  { key: 'features', title: 'Pagine e funzionalità (`src/features/`)', match: (f) => f.startsWith('src/features/') },
  { key: 'app', title: 'App (`src/App.tsx`)', match: (f) => f === 'src/App.tsx' },
  { key: 'types', title: 'Tipi del modello dati (`src/types.ts`)', match: (f) => f === 'src/types.ts' },
]

const KIND_LABEL: Record<ExportInfo['kind'], string> = {
  component: 'componente',
  hook: 'hook',
  function: 'funzione',
  class: 'classe',
  const: 'costante',
  type: 'tipo',
}

export const anchor = (e: Pick<ExportInfo, 'file' | 'name'>) =>
  `${e.file}-${e.name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const keyOf = (e: Pick<ExportInfo, 'file' | 'name'>) => `${e.file}#${e.name}`

export function purposeOf(e: ExportInfo): string {
  return DESCRIPTIONS[keyOf(e)]?.s ?? e.doc
}

export function effectsOf(e: ExportInfo): string | undefined {
  return DESCRIPTIONS[keyOf(e)]?.e ?? FILE_EFFECTS[e.file]
}

const cell = (s: string) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ')

/** Gruppo di "livello" per il diagramma delle dipendenze. */
function layer(file: string): string {
  if (file === 'src/App.tsx' || file === 'src/main.tsx') return 'App'
  if (file.startsWith('src/features/')) return 'Features'
  if (file.startsWith('src/components/')) return 'Components'
  if (file.startsWith('src/contexts/')) return 'Contexts'
  if (file.startsWith('src/hooks/')) return 'Hooks'
  if (file.startsWith('src/services/')) return 'Services'
  if (file.startsWith('src/lib/foodSearch/')) return 'FoodSearch'
  if (file === 'src/lib/firebase.ts') return 'Firebase'
  if (file.startsWith('src/lib/')) return 'Lib'
  if (file.startsWith('src/data/')) return 'Data'
  if (file === 'src/types.ts') return 'Types'
  return 'Altro'
}

const LAYER_LABEL: Record<string, string> = {
  App: 'App.tsx e main.tsx',
  Features: 'features: pagine e pannelli',
  Components: 'components: ui e layout',
  Contexts: 'contexts: Auth, Theme, Toast, Sync',
  Hooks: 'hooks: listener e stato',
  Services: 'services: Firestore e sessione',
  FoodSearch: 'lib/foodSearch: ricerca',
  Firebase: 'lib/firebase.ts',
  Lib: 'lib: logica pura',
  Data: 'data: dataset generico',
  Types: 'types.ts',
}

function dependencyDiagram(deps: Map<string, string[]>): string {
  const edges = new Map<string, number>()
  for (const [from, tos] of deps) {
    for (const to of tos) {
      const a = layer(from)
      const b = layer(to)
      if (a === b || b === 'Types') continue
      edges.set(`${a}|${b}`, (edges.get(`${a}|${b}`) ?? 0) + 1)
    }
  }
  const nodes = new Set([...edges.keys()].flatMap((k) => k.split('|')))
  const lines = ['```mermaid', 'flowchart LR']
  for (const n of [...nodes].sort()) lines.push(`    ${n}["${LAYER_LABEL[n] ?? n}"]`)
  for (const [k, n] of [...edges.entries()].sort()) {
    const [a, b] = k.split('|')
    lines.push(`    ${a} -->|"${n}"| ${b}`)
  }
  lines.push('```')
  return lines.join('\n')
}

export function render(): string {
  const all = collectExports()
  const deps = moduleDependencies()
  const out: string[] = []
  out.push('# Riferimento di funzioni, hook e componenti')
  out.push('')
  out.push(
    '> **File generato** da `npm run docs:functions` (`scripts/docs/functions.ts`): firme, righe e chiamanti vengono dal compilatore TypeScript; le descrizioni dai commenti TSDoc del codice e da `scripts/docs/descriptions.ts`. Per modificare una descrizione cambia il commento nel codice o `descriptions.ts`, poi rigenera. `npm run docs:check` segnala se il file non è aggiornato.',
  )
  out.push('')
  const nonTypes = all.filter((e) => e.kind !== 'type')
  out.push(
    `Totale: **${all.length} export** in \`src/\` (${nonTypes.filter((e) => e.kind === 'component').length} componenti, ${nonTypes.filter((e) => e.kind === 'hook').length} hook, ${nonTypes.filter((e) => e.kind === 'function').length} funzioni, ${nonTypes.filter((e) => e.kind === 'class').length} classi, ${nonTypes.filter((e) => e.kind === 'const').length} costanti, ${all.length - nonTypes.length} tipi). I file di test non sono inclusi. "Usato da" elenca i file che importano il simbolo (anche tramite riesportazione o import dinamico).`,
  )
  out.push('')
  out.push('## Dipendenze tra moduli')
  out.push('')
  out.push('Numero di import tra i livelli (frecce: "importa da"). I tipi di `src/types.ts` sono usati ovunque e non sono disegnati.')
  out.push('')
  out.push(dependencyDiagram(deps))
  out.push('')
  out.push('## Indice')
  out.push('')
  for (const g of GROUPS) {
    const items = all.filter((e) => g.match(e.file) && e.kind !== 'type')
    if (items.length === 0) continue
    out.push(`- **${g.title}**: ${items.map((e) => `[${e.name}](#${anchor(e)})`).join(' · ')}`)
  }
  out.push(`- **Tipi**: elencati in fondo a ogni modulo.`)
  out.push('')

  for (const g of GROUPS) {
    const files = [...new Set(all.filter((e) => g.match(e.file)).map((e) => e.file))]
    if (files.length === 0) continue
    out.push(`## ${g.title}`)
    out.push('')
    for (const file of files) {
      const items = all.filter((e) => e.file === file)
      const internal = (deps.get(file) ?? []).filter((d) => d !== 'src/types.ts')
      out.push(`### \`${file}\``)
      out.push('')
      out.push(`Dipendenze interne del modulo: ${internal.length ? internal.map((d) => `\`${d}\``).join(', ') : 'nessuna'}${(deps.get(file) ?? []).includes('src/types.ts') ? ' (più i tipi di `src/types.ts`)' : ''}.`)
      out.push('')
      for (const e of items.filter((x) => x.kind !== 'type')) {
        const d = DESCRIPTIONS[keyOf(e)]
        out.push(`<a id="${anchor(e)}"></a>`)
        out.push(`#### \`${e.name}\` — ${KIND_LABEL[e.kind]}${e.isDefault ? ' (export di default)' : ''}`)
        out.push('')
        out.push(`\`${e.file}:${e.line}\``)
        out.push('')
        out.push('```ts')
        out.push(e.signature)
        out.push('```')
        out.push('')
        out.push(`- **Scopo**: ${purposeOf(e) || '—'}`)
        if (d?.p) out.push(`- **Parametri e valore restituito**: ${d.p}`)
        out.push(`- **Effetti collaterali**: ${effectsOf(e) ?? '—'}`)
        out.push(`- **Usato da**: ${e.usedBy.length ? e.usedBy.map((f) => `\`${f}\``).join(', ') : 'nessun altro modulo (solo uso interno o nei test)'}`)
        out.push('')
      }
      const types = items.filter((x) => x.kind === 'type')
      if (types.length) {
        out.push(`Tipi esportati da \`${file}\`:`)
        out.push('')
        out.push('| Tipo | Descrizione | Usato da |')
        out.push('|---|---|---|')
        for (const t of types) {
          out.push(`| \`${t.name}\` | ${cell(purposeOf(t) || '—')} | ${t.usedBy.length ? t.usedBy.map((f) => `\`${f}\``).join(', ') : '—'} |`)
        }
        out.push('')
      }
    }
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n'
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const text = render()
  if (process.argv.includes('--check')) {
    let current = ''
    try {
      current = readFileSync(OUTPUT, 'utf8')
    } catch {
      // file assente
    }
    if (current !== text) {
      console.error('docs/FUNCTIONS.md non è aggiornato: esegui npm run docs:functions')
      process.exit(1)
    }
    console.log('docs/FUNCTIONS.md è aggiornato.')
  } else {
    writeFileSync(OUTPUT, text)
    console.log(`Scritto ${OUTPUT}`)
  }
}
