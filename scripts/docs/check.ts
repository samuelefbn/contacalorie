/**
 * `npm run docs:check`: controlla la documentazione (README.md, CLAUDE.md, docs/*.md).
 * - ogni percorso citato `src/…`, `scripts/…`, `tests/…`, `docs/…`, `.github/…` deve esistere;
 * - i blocchi ```mermaid non devono essere vuoti e devono iniziare con un tipo di diagramma noto;
 * - docs/FUNCTIONS.md deve essere aggiornato e ogni export (non tipo) deve avere scopo ed effetti;
 * - nessun valore che assomigli a una chiave reale (API key Google, chiavi private, token).
 * Stampa gli errori ed esce con codice 1 se ce ne sono.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { ROOT, collectExports } from './exports'
import { effectsOf, purposeOf, render, OUTPUT } from './functions'

const errors: string[] = []
const docs = [
  'README.md',
  'CLAUDE.md',
  ...readdirSync(join(ROOT, 'docs'))
    .filter((f) => f.endsWith('.md'))
    .map((f) => `docs/${f}`),
]

const PATH_RE = /(?<![\w./-])((?:src|scripts|tests|docs|\.github|public)\/[\w./-]*[\w-](?:\.[a-z]+)?)/g
const DIAGRAM_TYPES = /^(flowchart|graph|sequenceDiagram|erDiagram|classDiagram|stateDiagram|stateDiagram-v2|gantt|pie|journey|mindmap|timeline)\b/
const SECRET_RES: [RegExp, string][] = [
  [/AIza[0-9A-Za-z_-]{35}/, 'API key Google'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'chiave privata'],
  [/ghp_[0-9A-Za-z]{36}/, 'token GitHub'],
]
/** Valore reale assegnato a una variabile segreta (ammessi: true/false e segnaposto come "la-tua-chiave"). */
const SECRET_ASSIGN = /\bVITE_[A-Z_]*(?:KEY|_ID|DOMAIN|BUCKET)=([^\s<`]+)/g
const isPlaceholder = (v: string) => /^(true|false)$/.test(v) || /tua|your|xxx|\.\.\./i.test(v)

for (const doc of docs) {
  const text = readFileSync(join(ROOT, doc), 'utf8')
  // Percorsi citati (ignorando quelli con segnaposto o glob).
  for (const m of text.matchAll(PATH_RE)) {
    let p = m[1].replace(/[.:]+$/, '')
    if (/[<>*{}]/.test(p) || p.includes('…')) continue
    p = p.replace(/:\d+$/, '')
    if (!existsSync(resolve(ROOT, p))) errors.push(`${doc}: percorso inesistente "${p}"`)
  }
  // Blocchi Mermaid.
  const blocks = [...text.matchAll(/```mermaid\n([\s\S]*?)```/g)].map((m) => m[1].trim())
  blocks.forEach((b, i) => {
    if (!b) errors.push(`${doc}: blocco mermaid n. ${i + 1} vuoto`)
    else if (!DIAGRAM_TYPES.test(b)) errors.push(`${doc}: blocco mermaid n. ${i + 1} senza tipo di diagramma valido ("${b.split('\n')[0]}")`)
  })
  for (const [re, what] of SECRET_RES) if (re.test(text)) errors.push(`${doc}: possibile ${what}`)
  for (const m of text.matchAll(SECRET_ASSIGN)) {
    if (!isPlaceholder(m[1])) errors.push(`${doc}: possibile valore reale assegnato a ${m[0].split('=')[0]}`)
  }
}

// FUNCTIONS.md aggiornato e descrizioni complete.
const current = existsSync(OUTPUT) ? readFileSync(OUTPUT, 'utf8') : ''
if (current !== render()) errors.push('docs/FUNCTIONS.md non è aggiornato: esegui npm run docs:functions')
for (const e of collectExports()) {
  if (!purposeOf(e)) errors.push(`${e.file}#${e.name}: manca lo scopo (TSDoc nel codice o scripts/docs/descriptions.ts)`)
  if (e.kind !== 'type' && !effectsOf(e)) errors.push(`${e.file}#${e.name}: mancano gli effetti collaterali (scripts/docs/descriptions.ts)`)
}

if (errors.length) {
  console.error(`Documentazione: ${errors.length} problemi\n` + errors.map((e) => `  - ${e}`).join('\n'))
  process.exit(1)
}
console.log(`Documentazione OK: ${docs.length} file controllati.`)
