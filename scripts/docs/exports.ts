/**
 * Estrae tutti gli export di src/ (funzioni, hook, componenti, costanti, tipi) con firma, commento
 * TSDoc, riga e moduli che li importano. Usato da `npm run docs:functions` e `npm run docs:check`.
 */
import ts from 'typescript'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

export type ExportKind = 'component' | 'hook' | 'function' | 'class' | 'const' | 'type'

export interface ExportInfo {
  /** Percorso relativo alla root, es. src/services/foods.ts */
  file: string
  name: string
  kind: ExportKind
  signature: string
  doc: string
  line: number
  /** File che importano questo nome da questo modulo (test esclusi). */
  usedBy: string[]
  /** Export di default del modulo. */
  isDefault: boolean
}

function program() {
  const configPath = resolve(ROOT, 'tsconfig.app.json')
  const cfg = ts.readConfigFile(configPath, ts.sys.readFile)
  const parsed = ts.parseJsonConfigFileContent(cfg.config, ts.sys, dirname(configPath))
  return ts.createProgram(parsed.fileNames, parsed.options)
}

const isSrc = (f: string) => f.startsWith('src/') && !/\.test\.tsx?$/.test(f) && !f.endsWith('vite-env.d.ts')

function kindOf(name: string, decl: ts.Declaration, file: string, checker: ts.TypeChecker, sym: ts.Symbol): ExportKind {
  if (ts.isInterfaceDeclaration(decl) || ts.isTypeAliasDeclaration(decl)) return 'type'
  if (ts.isClassDeclaration(decl)) return 'class'
  const type = checker.getTypeOfSymbolAtLocation(sym, decl)
  const callable = type.getCallSignatures().length > 0
  if (!callable) return 'const'
  if (/^use[A-Z]/.test(name)) return 'hook'
  if (/^[A-Z]/.test(name) && file.endsWith('.tsx')) return 'component'
  return 'function'
}

function signatureOf(decl: ts.Declaration, kind: ExportKind, checker: ts.TypeChecker, sym: ts.Symbol): string {
  const sf = decl.getSourceFile()
  if (kind === 'type') {
    const text = decl.getText(sf).replace(/\/\*\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ')
    return text.length > 220 ? text.slice(0, 217) + '…' : text
  }
  const type = checker.getTypeOfSymbolAtLocation(sym, decl)
  const sigs = type.getCallSignatures()
  const flags = ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope
  if (sigs.length) return sigs.map((s) => `${sym.name}${checker.signatureToString(s, undefined, flags)}`).join('\n')
  const t = checker.typeToString(type, undefined, flags)
  return `${sym.name}: ${t.length > 200 ? t.slice(0, 197) + '…' : t}`
}

function docOf(sym: ts.Symbol, checker: ts.TypeChecker): string {
  return ts.displayPartsToString(sym.getDocumentationComment(checker)).replace(/\s+/g, ' ').trim()
}

/** Risolve uno specificatore relativo nel file sorgente esistente (.ts, .tsx o index.ts). */
function resolveSpec(fromFile: string, spec: string): string | null {
  const base = relative(ROOT, resolve(dirname(fromFile), spec))
  for (const c of [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`, base]) {
    if (/\.(ts|tsx|json)$/.test(c) && existsSync(resolve(ROOT, c))) return c
  }
  return null
}

/** Moduli interni importati da ogni file di src/ (import statici e dinamici). */
export function moduleDependencies(): Map<string, string[]> {
  const prog = program()
  const deps = new Map<string, string[]>()
  for (const sf of prog.getSourceFiles()) {
    const file = relative(ROOT, sf.fileName)
    if (!isSrc(file)) continue
    const out = new Set<string>()
    const visit = (node: ts.Node) => {
      let spec: string | undefined
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) {
        spec = (node.moduleSpecifier as ts.StringLiteral).text
      } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        const arg = node.arguments[0]
        if (arg && ts.isStringLiteral(arg)) spec = arg.text
      }
      if (spec?.startsWith('.')) {
        const target = resolveSpec(sf.fileName, spec)
        if (target) out.add(target)
      }
      ts.forEachChild(node, visit)
    }
    visit(sf)
    deps.set(file, [...out].sort())
  }
  return deps
}

/** Mappa "file|nome" → file che lo importano (risolvendo i percorsi relativi e le riesportazioni dirette). */
function importers(files: readonly ts.SourceFile[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>()
  const add = (key: string, by: string) => (map.get(key) ?? map.set(key, new Set()).get(key)!).add(by)
  for (const sf of files) {
    const from = relative(ROOT, sf.fileName)
    if (!from.startsWith('src/')) continue
    // Import dinamici (es. React.lazy(() => import('./features/history/HistoryPage'))): export di default.
    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        const arg = node.arguments[0]
        if (arg && ts.isStringLiteral(arg) && arg.text.startsWith('.')) {
          const target = resolveSpec(sf.fileName, arg.text)
          if (target) add(`${target}|default`, from)
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(sf)
    for (const st of sf.statements) {
      if (!(ts.isImportDeclaration(st) || ts.isExportDeclaration(st)) || !st.moduleSpecifier) continue
      const spec = (st.moduleSpecifier as ts.StringLiteral).text
      if (!spec.startsWith('.')) continue
      const base = relative(ROOT, resolve(dirname(sf.fileName), spec))
      const targets = [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`]
      const names: string[] = []
      if (ts.isImportDeclaration(st)) {
        const clause = st.importClause
        if (clause?.name) names.push('default')
        const nb = clause?.namedBindings
        if (nb && ts.isNamedImports(nb)) nb.elements.forEach((e) => names.push((e.propertyName ?? e.name).text))
      } else if (st.exportClause && ts.isNamedExports(st.exportClause)) {
        st.exportClause.elements.forEach((e) => names.push((e.propertyName ?? e.name).text))
      }
      for (const t of targets) for (const n of names) add(`${t}|${n}`, from)
    }
  }
  return map
}

export function collectExports(): ExportInfo[] {
  const prog = program()
  const checker = prog.getTypeChecker()
  const files = prog.getSourceFiles().filter((sf) => !sf.isDeclarationFile)
  const imp = importers(files)
  const out: ExportInfo[] = []
  for (const sf of files) {
    const file = relative(ROOT, sf.fileName)
    if (!isSrc(file)) continue
    const modSym = checker.getSymbolAtLocation(sf)
    if (!modSym) continue
    for (const sym0 of checker.getExportsOfModule(modSym)) {
      let sym = sym0
      if (sym.flags & ts.SymbolFlags.Alias) sym = checker.getAliasedSymbol(sym)
      const decl = sym.declarations?.[0]
      if (!decl) continue
      const declFile = relative(ROOT, decl.getSourceFile().fileName)
      if (declFile !== file) continue // riesportazione: documentata nel modulo d'origine
      const declName = (decl as ts.Declaration & { name?: ts.Identifier }).name?.text
      // export default function App → nome "App" (indicato come export di default nella documentazione).
      const name = sym0.name === 'default' ? (declName ?? 'default') : sym0.name
      const kind = kindOf(name, decl, file, checker, sym)
      // Chi lo usa: import dal file stesso o da un modulo che lo riesporta (es. foodSearch/index.ts).
      const usedBy = new Set<string>()
      for (const [key, by] of imp) {
        const [target, n] = key.split('|')
        if ((n === sym0.name || (sym0.name === 'default' && n === 'default')) && target === file) by.forEach((b) => usedBy.add(b))
      }
      // Riesportazioni: chi importa dall'index.
      for (const [key, by] of imp) {
        const [target, n] = key.split('|')
        if (n === sym0.name && target !== file && target.endsWith('/index.ts') && existsSync(resolve(ROOT, target))) {
          const indexSrc = readFileSync(resolve(ROOT, target), 'utf8')
          const reexp = new RegExp(`export\\s*\\{[^}]*\\b${sym0.name}\\b[^}]*\\}\\s*from\\s*'\\./${file.split('/').pop()!.replace(/\.tsx?$/, '')}'`)
          if (reexp.test(indexSrc)) by.forEach((b) => b !== target && usedBy.add(b))
        }
      }
      usedBy.delete(file)
      out.push({
        file,
        name,
        kind,
        signature: signatureOf(decl, kind, checker, sym).replace(/^default\b/, name),
        isDefault: sym0.name === 'default',
        doc: docOf(sym, checker),
        line: sf.getLineAndCharacterOfPosition(decl.getStart(sf)).line + 1,
        usedBy: [...usedBy].filter((f) => !/\.test\.tsx?$/.test(f)).sort(),
      })
    }
  }
  return out.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const all = collectExports()
  if (process.argv.includes('--json')) console.log(JSON.stringify(all, null, 1))
  else for (const e of all) console.log(`${e.file}:${e.line}\t${e.kind}\t${e.name}\t[${e.usedBy.length}]\t${e.doc.slice(0, 60)}`)
}
