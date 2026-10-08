/**
 * Genera src/data/genericFoods.it.json interrogando USDA FoodData Central (Foundation e SR Legacy).
 * I valori nutrizionali arrivano SOLO dall'API: nessun numero è scritto a mano.
 *
 * Uso:  VITE_USDA_API_KEY=la-tua-chiave npm run build:foods
 *       (oppure metti la chiave nel file .env, letto automaticamente)
 */
import { existsSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { fetchJson } from '../src/lib/foodSearch/http'
import { USDA_DATA_TYPES, USDA_SEARCH_URL, usdaNutrients, type UsdaFood } from '../src/lib/foodSearch/usdaMap'
import { roundResult } from '../src/lib/foodSearch/validate'
import { formatFoodLabel } from '../src/lib/foodSearch/display'
import { untranslatedReport, usdaToItalian } from '../src/lib/foodSearch/usdaToItalian'
import type { GenericFood, GenericFoodsDataset } from '../src/lib/foodSearch/genericTypes'
import { GENERIC_FOOD_DEFS, type GenericFoodDef } from './genericFoods.defs'
import { pickUsdaFood } from './usdaPicker'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUTPUT = resolve(root, 'src/data/genericFoods.it.json')
const CONCURRENCY = 3

const label = (f: GenericFood) => formatFoodLabel(f.cut ? { ...f, cut: f.cut } : f)

function loadDotEnv() {
  const file = resolve(root, '.env')
  if (!existsSync(file)) return
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

async function searchUsda(def: GenericFoodDef, apiKey: string): Promise<UsdaFood[]> {
  const params = new URLSearchParams({ query: def.query, dataType: USDA_DATA_TYPES, pageSize: '50', api_key: apiKey })
  const body = (await fetchJson(`${USDA_SEARCH_URL}?${params}`, { timeoutMs: 20000, retries: 4, baseDelayMs: 2000 })) as {
    foods?: UsdaFood[]
  } | null
  return body?.foods ?? []
}

async function build(def: GenericFoodDef, apiKey: string): Promise<GenericFood | string> {
  try {
    const picked = pickUsdaFood(def, await searchUsda(def, apiKey))
    if (!picked) return `nessuna voce USDA compatibile (query "${def.query}", termini ${JSON.stringify(def.match)})`
    const n = roundResult({
      id: '',
      name: formatFoodLabel(def.display),
      brand: null,
      source: 'usda',
      kind: 'generic',
      isPrimitive: def.isPrimitive,
      ...usdaNutrients(picked)!,
      servingGrams: null,
      barcode: null,
      imageUrl: null,
    })
    // Verifica del traduttore sulla descrizione reale (i token non riconosciuti finiscono nel riepilogo).
    usdaToItalian(picked.description ?? '', picked.foodCategory)
    return {
      id: def.id,
      category: def.display.category,
      baseName: def.display.baseName,
      ...(def.display.cut ? { cut: def.display.cut } : {}),
      details: def.display.details,
      isPrimitive: def.isPrimitive,
      synonyms: def.synonyms,
      state: def.state ?? null,
      kcal100: n.kcal100,
      protein100: n.protein100,
      carbs100: n.carbs100,
      fat100: n.fat100,
      source: 'USDA',
      fdcId: picked.fdcId,
      usdaDescription: picked.description ?? '',
      dataType: picked.dataType ?? '',
      portions: def.portions ?? [],
    }
  } catch (err) {
    return `errore API: ${(err as Error).message}`
  }
}

async function main() {
  loadDotEnv()
  const apiKey = process.env.VITE_USDA_API_KEY || process.env.USDA_API_KEY
  if (!apiKey) {
    console.error(
      'Manca la chiave USDA. Imposta VITE_USDA_API_KEY (gratuita su https://fdc.nal.usda.gov/api-key-signup).\n' +
        'DEMO_KEY non basta: lo script fa circa 400 richieste.',
    )
    process.exit(1)
  }

  const ids = new Set<string>()
  for (const d of GENERIC_FOOD_DEFS) {
    if (ids.has(d.id)) throw new Error(`id duplicato: ${d.id}`)
    ids.add(d.id)
  }

  console.log(`Cerco ${GENERIC_FOOD_DEFS.length} alimenti su USDA FoodData Central…`)
  const results: (GenericFood | string)[] = new Array(GENERIC_FOOD_DEFS.length)
  let next = 0
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (next < GENERIC_FOOD_DEFS.length) {
        const i = next++
        results[i] = await build(GENERIC_FOOD_DEFS[i], apiKey)
        const r = results[i]
        console.log(
          typeof r === 'string'
            ? `  ✗ ${formatFoodLabel(GENERIC_FOOD_DEFS[i].display)}: ${r}`
            : `  ✓ ${label(r)} → ${r.usdaDescription} [${r.dataType} ${r.fdcId}] ${r.kcal100} kcal`,
        )
      }
    }),
  )

  const foods = results.filter((r): r is GenericFood => typeof r !== 'string')
  const missing = GENERIC_FOOD_DEFS.flatMap((d, i) => {
    const r = results[i]
    return typeof r === 'string' ? [`${formatFoodLabel(d.display)}: ${r}`] : []
  })
  if (foods.length === 0) {
    console.error('\nNessun alimento ottenuto da USDA (rete o chiave non valide?): il dataset esistente NON viene modificato.')
    process.exit(1)
  }
  const dataset: GenericFoodsDataset = {
    generatedAt: new Date().toISOString(),
    source: 'USDA FoodData Central (https://fdc.nal.usda.gov)',
    dataTypes: USDA_DATA_TYPES.split(','),
    count: foods.length,
    foods,
  }
  writeFileSync(OUTPUT, JSON.stringify(dataset, null, 1) + '\n')
  console.log(`\nScritte ${foods.length} voci in src/data/genericFoods.it.json; non trovate: ${missing.length}.`)
  missing.forEach((m) => console.log(`  - ${m}`))
  const untranslated = untranslatedReport()
  console.log(`Token USDA non tradotti dal traduttore (da aggiungere ai dizionari): ${untranslated.length}`)
  untranslated.forEach((u) => console.log(`  - "${u.token}" ×${u.count} (es. ${u.example})`))

  // Riepilogo leggibile nella pagina dell'esecuzione su GitHub Actions.
  const summary = process.env.GITHUB_STEP_SUMMARY
  if (summary) {
    const rows = foods.map(
      (f) => `| ${label(f)} | ${f.usdaDescription} | ${f.dataType} | ${f.kcal100} | ${f.protein100} | ${f.carbs100} | ${f.fat100} |`,
    )
    appendFileSync(
      summary,
      [
        `## Dataset alimenti generici: ${foods.length} voci, ${missing.length} non trovate`,
        '',
        '| Alimento | Voce USDA | Dataset | kcal | Prot. | Carb. | Grassi |',
        '|---|---|---|---|---|---|---|',
        ...rows,
        '',
        missing.length ? `### Non trovate\n\n${missing.map((m) => `- ${m}`).join('\n')}\n` : '',
        untranslatedReport().length
          ? `### Token USDA non tradotti\n\n${untranslatedReport().map((u) => `- \`${u.token}\` ×${u.count} (es. ${u.example})`).join('\n')}\n`
          : '',
      ].join('\n'),
    )
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
