/**
 * Elenco degli alimenti generici (sfusi) della cucina italiana da cercare su USDA FoodData Central.
 *
 * Ogni voce ha il nome italiano strutturato (categoria, nome base, taglio, dettagli) usato nella UI:
 * es. D('Carne', 'Pollo', ['crudo'], 'petto') → "Carne - Pollo, petto (crudo)".
 * Qui NON ci sono valori nutrizionali: lo script `build-generic-foods.ts` cerca ogni voce su USDA
 * (dataset Foundation e SR Legacy), sceglie la descrizione che contiene tutti i termini `match`
 * (e nessuno di `exclude`) e ne copia kcal, proteine, carboidrati e grassi per 100 g.
 *
 * - `match`: ogni elemento deve comparire nella descrizione USDA (minuscolo); "a|b" = a oppure b.
 * - `portions`: porzioni INDICATIVE per l'inserimento rapido (l'utente può sempre cambiare i grammi).
 * - X(...) al posto di D(...) marca un prodotto trasformato (mostrato solo se cercato esplicitamente).
 */
import { formatFoodLabel, type DisplayCategory, type GenericFoodDisplay } from '../src/lib/foodSearch/display'
import type { Portion } from '../src/lib/foodSearch/types'

export type State =
  | 'crudo'
  | 'cotto'
  | 'lessato'
  | 'arrosto'
  | 'grigliato'
  | 'in padella'
  | 'brasato'
  | 'fritto'
  | 'al forno'
  | 'secco'
  | 'in scatola'
  | 'tostato'

export interface GenericFoodDef {
  id: string
  display: GenericFoodDisplay
  /** Alimento semplice (non trasformato): mostrato per primo. */
  isPrimitive: boolean
  synonyms: string[]
  state?: State
  query: string
  match: string[]
  exclude?: string[]
  portions?: Portion[]
}

/** Esclusioni applicate a tutte le voci: preparazioni pronte, alimenti per l'infanzia, ristorazione. */
export const GLOBAL_EXCLUDE = ['babyfood', 'infant', 'restaurant', 'fast food', 'school lunch', 'usda commodity']

const p = (label: string, grams: number): Portion => ({ label, grams })

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

interface Label {
  display: GenericFoodDisplay
  isPrimitive: boolean
}

/** Alimento semplice: categoria, nome base, dettagli (varietà, info, stato), taglio. */
const D = (category: DisplayCategory, baseName: string, details: string[] = [], cut?: string): Label => ({
  display: cut ? { category, baseName, cut, details } : { category, baseName, details },
  isPrimitive: true,
})

/** Prodotto trasformato (salumi, dolci, bevande, condimenti, snack…). */
const X = (category: DisplayCategory, baseName: string, details: string[] = [], cut?: string): Label => ({
  ...D(category, baseName, details, cut),
  isPrimitive: false,
})

type Opts = { state?: State; exclude?: string[]; portions?: Portion[] }

function make(defaultExclude: string[] = []) {
  return (label: Label, synonyms: string[], query: string, match: string[], opts: Opts = {}): GenericFoodDef => ({
    id: slug(formatFoodLabel(label.display)),
    ...label,
    synonyms,
    state: opts.state,
    query,
    match,
    // Un'esclusione di categoria non vale se contraddice i termini richiesti (es. "canned" per i pelati).
    exclude: [
      ...defaultExclude.filter((x) => !match.some((m) => m.includes(x) || x.includes(m))),
      ...(opts.exclude ?? []),
    ],
    portions: opts.portions,
  })
}

const RAW_PLANT_EXCLUDE = ['juice', 'dried', 'canned', 'frozen', 'sauce', 'dehydrated', 'cooked', 'sweetened', 'pickled']
const fruit = make(RAW_PLANT_EXCLUDE)
const fruitAny = make()
const veg = make(['canned', 'frozen', 'pickled', 'dehydrated', 'with salt'])
const legume = make(['sprouted', 'with salt', 'frozen'])
const cereal = make(['enriched, with', 'with salt', 'fortified'])
const meat = make(['frozen', 'breaded', 'cured', 'canned', 'with salt'])
const cured = make()
const fish = make(['breaded', 'frozen'])
const egg = make(['dried', 'frozen', 'substitute', 'duck', 'goose', 'quail', 'turkey'])
const dairy = make(['imitation', 'substitute', 'with added fiber'])
const fat = make()
const nut = make(['honey roasted', 'chocolate', 'with salt added'])
const other = make()

const CRUDO = { state: 'crudo' } as const

export const GENERIC_FOOD_DEFS: GenericFoodDef[] = [
  // ---------------------------------------------------------------- Frutta
  fruit(D('Frutta', 'Mela'), ['mela', 'mele', 'mela con buccia'], 'apples raw with skin', ['apples', 'raw', 'with skin'], { ...CRUDO, portions: [p('1 mela media', 180), p('1 mela piccola', 130)] }),
  fruit(D('Frutta', 'Mela', ['senza buccia']), ['mela', 'mela sbucciata', 'mela pelata'], 'apples raw without skin', ['apples', 'raw', 'without skin'], { ...CRUDO, portions: [p('1 mela media sbucciata', 160)] }),
  fruit(D('Frutta', 'Pera'), ['pera', 'pere'], 'pears raw', ['pears', 'raw'], { exclude: ['asian'], portions: [p('1 pera media', 170)] }),
  fruit(D('Frutta', 'Banana'), ['banana', 'banane'], 'bananas raw', ['bananas', 'raw'], { portions: [p('1 banana media (senza buccia)', 120)] }),
  fruit(D('Frutta', 'Arancia'), ['arancia', 'arance'], 'oranges raw all commercial varieties', ['oranges', 'raw'], { exclude: ['peel'], portions: [p('1 arancia media (senza buccia)', 150)] }),
  fruit(D('Frutta', 'Mandarino'), ['mandarino', 'mandarini'], 'tangerines mandarin oranges raw', ['tangerines', 'raw'], { portions: [p('1 mandarino medio', 80)] }),
  fruit(D('Frutta', 'Clementina'), ['clementina', 'clementine'], 'clementines raw', ['clementines', 'raw'], { portions: [p('1 clementina media', 75)] }),
  fruit(D('Frutta', 'Limone'), ['limone', 'limoni'], 'lemons raw without peel', ['lemons', 'raw', 'without peel']),
  fruit(D('Frutta', 'Lime'), ['lime'], 'limes raw', ['limes', 'raw']),
  fruit(D('Frutta', 'Pompelmo'), ['pompelmo', 'pompelmi'], 'grapefruit raw pink and red', ['grapefruit', 'raw'], { portions: [p('1/2 pompelmo', 125)] }),
  fruit(D('Frutta', 'Fragola'), ['fragola', 'fragole'], 'strawberries raw', ['strawberries', 'raw'], { portions: [p('1 coppetta', 150)] }),
  fruit(D('Frutta', 'Ciliegia'), ['ciliegia', 'ciliegie'], 'cherries sweet raw', ['cherries', 'sweet', 'raw'], { portions: [p('1 coppetta', 150)] }),
  fruit(D('Frutta', 'Uva'), ['uva', 'uva bianca', 'uva nera'], 'grapes red or green european type raw', ['grapes', 'raw'], { exclude: ['american'], portions: [p('1 grappolo piccolo', 150)] }),
  fruit(D('Frutta', 'Pesca'), ['pesca', 'pesche'], 'peaches yellow raw', ['peaches', 'raw'], { portions: [p('1 pesca media', 150)] }),
  fruit(D('Frutta', 'Pesca noce'), ['pesca noce', 'nettarina', 'nettarine'], 'nectarines raw', ['nectarines', 'raw'], { portions: [p('1 pesca noce media', 140)] }),
  fruit(D('Frutta', 'Albicocca'), ['albicocca', 'albicocche'], 'apricots raw', ['apricots', 'raw'], { portions: [p('1 albicocca', 35)] }),
  fruit(D('Frutta', 'Prugna'), ['prugna', 'prugne', 'susina', 'susine'], 'plums raw', ['plums', 'raw'], { portions: [p('1 prugna', 65)] }),
  fruit(D('Frutta', 'Kiwi'), ['kiwi'], 'kiwifruit green raw', ['kiwifruit', 'raw'], { exclude: ['gold'], portions: [p('1 kiwi medio', 75)] }),
  fruit(D('Frutta', 'Ananas'), ['ananas'], 'pineapple raw all varieties', ['pineapple', 'raw'], { portions: [p('1 fetta', 80)] }),
  fruit(D('Frutta', 'Mango'), ['mango'], 'mangos raw', ['mangos', 'raw'], { portions: [p('1/2 mango', 100)] }),
  fruit(D('Frutta', 'Papaya'), ['papaya'], 'papayas raw', ['papayas', 'raw']),
  fruit(D('Frutta', 'Melone', ['cantalupo']), ['melone', 'melone retato', 'melone cantalupo'], 'melons cantaloupe raw', ['melons', 'cantaloupe', 'raw'], { portions: [p('1 fetta', 150)] }),
  fruit(D('Frutta', 'Melone', ['bianco']), ['melone bianco', 'melone d inverno'], 'melons honeydew raw', ['melons', 'honeydew', 'raw']),
  fruit(D('Frutta', 'Anguria'), ['anguria', 'cocomero'], 'watermelon raw', ['watermelon', 'raw'], { portions: [p('1 fetta', 250)] }),
  fruit(D('Frutta', 'Fico'), ['fico', 'fichi'], 'figs raw', ['figs', 'raw'], { portions: [p('1 fico', 50)] }),
  fruit(D('Frutta', 'Lampone'), ['lampone', 'lamponi'], 'raspberries raw', ['raspberries', 'raw'], { portions: [p('1 coppetta', 125)] }),
  fruit(D('Frutta', 'Mirtillo'), ['mirtillo', 'mirtilli'], 'blueberries raw', ['blueberries', 'raw'], { portions: [p('1 coppetta', 125)] }),
  fruit(D('Frutta', 'Mora'), ['more', 'mora', 'more di rovo'], 'blackberries raw', ['blackberries', 'raw'], { portions: [p('1 coppetta', 125)] }),
  fruit(D('Frutta', 'Melograno'), ['melograno', 'melagrana'], 'pomegranates raw', ['pomegranates', 'raw']),
  fruit(D('Frutta', 'Caco'), ['caco', 'cachi', 'kaki'], 'persimmons japanese raw', ['persimmons', 'japanese', 'raw'], { portions: [p('1 caco medio', 170)] }),
  fruit(D('Frutta', 'Avocado'), ['avocado'], 'avocados raw all commercial varieties', ['avocados', 'raw'], { exclude: ['florida', 'california'], portions: [p('1/2 avocado', 100)] }),
  fruit(D('Frutta', 'Cocco', ['polpa fresca']), ['cocco', 'noce di cocco'], 'nuts coconut meat raw', ['coconut meat', 'raw']),
  fruit(D('Frutta', 'Litchi'), ['litchi', 'lychee'], 'litchis raw', ['litchis', 'raw']),
  fruitAny(D('Frutta', 'Dattero', ['Medjool', 'secco']), ['dattero', 'datteri'], 'dates medjool', ['dates', 'medjool'], { state: 'secco', portions: [p('1 dattero', 24)] }),
  fruitAny(D('Frutta', 'Uvetta', ['secca']), ['uvetta', 'uva passa', 'uva sultanina'], 'raisins seedless', ['raisins', 'seedless'], { state: 'secco', exclude: ['golden'] }),
  fruitAny(D('Frutta', 'Prugna', ['secca']), ['prugne secche', 'prugna secca'], 'plums dried prunes uncooked', ['plums', 'dried', 'uncooked'], { state: 'secco' }),
  fruitAny(D('Frutta', 'Albicocca', ['secca']), ['albicocche secche', 'albicocca secca'], 'apricots dried sulfured uncooked', ['apricots', 'dried', 'uncooked'], { state: 'secco' }),
  fruitAny(D('Frutta', 'Fico', ['secco']), ['fichi secchi', 'fico secco'], 'figs dried uncooked', ['figs', 'dried', 'uncooked'], { state: 'secco' }),
  fruitAny(X('Frutta', 'Mirtillo rosso', ['zuccherato', 'secco']), ['mirtilli rossi secchi', 'cranberry secchi'], 'cranberries dried sweetened', ['cranberries', 'dried'], { state: 'secco' }),

  // ---------------------------------------------------------------- Verdura e ortaggi
  veg(D('Verdura', 'Pomodoro', ['crudo']), ['pomodoro', 'pomodori', 'pomodori freschi'], 'tomatoes red ripe raw year round average', ['tomatoes', 'red', 'ripe', 'raw'], { ...CRUDO, exclude: ['green', 'orange', 'yellow'], portions: [p('1 pomodoro medio', 120)] }),
  veg(D('Verdura', 'Pomodoro', ['ciliegino', 'crudo']), ['pomodorini', 'pomodori ciliegino', 'datterini'], 'tomatoes red ripe raw year round average', ['tomatoes', 'red', 'ripe', 'raw'], { ...CRUDO, exclude: ['green', 'orange', 'yellow'], portions: [p('5 pomodorini', 85)] }),
  veg(D('Verdura', 'Pomodoro', ['pelato', 'in scatola']), ['pelati', 'pomodori pelati'], 'tomatoes red ripe canned packed in tomato juice', ['tomatoes', 'canned', 'tomato juice'], { state: 'in scatola' }),
  veg(X('Verdura', 'Passata di pomodoro'), ['passata', 'passata di pomodoro', 'salsa di pomodoro'], 'tomato products canned puree without salt added', ['tomato', 'puree'], { state: 'in scatola' }),
  veg(X('Verdura', 'Concentrato di pomodoro'), ['concentrato di pomodoro', 'triplo concentrato'], 'tomato products canned paste without salt added', ['tomato', 'paste'], { state: 'in scatola' }),
  veg(D('Verdura', 'Pomodoro', ['secco']), ['pomodori secchi'], 'tomatoes sun-dried', ['tomatoes', 'sun-dried'], { state: 'secco', exclude: ['packed in oil'] }),
  veg(D('Verdura', 'Lattuga', ['a foglia verde']), ['insalata', 'lattuga', 'insalata verde'], 'lettuce green leaf raw', ['lettuce', 'green leaf', 'raw'], { ...CRUDO, portions: [p('1 piatto', 80)] }),
  veg(D('Verdura', 'Lattuga', ['iceberg']), ['iceberg', 'lattuga iceberg'], 'lettuce iceberg raw', ['lettuce', 'iceberg', 'raw'], CRUDO),
  veg(D('Verdura', 'Lattuga', ['romana']), ['lattuga romana', 'romana'], 'lettuce cos or romaine raw', ['lettuce', 'romaine', 'raw'], CRUDO),
  veg(D('Verdura', 'Rucola'), ['rucola', 'rughetta'], 'arugula raw', ['arugula', 'raw'], { ...CRUDO, portions: [p('1 manciata', 30)] }),
  veg(D('Verdura', 'Radicchio'), ['radicchio'], 'radicchio raw', ['radicchio', 'raw'], CRUDO),
  veg(D('Verdura', 'Indivia'), ['indivia', 'scarola', 'riccia'], 'endive raw', ['endive', 'raw'], CRUDO),
  veg(D('Verdura', 'Cicoria'), ['cicoria', 'cicorie'], 'chicory greens raw', ['chicory greens', 'raw'], CRUDO),
  veg(D('Verdura', 'Spinaci', ['crudi']), ['spinaci', 'spinacino', 'spinaci freschi'], 'spinach raw', ['spinach', 'raw'], CRUDO),
  veg(D('Verdura', 'Spinaci', ['lessati']), ['spinaci', 'spinaci cotti', 'spinaci lessati'], 'spinach cooked boiled drained without salt', ['spinach', 'cooked', 'boiled', 'without salt'], { state: 'lessato' }),
  veg(D('Verdura', 'Carota', ['cruda']), ['carota', 'carote'], 'carrots raw', ['carrots', 'raw'], { ...CRUDO, exclude: ['baby'], portions: [p('1 carota media', 60)] }),
  veg(D('Verdura', 'Carota', ['lessata']), ['carote', 'carote cotte', 'carote lessate'], 'carrots cooked boiled drained without salt', ['carrots', 'cooked', 'boiled', 'without salt'], { state: 'lessato' }),
  veg(D('Verdura', 'Zucchina', ['cruda']), ['zucchina', 'zucchine', 'zucchino', 'zucchini'], 'squash summer zucchini includes skin raw', ['zucchini', 'raw'], { ...CRUDO, exclude: ['baby'], portions: [p('1 zucchina media', 200)] }),
  veg(D('Verdura', 'Zucchina', ['lessata']), ['zucchine', 'zucchine cotte', 'zucchine lessate'], 'squash summer zucchini includes skin cooked boiled drained without salt', ['zucchini', 'cooked', 'without salt'], { state: 'lessato' }),
  veg(D('Verdura', 'Melanzana', ['cruda']), ['melanzana', 'melanzane'], 'eggplant raw', ['eggplant', 'raw'], { ...CRUDO, portions: [p('1 melanzana media', 450)] }),
  veg(D('Verdura', 'Melanzana', ['lessata']), ['melanzane', 'melanzane cotte', 'melanzane lessate'], 'eggplant cooked boiled drained without salt', ['eggplant', 'cooked', 'without salt'], { state: 'lessato' }),
  veg(D('Verdura', 'Peperone', ['rosso', 'crudo']), ['peperone', 'peperoni', 'peperone rosso'], 'peppers sweet red raw', ['peppers', 'sweet', 'red', 'raw'], { ...CRUDO, portions: [p('1 peperone medio', 160)] }),
  veg(D('Verdura', 'Peperone', ['verde', 'crudo']), ['peperone verde', 'friggitelli'], 'peppers sweet green raw', ['peppers', 'sweet', 'green', 'raw'], CRUDO),
  veg(D('Verdura', 'Peperone', ['giallo', 'crudo']), ['peperone giallo'], 'peppers sweet yellow raw', ['peppers', 'sweet', 'yellow', 'raw'], CRUDO),
  veg(D('Verdura', 'Peperoncino', ['fresco']), ['peperoncino', 'peperoncini'], 'peppers hot chili red raw', ['peppers', 'hot chili', 'red', 'raw'], CRUDO),
  veg(D('Verdura', 'Cipolla', ['cruda']), ['cipolla', 'cipolle', 'cipolla bianca', 'cipolla rossa'], 'onions raw', ['onions', 'raw'], { ...CRUDO, exclude: ['spring', 'welsh', 'young green', 'sweet'], portions: [p('1 cipolla media', 110)] }),
  veg(D('Verdura', 'Cipolla', ['cotta']), ['cipolla', 'cipolla cotta', 'cipolle cotte'], 'onions cooked boiled drained without salt', ['onions', 'cooked', 'boiled', 'without salt'], { state: 'lessato', exclude: ['spring', 'young green'] }),
  veg(D('Verdura', 'Cipollotto'), ['cipollotto', 'cipollotti', 'cipolla di tropea'], 'onions spring or scallions includes tops and bulb raw', ['onions', 'spring', 'raw'], CRUDO),
  veg(D('Verdura', 'Scalogno'), ['scalogno', 'scalogni'], 'shallots raw', ['shallots', 'raw'], CRUDO),
  veg(D('Verdura', 'Aglio'), ['aglio'], 'garlic raw', ['garlic', 'raw'], { ...CRUDO, portions: [p('1 spicchio', 3)] }),
  veg(D('Verdura', 'Porro'), ['porro', 'porri'], 'leeks bulb and lower leaf-portion raw', ['leeks', 'raw'], CRUDO),
  veg(D('Verdura', 'Patata', ['con buccia', 'cruda']), ['patata', 'patate'], 'potatoes white flesh and skin raw', ['potatoes', 'flesh and skin', 'raw'], { ...CRUDO, exclude: ['red', 'russet'], portions: [p('1 patata media', 170)] }),
  veg(D('Verdura', 'Patata', ['senza buccia', 'lessata']), ['patate', 'patate lesse', 'patate lessate', 'patate bollite'], 'potatoes boiled cooked without skin flesh without salt', ['potatoes', 'boiled', 'without skin', 'without salt'], { state: 'lessato' }),
  veg(D('Verdura', 'Patata', ['con buccia', 'al forno']), ['patate', 'patate al forno', 'patate arrosto'], 'potatoes baked flesh and skin without salt', ['potatoes', 'baked', 'flesh and skin', 'without salt'], { state: 'al forno' }),
  veg(D('Verdura', 'Patata dolce', ['cruda']), ['patata dolce', 'patate dolci', 'patata americana', 'batata'], 'sweet potato raw unprepared', ['sweet potato', 'raw'], CRUDO),
  veg(D('Verdura', 'Patata dolce', ['al forno']), ['patata dolce', 'patata dolce al forno', 'patate dolci cotte'], 'sweet potato cooked baked in skin flesh without salt', ['sweet potato', 'baked', 'without salt'], { state: 'al forno' }),
  veg(D('Verdura', 'Broccolo', ['crudo']), ['broccolo', 'broccoli'], 'broccoli raw', ['broccoli', 'raw'], { ...CRUDO, exclude: ['raab', 'chinese', 'leaves', 'stalks'] }),
  veg(D('Verdura', 'Broccolo', ['lessato']), ['broccoli', 'broccoli cotti', 'broccoli lessati'], 'broccoli cooked boiled drained without salt', ['broccoli', 'cooked', 'boiled', 'without salt'], { state: 'lessato', exclude: ['raab', 'chinese'] }),
  veg(D('Verdura', 'Cima di rapa', ['cruda']), ['cime di rapa', 'friarielli', 'broccoletti'], 'broccoli raab raw', ['broccoli raab', 'raw'], CRUDO),
  veg(D('Verdura', 'Cavolfiore', ['crudo']), ['cavolfiore', 'cavolfiori'], 'cauliflower raw', ['cauliflower', 'raw'], { ...CRUDO, exclude: ['green'] }),
  veg(D('Verdura', 'Cavolfiore', ['lessato']), ['cavolfiore', 'cavolfiore cotto', 'cavolfiore lessato'], 'cauliflower cooked boiled drained without salt', ['cauliflower', 'cooked', 'boiled', 'without salt'], { state: 'lessato' }),
  veg(D('Verdura', 'Cavolo cappuccio', ['crudo']), ['cavolo', 'cavolo cappuccio', 'cappuccio'], 'cabbage raw', ['cabbage', 'raw'], { ...CRUDO, exclude: ['chinese', 'red', 'savoy', 'napa'] }),
  veg(D('Verdura', 'Cavolo rosso', ['crudo']), ['cavolo rosso', 'cavolo viola'], 'cabbage red raw', ['cabbage', 'red', 'raw'], CRUDO),
  veg(D('Verdura', 'Verza', ['cruda']), ['verza', 'cavolo verza'], 'cabbage savoy raw', ['cabbage', 'savoy', 'raw'], CRUDO),
  veg(D('Verdura', 'Cavolo nero', ['crudo']), ['cavolo nero', 'kale'], 'kale raw', ['kale', 'raw'], { ...CRUDO, exclude: ['scotch'] }),
  veg(D('Verdura', 'Cavoletto di Bruxelles', ['crudo']), ['cavoletti di bruxelles', 'cavolini'], 'brussels sprouts raw', ['brussels sprouts', 'raw'], CRUDO),
  veg(D('Verdura', 'Sedano'), ['sedano', 'coste di sedano'], 'celery raw', ['celery', 'raw'], { ...CRUDO, exclude: ['celeriac', 'seed', 'flakes'] }),
  veg(D('Verdura', 'Finocchio'), ['finocchio', 'finocchi'], 'fennel bulb raw', ['fennel', 'bulb', 'raw'], { ...CRUDO, portions: [p('1 finocchio medio', 230)] }),
  veg(D('Verdura', 'Cetriolo', ['con buccia']), ['cetriolo', 'cetrioli'], 'cucumber with peel raw', ['cucumber', 'with peel', 'raw'], { ...CRUDO, portions: [p('1 cetriolo medio', 200)] }),
  veg(D('Verdura', 'Asparago', ['crudo']), ['asparago', 'asparagi'], 'asparagus raw', ['asparagus', 'raw'], CRUDO),
  veg(D('Verdura', 'Asparago', ['lessato']), ['asparagi', 'asparagi cotti', 'asparagi lessati'], 'asparagus cooked boiled drained without salt', ['asparagus', 'cooked', 'boiled'], { state: 'lessato' }),
  veg(D('Verdura', 'Carciofo', ['crudo']), ['carciofo', 'carciofi'], 'artichokes globe or french raw', ['artichokes', 'raw'], { ...CRUDO, exclude: ['jerusalem'] }),
  veg(D('Verdura', 'Carciofo', ['lessato']), ['carciofi', 'carciofi cotti', 'carciofi lessati'], 'artichokes globe or french cooked boiled drained without salt', ['artichokes', 'cooked', 'boiled'], { state: 'lessato', exclude: ['jerusalem'] }),
  veg(D('Verdura', 'Fungo', ['champignon', 'crudo']), ['funghi', 'fungo', 'champignon', 'funghi champignon'], 'mushrooms white raw', ['mushrooms', 'white', 'raw'], CRUDO),
  veg(D('Verdura', 'Fungo', ['champignon', 'cotto']), ['funghi champignon', 'funghi cotti', 'funghi trifolati'], 'mushrooms white cooked boiled drained without salt', ['mushrooms', 'white', 'cooked'], { state: 'cotto' }),
  veg(D('Verdura', 'Fungo', ['secco']), ['funghi porcini secchi', 'porcini', 'porcini secchi', 'funghi secchi'], 'mushrooms dried', ['mushrooms', 'dried'], { state: 'secco', exclude: ['shiitake'] }),
  veg(D('Verdura', 'Zucca', ['cruda']), ['zucca', 'zucche'], 'pumpkin raw', ['pumpkin', 'raw'], { ...CRUDO, exclude: ['seeds', 'flowers', 'leaves'] }),
  veg(D('Verdura', 'Zucca', ['lessata']), ['zucca', 'zucca cotta', 'zucca lessata'], 'pumpkin cooked boiled drained without salt', ['pumpkin', 'cooked', 'boiled'], { state: 'lessato', exclude: ['seeds', 'flowers', 'leaves'] }),
  veg(D('Verdura', 'Zucca', ['butternut', 'cruda']), ['zucca butternut', 'zucca violina'], 'squash winter butternut raw', ['butternut', 'raw'], CRUDO),
  veg(D('Verdura', 'Fiore di zucca', ['crudo']), ['fiori di zucca', 'fiori di zucchina'], 'pumpkin flowers raw', ['pumpkin', 'flowers', 'raw'], CRUDO),
  veg(D('Verdura', 'Pisello', ['crudo']), ['pisello', 'piselli', 'piselli freschi'], 'peas green raw', ['peas', 'green', 'raw'], { ...CRUDO, exclude: ['split', 'edible-podded', 'mature'] }),
  veg(D('Verdura', 'Pisello', ['surgelato', 'lessato']), ['piselli surgelati', 'piselli cotti'], 'peas green frozen cooked boiled drained without salt', ['peas', 'green', 'frozen', 'cooked'], { state: 'lessato', exclude: ['split'] }),
  veg(D('Verdura', 'Fagiolino', ['crudo']), ['fagiolino', 'fagiolini', 'cornetti'], 'beans snap green raw', ['beans', 'snap', 'green', 'raw'], CRUDO),
  veg(D('Verdura', 'Fagiolino', ['lessato']), ['fagiolini', 'fagiolini cotti', 'fagiolini lessati'], 'beans snap green cooked boiled drained without salt', ['beans', 'snap', 'green', 'cooked', 'boiled'], { state: 'lessato' }),
  veg(D('Verdura', 'Bietola', ['cruda']), ['bietola', 'bietole', 'erbette', 'coste'], 'chard swiss raw', ['chard', 'swiss', 'raw'], CRUDO),
  veg(D('Verdura', 'Bietola', ['lessata']), ['bietole', 'bietole cotte', 'bietole lessate', 'erbette cotte'], 'chard swiss cooked boiled drained without salt', ['chard', 'swiss', 'cooked', 'boiled'], { state: 'lessato' }),
  veg(D('Verdura', 'Barbabietola', ['cruda']), ['barbabietola', 'barbabietole', 'rapa rossa'], 'beets raw', ['beets', 'raw'], CRUDO),
  veg(D('Verdura', 'Barbabietola', ['lessata']), ['barbabietola', 'barbabietola cotta', 'barbabietole cotte', 'rape rosse cotte'], 'beets cooked boiled drained', ['beets', 'cooked', 'boiled'], { state: 'lessato', exclude: ['greens'] }),
  veg(D('Verdura', 'Mais', ['dolce', 'crudo']), ['mais dolce', 'mais', 'granturco', 'pannocchia'], 'corn sweet yellow raw', ['corn', 'sweet', 'yellow', 'raw'], CRUDO),
  veg(D('Verdura', 'Mais', ['dolce', 'in scatola']), ['mais in scatola', 'mais dolce in scatola'], 'corn sweet yellow canned whole kernel drained solids', ['corn', 'sweet', 'yellow', 'canned', 'drained'], { state: 'in scatola' }),
  veg(D('Verdura', 'Oliva', ['nera', 'in salamoia']), ['olive', 'olive nere'], 'olives ripe canned small-extra large', ['olives', 'ripe', 'canned'], { state: 'in scatola', exclude: ['jumbo'] }),
  veg(D('Verdura', 'Oliva', ['verde', 'in salamoia']), ['olive verdi'], 'olives pickled canned or bottled green', ['olives', 'green'], { state: 'in scatola' }),
  veg(D('Verdura', 'Ravanello'), ['ravanello', 'ravanelli'], 'radishes raw', ['radishes', 'raw'], { ...CRUDO, exclude: ['oriental', 'white icicle', 'seeds'] }),
  veg(D('Verdura', 'Germogli di soia'), ['germogli', 'germogli di soia'], 'mung beans mature seeds sprouted raw', ['mung beans', 'sprouted', 'raw'], CRUDO),
  veg(D('Verdura', 'Prezzemolo'), ['prezzemolo'], 'parsley fresh', ['parsley', 'fresh']),
  veg(D('Verdura', 'Basilico'), ['basilico'], 'basil fresh', ['basil', 'fresh']),
  veg(D('Verdura', 'Zenzero', ['fresco']), ['zenzero'], 'ginger root raw', ['ginger root', 'raw'], CRUDO),

  // ---------------------------------------------------------------- Legumi
  legume(D('Legumi', 'Fagiolo', ['borlotto', 'secco']), ['fagioli', 'fagioli borlotti', 'borlotti'], 'beans cranberry roman mature seeds raw', ['beans', 'cranberry', 'mature seeds', 'raw'], { state: 'secco' }),
  legume(D('Legumi', 'Fagiolo', ['borlotto', 'lessato']), ['fagioli borlotti', 'fagioli cotti', 'borlotti cotti', 'fagioli lessati'], 'beans cranberry roman mature seeds cooked boiled without salt', ['beans', 'cranberry', 'cooked', 'boiled'], { state: 'lessato' }),
  legume(D('Legumi', 'Fagiolo', ['cannellino', 'secco']), ['cannellini', 'fagioli bianchi', 'fagioli cannellini'], 'beans white mature seeds raw', ['beans', 'white', 'mature seeds', 'raw'], { state: 'secco', exclude: ['small'] }),
  legume(D('Legumi', 'Fagiolo', ['cannellino', 'lessato']), ['fagioli cannellini', 'cannellini cotti', 'fagioli bianchi cotti'], 'beans white mature seeds cooked boiled without salt', ['beans', 'white', 'cooked', 'boiled'], { state: 'lessato', exclude: ['small'] }),
  legume(D('Legumi', 'Fagiolo', ['cannellino', 'in scatola']), ['fagioli cannellini in scatola', 'cannellini in scatola', 'fagioli in scatola'], 'beans white mature seeds canned', ['beans', 'white', 'canned'], { state: 'in scatola' }),
  legume(D('Legumi', 'Fagiolo', ['rosso', 'secco']), ['fagioli rossi', 'fagioli kidney'], 'beans kidney red mature seeds raw', ['beans', 'kidney', 'red', 'raw'], { state: 'secco' }),
  legume(D('Legumi', 'Fagiolo', ['rosso', 'lessato']), ['fagioli rossi', 'fagioli rossi cotti'], 'beans kidney red mature seeds cooked boiled without salt', ['beans', 'kidney', 'red', 'cooked', 'boiled'], { state: 'lessato' }),
  legume(D('Legumi', 'Fagiolo', ['nero', 'secco']), ['fagioli neri'], 'beans black mature seeds raw', ['beans', 'black', 'mature seeds', 'raw'], { state: 'secco', exclude: ['turtle'] }),
  legume(D('Legumi', 'Fagiolo', ['nero', 'lessato']), ['fagioli neri', 'fagioli neri cotti'], 'beans black mature seeds cooked boiled without salt', ['beans', 'black', 'cooked', 'boiled'], { state: 'lessato', exclude: ['turtle'] }),
  legume(D('Legumi', 'Cece', ['secco']), ['cece', 'ceci'], 'chickpeas garbanzo beans bengal gram mature seeds raw', ['chickpeas', 'mature seeds', 'raw'], { state: 'secco' }),
  legume(D('Legumi', 'Cece', ['lessato']), ['ceci', 'ceci cotti', 'ceci lessati'], 'chickpeas garbanzo beans mature seeds cooked boiled without salt', ['chickpeas', 'cooked', 'boiled'], { state: 'lessato' }),
  legume(D('Legumi', 'Cece', ['in scatola']), ['ceci in scatola'], 'chickpeas garbanzo beans mature seeds canned drained', ['chickpeas', 'canned'], { state: 'in scatola' }),
  legume(D('Legumi', 'Lenticchia', ['secca']), ['lenticchia', 'lenticchie'], 'lentils raw', ['lentils', 'raw'], { state: 'secco', exclude: ['pink', 'red', 'sprouted'] }),
  legume(D('Legumi', 'Lenticchia', ['lessata']), ['lenticchie', 'lenticchie cotte', 'lenticchie lessate'], 'lentils mature seeds cooked boiled without salt', ['lentils', 'cooked', 'boiled'], { state: 'lessato' }),
  legume(D('Legumi', 'Lenticchia', ['rossa', 'secca']), ['lenticchie rosse', 'lenticchie decorticate'], 'lentils pink or red raw', ['lentils', 'pink or red', 'raw'], { state: 'secco' }),
  legume(D('Legumi', 'Fava', ['secca']), ['fava', 'fave', 'fave secche'], 'broadbeans fava beans mature seeds raw', ['broadbeans', 'mature seeds', 'raw'], { state: 'secco' }),
  legume(D('Legumi', 'Fava', ['lessata']), ['fave', 'fave cotte', 'fave lessate'], 'broadbeans fava beans mature seeds cooked boiled without salt', ['broadbeans', 'cooked', 'boiled'], { state: 'lessato' }),
  legume(D('Legumi', 'Fava', ['fresca']), ['fave fresche', 'baccelli'], 'broadbeans immature seeds raw', ['broadbeans', 'immature seeds', 'raw'], CRUDO),
  legume(D('Legumi', 'Pisello', ['spezzato', 'secco']), ['piselli secchi spezzati', 'piselli secchi', 'piselli spezzati'], 'peas split mature seeds raw', ['peas', 'split', 'raw'], { state: 'secco' }),
  legume(D('Legumi', 'Soia', ['secca']), ['soia', 'semi di soia'], 'soybeans mature seeds raw', ['soybeans', 'mature seeds', 'raw'], { state: 'secco', exclude: ['roasted'] }),
  legume(D('Legumi', 'Soia', ['lessata']), ['soia', 'soia cotta'], 'soybeans mature cooked boiled without salt', ['soybeans', 'cooked', 'boiled'], { state: 'lessato' }),
  legume(D('Legumi', 'Edamame', ['cotto']), ['edamame', 'fagioli di soia verdi'], 'edamame frozen prepared', ['edamame'], { state: 'cotto' }),
  legume(D('Legumi', 'Lupino', ['lessato']), ['lupino', 'lupini'], 'lupins mature seeds cooked boiled without salt', ['lupins', 'cooked', 'boiled'], { state: 'lessato' }),
  legume(D('Legumi', 'Tofu'), ['tofu'], 'tofu raw firm prepared with calcium sulfate', ['tofu', 'firm'], { exclude: ['fried', 'dried', 'salted'] }),
  legume(D('Legumi', 'Tempeh'), ['tempeh'], 'tempeh', ['tempeh'], { exclude: ['cooked'] }),
  legume(X('Legumi', 'Hummus'), ['hummus', 'crema di ceci'], 'hummus commercial', ['hummus'], { exclude: ['home prepared'] }),

  // ---------------------------------------------------------------- Cereali e derivati
  cereal(D('Cereali e derivati', 'Riso', ['bianco', 'crudo']), ['riso', 'riso bianco', 'riso arborio', 'riso carnaroli'], 'rice white medium-grain raw unenriched', ['rice', 'white', 'medium-grain', 'raw'], { ...CRUDO, exclude: ['glutinous', 'flour'], portions: [p('1 porzione', 80)] }),
  cereal(D('Cereali e derivati', 'Riso', ['bianco', 'cotto']), ['riso bianco', 'riso cotto', 'riso bollito', 'risotto in bianco'], 'rice white medium-grain cooked unenriched', ['rice', 'white', 'medium-grain', 'cooked'], { state: 'cotto', exclude: ['glutinous'], portions: [p('1 porzione', 200)] }),
  cereal(D('Cereali e derivati', 'Riso', ['a chicco lungo', 'crudo']), ['riso basmati', 'basmati', 'riso parboiled', 'riso a chicco lungo'], 'rice white long-grain regular raw unenriched', ['rice', 'white', 'long-grain', 'regular', 'raw'], { ...CRUDO, portions: [p('1 porzione', 80)] }),
  cereal(D('Cereali e derivati', 'Riso', ['a chicco lungo', 'cotto']), ['riso basmati', 'riso basmati cotto', 'basmati cotto'], 'rice white long-grain regular cooked unenriched without salt', ['rice', 'white', 'long-grain', 'regular', 'cooked'], { state: 'cotto' }),
  cereal(D('Cereali e derivati', 'Riso', ['integrale', 'crudo']), ['riso integrale'], 'rice brown long-grain raw', ['rice', 'brown', 'long-grain', 'raw'], { ...CRUDO, portions: [p('1 porzione', 80)] }),
  cereal(D('Cereali e derivati', 'Riso', ['integrale', 'cotto']), ['riso integrale', 'riso integrale cotto'], 'rice brown long-grain cooked', ['rice', 'brown', 'long-grain', 'cooked'], { state: 'cotto' }),
  cereal(D('Cereali e derivati', 'Pasta', ['di semola', 'cruda']), ['pasta di semola', 'pasta', 'spaghetti', 'penne', 'fusilli', 'maccheroni', 'pasta secca', 'pasta cruda'], 'pasta dry unenriched', ['pasta', 'dry'], { ...CRUDO, exclude: ['whole-wheat', 'whole grain', 'corn', 'spinach', 'vegetable', 'gluten-free', 'protein'], portions: [p('1 porzione', 80), p('1 porzione abbondante', 100)] }),
  cereal(D('Cereali e derivati', 'Pasta', ['di semola', 'cotta']), ['pasta di semola', 'pasta cotta', 'spaghetti cotti', 'pasta bollita'], 'pasta cooked unenriched without added salt', ['pasta', 'cooked', 'without added salt'], { state: 'cotto', exclude: ['whole-wheat', 'corn', 'spinach', 'vegetable', 'fresh-refrigerated', 'gluten-free'], portions: [p('1 porzione', 200)] }),
  cereal(D('Cereali e derivati', 'Pasta', ['integrale', 'cruda']), ['pasta integrale'], 'pasta whole-wheat dry', ['pasta', 'whole-wheat', 'dry'], { ...CRUDO, portions: [p('1 porzione', 80)] }),
  cereal(D('Cereali e derivati', 'Pasta', ['integrale', 'cotta']), ['pasta integrale', 'pasta integrale cotta'], 'pasta whole-wheat cooked', ['pasta', 'whole-wheat', 'cooked'], { state: 'cotto' }),
  cereal(D('Cereali e derivati', 'Pasta', ["all'uovo", 'cruda']), ["pasta all uovo", 'tagliatelle', 'fettuccine', 'pappardelle'], 'noodles egg dry unenriched', ['noodles', 'egg', 'dry'], { ...CRUDO, exclude: ['spinach', 'chinese', 'japanese'] }),
  cereal(D('Cereali e derivati', 'Pasta', ["all'uovo", 'cotta']), ['pasta all uovo', "pasta all uovo cotta", 'tagliatelle cotte'], 'noodles egg cooked unenriched without added salt', ['noodles', 'egg', 'cooked'], { state: 'cotto', exclude: ['spinach', 'chinese', 'japanese'] }),
  cereal(D('Cereali e derivati', 'Pane', ['bianco']), ['pane', 'pane bianco', 'pane comune', 'pane in cassetta', 'pancarre'], 'bread white commercially prepared', ['bread', 'white', 'commercially prepared'], { exclude: ['toasted', 'reduced', 'low sodium', 'crumbs', 'with raisins'], portions: [p('1 fetta', 30), p('1 panino', 60)] }),
  cereal(D('Cereali e derivati', 'Pane', ['integrale']), ['pane integrale'], 'bread whole-wheat commercially prepared', ['bread', 'whole-wheat', 'commercially prepared'], { exclude: ['toasted'], portions: [p('1 fetta', 35)] }),
  cereal(D('Cereali e derivati', 'Pane', ['tipo francese']), ['pane tipo francese', 'baguette', 'pane francese', 'pane casereccio', 'filone', 'pane a lievitazione naturale'], 'bread french or vienna includes sourdough', ['bread', 'french or vienna'], { exclude: ['toasted', 'whole wheat'], portions: [p('1 fetta', 40)] }),
  cereal(D('Cereali e derivati', 'Pane', ['tipo italiano']), ['pane tipo italiano', 'pane italiano', 'ciabatta', 'pane toscano'], 'bread italian', ['bread', 'italian'], { portions: [p('1 fetta', 40)] }),
  cereal(D('Cereali e derivati', 'Pane', ['di segale']), ['pane di segale', 'pane nero'], 'bread rye', ['bread', 'rye'], { exclude: ['toasted', 'reduced'], portions: [p('1 fetta', 32)] }),
  cereal(X('Cereali e derivati', 'Fetta biscottata'), ['fette biscottate', 'pane tostato'], 'bread white commercially prepared toasted', ['bread', 'white', 'toasted'], { state: 'tostato', portions: [p('1 fetta biscottata', 9)] }),
  cereal(X('Cereali e derivati', 'Cracker'), ['crackers', 'cracker', 'salatini'], 'crackers saltines', ['crackers', 'saltines'], { exclude: ['low salt', 'unsalted', 'whole wheat', 'fat-free'], portions: [p('1 pacchetto', 25)] }),
  cereal(X('Cereali e derivati', 'Grissino'), ['grissini', 'grissino'], 'bread stick', ['bread', 'stick'], { exclude: ['cheese'], portions: [p('1 grissino', 6)] }),
  cereal(D('Cereali e derivati', 'Farina', ['di frumento 00']), ['farina di frumento 00', 'farina', 'farina 00', 'farina bianca', 'farina di grano tenero'], 'wheat flour white all-purpose unenriched', ['wheat flour', 'white', 'all-purpose', 'unenriched'], { exclude: ['self-rising', 'calcium'] }),
  cereal(D('Cereali e derivati', 'Farina', ['integrale']), ['farina integrale'], 'wheat flour whole-grain', ['wheat flour', 'whole-grain'], { exclude: ['soft wheat'] }),
  cereal(D('Cereali e derivati', 'Semola', ['di grano duro']), ['semola', 'semola di grano duro', 'semolino'], 'semolina unenriched', ['semolina', 'unenriched']),
  cereal(D('Cereali e derivati', 'Farina', ['di mais']), ['polenta', 'farina di mais', 'farina gialla'], 'cornmeal whole-grain yellow', ['cornmeal', 'whole-grain', 'yellow'], { state: 'secco' }),
  cereal(D('Cereali e derivati', 'Avena', ['in fiocchi']), ['avena', 'fiocchi d avena', 'fiocchi di avena', 'porridge', 'oats'], 'oats', ['oats'], { exclude: ['bran', 'instant', 'flavored', 'with salt', 'cooked', 'babyfood', 'granola'], portions: [p('1 porzione', 40)] }),
  cereal(D('Cereali e derivati', 'Orzo', ['perlato', 'crudo']), ['orzo', 'orzo perlato'], 'barley pearled raw', ['barley', 'pearled', 'raw'], CRUDO),
  cereal(D('Cereali e derivati', 'Orzo', ['perlato', 'cotto']), ['orzo perlato', 'orzo cotto'], 'barley pearled cooked', ['barley', 'pearled', 'cooked'], { state: 'cotto' }),
  cereal(D('Cereali e derivati', 'Farro', ['crudo']), ['farro', 'spelta'], 'spelt uncooked', ['spelt', 'uncooked'], CRUDO),
  cereal(D('Cereali e derivati', 'Farro', ['cotto']), ['farro', 'farro cotto'], 'spelt cooked', ['spelt', 'cooked'], { state: 'cotto' }),
  cereal(D('Cereali e derivati', 'Quinoa', ['cruda']), ['quinoa'], 'quinoa uncooked', ['quinoa', 'uncooked'], CRUDO),
  cereal(D('Cereali e derivati', 'Quinoa', ['cotta']), ['quinoa', 'quinoa cotta'], 'quinoa cooked', ['quinoa', 'cooked'], { state: 'cotto' }),
  cereal(D('Cereali e derivati', 'Couscous', ['secco']), ['couscous', 'cous cous'], 'couscous dry', ['couscous', 'dry'], { state: 'secco' }),
  cereal(D('Cereali e derivati', 'Couscous', ['cotto']), ['couscous', 'couscous cotto', 'cous cous cotto'], 'couscous cooked', ['couscous', 'cooked'], { state: 'cotto' }),
  cereal(D('Cereali e derivati', 'Grano saraceno', ['crudo']), ['grano saraceno'], 'buckwheat groats roasted dry', ['buckwheat groats', 'dry'], CRUDO),
  cereal(D('Cereali e derivati', 'Grano saraceno', ['cotto']), ['grano saraceno', 'grano saraceno cotto'], 'buckwheat groats roasted cooked', ['buckwheat groats', 'cooked'], { state: 'cotto' }),
  cereal(D('Cereali e derivati', 'Miglio', ['crudo']), ['miglio'], 'millet raw', ['millet', 'raw'], { ...CRUDO, exclude: ['flour', 'puffed'] }),
  cereal(D('Cereali e derivati', 'Miglio', ['cotto']), ['miglio', 'miglio cotto'], 'millet cooked', ['millet', 'cooked'], { state: 'cotto' }),
  cereal(D('Cereali e derivati', 'Bulgur', ['cotto']), ['bulgur'], 'bulgur cooked', ['bulgur', 'cooked'], { state: 'cotto' }),
  cereal(X('Cereali e derivati', 'Popcorn'), ['popcorn', 'pop corn'], 'snacks popcorn air-popped', ['popcorn', 'air-popped'], { exclude: ['white popcorn'] }),
  cereal(X('Cereali e derivati', 'Corn flakes'), ['corn flakes', 'cornflakes', 'fiocchi di mais'], 'cereals ready-to-eat corn flakes plain', ['corn flakes'], { exclude: ['frosted', 'honey'] }),
  cereal(X('Cereali e derivati', 'Galletta di riso'), ['gallette di riso', 'gallette'], 'snacks rice cakes brown rice plain', ['rice cakes', 'plain'], { exclude: ['salt'] }),

  // ---------------------------------------------------------------- Carne: pollo
  meat(D('Carne', 'Pollo', ['crudo'], 'petto'), ['pollo', 'petto di pollo', 'fesa di pollo', 'filetto di pollo', 'pollo crudo'], 'chicken broilers or fryers breast meat only raw', ['chicken', 'breast', 'meat only', 'raw'], { ...CRUDO, exclude: ['skin'], portions: [p('1 fetta di petto', 100), p('1 petto intero', 200)] }),
  meat(D('Carne', 'Pollo', ['arrosto'], 'petto'), ['petto di pollo', 'pollo', 'petto di pollo cotto', 'petto di pollo arrosto', 'pollo cotto'], 'chicken broilers or fryers breast meat only cooked roasted', ['chicken', 'breast', 'meat only', 'cooked', 'roasted'], { state: 'arrosto', exclude: ['skin'] }),
  meat(D('Carne', 'Pollo', ['alla griglia'], 'petto'), ['petto di pollo', 'pollo', 'petto di pollo alla griglia', 'pollo alla piastra', 'petto di pollo grigliato'], 'chicken breast skinless boneless meat only cooked grilled', ['chicken', 'breast', 'meat only', 'grilled'], { state: 'grigliato' }),
  meat(D('Carne', 'Pollo', ['senza pelle', 'cruda'], 'coscia'), ['coscia di pollo senza pelle', 'pollo', 'coscia di pollo', 'sovracoscia di pollo', 'cosce di pollo'], 'chicken broilers or fryers thigh meat only raw', ['chicken', 'thigh', 'meat only', 'raw'], { ...CRUDO, portions: [p('1 sovracoscia', 120)] }),
  meat(D('Carne', 'Pollo', ['senza pelle', 'arrosto'], 'coscia'), ['coscia di pollo senza pelle', 'pollo', 'coscia di pollo cotta', 'cosce di pollo arrosto'], 'chicken broilers or fryers thigh meat only cooked roasted', ['chicken', 'thigh', 'meat only', 'cooked', 'roasted'], { state: 'arrosto' }),
  meat(D('Carne', 'Pollo', ['con pelle', 'cruda'], 'coscia'), ['pollo', 'coscia di pollo con pelle', 'cosce con pelle'], 'chicken broilers or fryers thigh meat and skin raw', ['chicken', 'thigh', 'meat and skin', 'raw'], CRUDO),
  meat(D('Carne', 'Pollo', ['con pelle', 'arrosto'], 'coscia'), ['coscia di pollo con pelle', 'pollo', 'coscia di pollo con pelle arrosto', 'cosce con pelle arrosto'], 'chicken broilers or fryers thigh meat and skin cooked roasted', ['chicken', 'thigh', 'meat and skin', 'cooked', 'roasted'], { state: 'arrosto' }),
  meat(D('Carne', 'Pollo', ['cruda'], 'sottocoscia'), ['fusello di pollo', 'pollo', 'fusello', 'fuselli di pollo', 'coscio di pollo'], 'chicken broilers or fryers drumstick meat only raw', ['chicken', 'drumstick', 'meat only', 'raw'], { ...CRUDO, portions: [p('1 fusello (senza osso)', 70)] }),
  meat(D('Carne', 'Pollo', ['arrosto'], 'sottocoscia'), ['fusello di pollo', 'pollo', 'fusello cotto', 'fuselli di pollo arrosto'], 'chicken broilers or fryers drumstick meat only cooked roasted', ['chicken', 'drumstick', 'meat only', 'cooked', 'roasted'], { state: 'arrosto' }),
  meat(D('Carne', 'Pollo', ['con pelle', 'cruda'], 'ala'), ['ali di pollo con pelle', 'pollo', 'ali di pollo', 'aletta di pollo', 'alette'], 'chicken broilers or fryers wing meat and skin raw', ['chicken', 'wing', 'meat and skin', 'raw'], CRUDO),
  meat(D('Carne', 'Pollo', ['con pelle', 'arrosto'], 'ala'), ['ali di pollo con pelle', 'pollo', 'ali di pollo cotte', 'alette arrosto'], 'chicken broilers or fryers wing meat and skin cooked roasted', ['chicken', 'wing', 'meat and skin', 'cooked', 'roasted'], { state: 'arrosto' }),
  meat(D('Carne', 'Pollo', ['intero', 'con pelle', 'crudo']), ['pollo intero con pelle', 'pollo', 'pollo intero', 'pollo con pelle'], 'chicken broilers or fryers meat and skin raw', ['chicken', 'broilers or fryers', 'meat and skin', 'raw'], { ...CRUDO, exclude: ['breast', 'thigh', 'drumstick', 'wing', 'leg', 'back', 'neck', 'light meat', 'dark meat'] }),
  meat(D('Carne', 'Pollo', ['intero', 'con pelle', 'arrosto']), ['pollo intero con pelle', 'pollo', 'pollo arrosto', 'pollo allo spiedo'], 'chicken broilers or fryers meat and skin cooked roasted', ['chicken', 'broilers or fryers', 'meat and skin', 'cooked', 'roasted'], { state: 'arrosto', exclude: ['breast', 'thigh', 'drumstick', 'wing', 'leg', 'back', 'neck', 'light meat', 'dark meat'] }),
  meat(D('Carne', 'Pollo', ['crudo'], 'fegato'), ['fegatini', 'fegato di pollo', 'fegatini di pollo'], 'chicken liver all classes raw', ['chicken', 'liver', 'raw'], CRUDO),
  meat(D('Carne', 'Pollo', ['crudo'], 'macinato'), ['macinato di pollo', 'pollo macinato'], 'chicken ground raw', ['chicken', 'ground', 'raw'], CRUDO),

  // ---------------------------------------------------------------- Carne: tacchino
  meat(D('Carne', 'Tacchino', ['crudo'], 'petto'), ['tacchino', 'petto di tacchino', 'fesa di tacchino'], 'turkey whole breast meat only raw', ['turkey', 'breast', 'meat only', 'raw'], { ...CRUDO, portions: [p('1 fettina', 100)] }),
  meat(D('Carne', 'Tacchino', ['arrosto'], 'petto'), ['petto di tacchino', 'tacchino', 'petto di tacchino cotto', 'fesa di tacchino arrosto'], 'turkey whole breast meat only cooked roasted', ['turkey', 'breast', 'meat only', 'cooked', 'roasted'], { state: 'arrosto' }),
  meat(D('Carne', 'Tacchino', ['cruda'], 'coscia'), ['tacchino', 'coscia di tacchino'], 'turkey whole leg meat only raw', ['turkey', 'leg', 'meat only', 'raw'], CRUDO),
  meat(D('Carne', 'Tacchino', ['arrosto'], 'coscia'), ['coscia di tacchino', 'tacchino', 'coscia di tacchino cotta'], 'turkey whole leg meat only cooked roasted', ['turkey', 'leg', 'meat only', 'cooked', 'roasted'], { state: 'arrosto' }),
  meat(D('Carne', 'Tacchino', ['crudo'], 'macinato'), ['tacchino', 'macinato di tacchino', 'tacchino macinato'], 'turkey ground raw', ['turkey', 'ground', 'raw'], { ...CRUDO, exclude: ['fat free', '93% lean', '85% lean'] }),
  meat(D('Carne', 'Tacchino', ['cotto'], 'macinato'), ['macinato di tacchino', 'tacchino', 'macinato di tacchino cotto'], 'turkey ground cooked', ['turkey', 'ground', 'cooked'], { state: 'cotto', exclude: ['fat free', '93% lean', '85% lean'] }),

  // ---------------------------------------------------------------- Carne: manzo e vitello
  meat(D('Carne', 'Manzo', ['15% grassi', 'crudo'], 'macinato'), ['macinato di manzo 15% grassi', 'manzo', 'macinato', 'macinato di manzo', 'carne macinata', 'carne trita'], 'beef ground 85% lean meat 15% fat raw', ['beef', 'ground', '85% lean', 'raw'], { ...CRUDO, portions: [p('1 porzione', 100), p('1 hamburger', 120)] }),
  meat(D('Carne', 'Manzo', ['15% grassi', 'cotto'], 'macinato'), ['macinato di manzo 15% grassi', 'manzo', 'macinato cotto', 'carne macinata cotta'], 'beef ground 85% lean meat 15% fat crumbles cooked pan-browned', ['beef', 'ground', '85% lean', 'cooked', 'pan-browned'], { state: 'in padella' }),
  meat(D('Carne', 'Manzo', ['5% grassi', 'crudo'], 'macinato'), ['macinato di manzo magro 5% grassi', 'manzo', 'macinato magro', 'macinato scelto'], 'beef ground 95% lean meat 5% fat raw', ['beef', 'ground', '95% lean', 'raw'], CRUDO),
  meat(D('Carne', 'Manzo', ['5% grassi', 'cotto'], 'macinato'), ['macinato di manzo magro 5% grassi', 'manzo', 'macinato magro cotto'], 'beef ground 95% lean meat 5% fat crumbles cooked pan-browned', ['beef', 'ground', '95% lean', 'cooked', 'pan-browned'], { state: 'in padella' }),
  meat(D('Carne', 'Manzo', ['15% grassi', 'alla griglia'], 'hamburger'), ['hamburger', 'hamburger di manzo', 'burger'], 'beef ground 85% lean meat 15% fat patty cooked broiled', ['beef', 'ground', '85% lean', 'patty', 'broiled'], { state: 'grigliato' }),
  meat(D('Carne', 'Manzo', ['magro', 'crudo'], 'controfiletto'), ['bistecca di manzo magra', 'manzo', 'bistecca', 'fettina di manzo', 'controfiletto', 'scamone', 'entrecote'], 'beef top sirloin steak separable lean only trimmed to 0 fat choice raw', ['beef', 'top sirloin', 'separable lean only', 'raw'], { ...CRUDO, exclude: ['select', 'prime'], portions: [p('1 bistecca', 150)] }),
  meat(D('Carne', 'Manzo', ['magro', 'alla griglia'], 'controfiletto'), ['bistecca di manzo magra', 'manzo', 'bistecca cotta', 'bistecca ai ferri', 'tagliata'], 'beef top sirloin steak separable lean only trimmed to 0 fat choice cooked broiled', ['beef', 'top sirloin', 'separable lean only', 'cooked', 'broiled'], { state: 'grigliato', exclude: ['select', 'prime'] }),
  meat(D('Carne', 'Manzo', ['crudo'], 'filetto'), ['manzo', 'filetto', 'filetto di manzo'], 'beef tenderloin steak separable lean only trimmed to 1/8 fat all grades raw', ['beef', 'tenderloin', 'separable lean only', 'raw'], { ...CRUDO, exclude: ['select', 'prime', 'choice'] }),
  meat(D('Carne', 'Manzo', ['alla griglia'], 'filetto'), ['filetto di manzo', 'manzo', 'filetto cotto', 'filetto alla griglia'], 'beef tenderloin steak separable lean only trimmed to 1/8 fat all grades cooked broiled', ['beef', 'tenderloin', 'separable lean only', 'cooked', 'broiled'], { state: 'grigliato', exclude: ['select', 'prime', 'choice'] }),
  meat(D('Carne', 'Manzo', ['cruda'], 'costata'), ['manzo', 'costata', 'costata di manzo', 'ribeye', 'fiorentina'], 'beef rib eye steak boneless separable lean and fat trimmed to 0 fat choice raw', ['beef', 'rib', 'eye', 'raw'], { ...CRUDO, exclude: ['select', 'prime', 'lean only'] }),
  meat(D('Carne', 'Manzo', ['alla griglia'], 'costata'), ['costata di manzo', 'manzo', 'costata cotta', 'costata alla griglia'], 'beef rib eye steak boneless separable lean and fat trimmed to 0 fat choice cooked grilled', ['beef', 'rib', 'eye', 'cooked', 'grilled'], { state: 'grigliato', exclude: ['select', 'prime', 'lean only'] }),
  meat(D('Carne', 'Manzo', ['crudo'], 'girello'), ['girello di manzo', 'manzo', 'girello', 'magatello', 'fesa di manzo', 'roast beef'], 'beef round eye of round roast separable lean only trimmed to 0 fat select raw', ['beef', 'eye of round', 'separable lean only', 'raw'], CRUDO),
  meat(D('Carne', 'Manzo', ['arrosto'], 'girello'), ['girello di manzo', 'manzo', 'girello cotto', 'arrosto di manzo', 'roast beef cotto'], 'beef round eye of round roast separable lean only trimmed to 0 fat select cooked roasted', ['beef', 'eye of round', 'separable lean only', 'cooked', 'roasted'], { state: 'arrosto' }),
  meat(D('Carne', 'Manzo', ['cruda'], 'spalla'), ['manzo per spezzatino', 'manzo', 'spezzatino', 'cappello del prete', 'reale'], 'beef chuck for stew separable lean and fat choice raw', ['beef', 'chuck', 'raw'], { ...CRUDO, exclude: ['select', 'prime', 'eye', 'tender'] }),
  meat(D('Carne', 'Manzo', ['brasata'], 'spalla'), ['manzo per spezzatino', 'manzo', 'spezzatino cotto', 'brasato', 'stracotto'], 'beef chuck for stew separable lean and fat choice cooked braised', ['beef', 'chuck', 'cooked', 'braised'], { state: 'brasato', exclude: ['select', 'prime', 'eye', 'tender'] }),
  meat(D('Carne', 'Manzo', ['lessata'], 'punta di petto'), ['bollito di manzo', 'manzo', 'bollito', 'lesso', 'punta di petto', 'brisket'], 'beef brisket flat half separable lean only trimmed to 0 fat all grades cooked braised', ['beef', 'brisket', 'flat half', 'separable lean only', 'cooked', 'braised'], { state: 'lessato' }),
  meat(D('Carne', 'Manzo', ['crudo'], 'fegato'), ['fegato', 'fegato di manzo', 'fegato di vitello'], 'beef variety meats and by-products liver raw', ['beef', 'liver', 'raw'], CRUDO),
  meat(D('Carne', 'Manzo', ['in padella'], 'fegato'), ['fegato di manzo', 'fegato cotto', 'fegato alla veneziana'], 'beef variety meats and by-products liver cooked pan-fried', ['beef', 'liver', 'cooked', 'pan-fried'], { state: 'in padella' }),
  meat(D('Carne', 'Vitello', ['cruda'], 'fesa'), ['vitello', 'fettina di vitello', 'scaloppina', 'noce di vitello'], 'veal leg top round separable lean only raw', ['veal', 'leg', 'separable lean only', 'raw'], { ...CRUDO, portions: [p('1 fettina', 100)] }),
  meat(D('Carne', 'Vitello', ['in padella'], 'fesa'), ['fettina di vitello', 'vitello', 'scaloppine', 'vitello cotto', 'fettina di vitello cotta'], 'veal leg top round separable lean only cooked pan-fried not breaded', ['veal', 'leg', 'separable lean only', 'pan-fried', 'not breaded'], { state: 'in padella' }),
  meat(D('Carne', 'Vitello', ['arrosto'], 'fesa'), ['vitello', 'arrosto di vitello', 'vitello arrosto'], 'veal leg top round separable lean only cooked roasted', ['veal', 'leg', 'separable lean only', 'cooked', 'roasted'], { state: 'arrosto' }),
  meat(D('Carne', 'Vitello', ['crudo'], 'macinato'), ['vitello', 'macinato di vitello'], 'veal ground raw', ['veal', 'ground', 'raw'], CRUDO),

  // ---------------------------------------------------------------- Carne: maiale
  meat(D('Carne', 'Maiale', ['cruda'], 'lonza'), ['maiale', 'lonza', 'lonza di maiale', 'braciola di maiale', 'carré di maiale'], 'pork fresh loin center loin chops bone-in separable lean only raw', ['pork', 'fresh', 'loin', 'center loin', 'separable lean only', 'raw'], { ...CRUDO, portions: [p('1 braciola (senza osso)', 150)] }),
  meat(D('Carne', 'Maiale', ['alla griglia'], 'lonza'), ['lonza di maiale', 'maiale', 'lonza cotta', 'braciola di maiale cotta', 'braciola ai ferri'], 'pork fresh loin center loin chops bone-in separable lean only cooked broiled', ['pork', 'fresh', 'loin', 'center loin', 'separable lean only', 'cooked', 'broiled'], { state: 'grigliato' }),
  meat(D('Carne', 'Maiale', ['crudo'], 'filetto'), ['maiale', 'filetto di maiale', 'filettino'], 'pork fresh loin tenderloin separable lean only raw', ['pork', 'fresh', 'tenderloin', 'separable lean only', 'raw'], CRUDO),
  meat(D('Carne', 'Maiale', ['arrosto'], 'filetto'), ['filetto di maiale', 'maiale', 'filetto di maiale cotto', 'arista', 'arrosto di maiale'], 'pork fresh loin tenderloin separable lean only cooked roasted', ['pork', 'fresh', 'tenderloin', 'separable lean only', 'cooked', 'roasted'], { state: 'arrosto' }),
  meat(D('Carne', 'Maiale', ['crudo'], 'macinato'), ['maiale', 'macinato di maiale', 'maiale macinato'], 'pork fresh ground raw', ['pork', 'fresh', 'ground', 'raw'], CRUDO),
  meat(D('Carne', 'Maiale', ['cotto'], 'macinato'), ['macinato di maiale', 'maiale', 'macinato di maiale cotto'], 'pork fresh ground cooked', ['pork', 'fresh', 'ground', 'cooked'], { state: 'cotto' }),
  meat(D('Carne', 'Maiale', ['crude'], 'costine'), ['maiale', 'costine', 'costine di maiale', 'puntine', 'spuntature'], 'pork fresh spareribs separable lean and fat raw', ['pork', 'fresh', 'spareribs', 'raw'], CRUDO),
  meat(D('Carne', 'Maiale', ['brasate'], 'costine'), ['costine di maiale', 'maiale', 'costine cotte', 'costine al forno'], 'pork fresh spareribs separable lean and fat cooked braised', ['pork', 'fresh', 'spareribs', 'cooked', 'braised'], { state: 'brasato' }),
  meat(D('Carne', 'Maiale', ['fresca'], 'salsiccia'), ['salsiccia', 'salsicce', 'salsiccia di maiale', 'salsiccia fresca', 'luganega', 'salamella'], 'sausage italian pork mild raw', ['sausage', 'italian', 'pork', 'raw'], { ...CRUDO, exclude: ['turkey', 'chicken', 'beef', 'hot'], portions: [p('1 salsiccia', 80)] }),
  meat(D('Carne', 'Maiale', ['cotta'], 'salsiccia'), ['salsiccia di maiale', 'salsiccia', 'salsicce', 'salsiccia cotta', 'salsiccia alla griglia', 'salamella cotta'], 'sausage italian pork mild cooked', ['sausage', 'italian', 'pork', 'cooked'], { state: 'cotto', exclude: ['turkey', 'chicken', 'beef', 'hot'], portions: [p('1 salsiccia cotta', 65)] }),
  meat(D('Carne', 'Maiale', ["all'americana", 'fresca'], 'salsiccia'), ['salsiccia', 'salsicce', 'salsiccia di maiale'], 'pork sausage fresh raw', ['pork sausage', 'fresh', 'raw'], { ...CRUDO, exclude: ['turkey', 'chicken', 'beef', 'italian'] }),
  meat(D('Carne', 'Maiale', ["all'americana", 'cotta'], 'salsiccia'), ['salsiccia di maiale', 'salsiccia', 'salsicce', 'salsiccia cotta'], 'pork sausage fresh cooked', ['pork sausage', 'fresh', 'cooked'], { state: 'cotto', exclude: ['turkey', 'chicken', 'beef', 'italian'] }),
  meat(D('Carne', 'Tacchino', ['cotta'], 'salsiccia'), ['salsiccia', 'salsiccia di tacchino', 'salsiccia di pollo'], 'sausage turkey fresh cooked', ['sausage', 'turkey', 'cooked'], { state: 'cotto', exclude: ['smoked', 'pork'] }),

  // ---------------------------------------------------------------- Carne: agnello, coniglio e altre
  meat(D('Carne', 'Agnello', ['crudo'], 'cosciotto'), ['agnello', 'cosciotto di agnello', 'abbacchio'], 'lamb domestic leg whole shank and sirloin separable lean only trimmed to 1/4 fat choice raw', ['lamb', 'leg', 'whole', 'separable lean only', 'raw'], { ...CRUDO, exclude: ['new zealand', 'australian'] }),
  meat(D('Carne', 'Agnello', ['arrosto'], 'cosciotto'), ['cosciotto di agnello', 'agnello', 'agnello arrosto', 'abbacchio al forno'], 'lamb domestic leg whole shank and sirloin separable lean only trimmed to 1/4 fat choice cooked roasted', ['lamb', 'leg', 'whole', 'separable lean only', 'cooked', 'roasted'], { state: 'arrosto', exclude: ['new zealand', 'australian'] }),
  meat(D('Carne', 'Agnello', ['crude'], 'costolette'), ['agnello', 'costolette di agnello', 'scottadito', 'costolette d agnello'], 'lamb domestic loin separable lean and fat trimmed to 1/4 fat choice raw', ['lamb', 'loin', 'raw'], { ...CRUDO, exclude: ['new zealand', 'australian', 'lean only'] }),
  meat(D('Carne', 'Agnello', ['alla griglia'], 'costolette'), ['costolette d agnello', 'agnello', 'scottadito cotte', 'costolette di agnello alla griglia'], 'lamb domestic loin separable lean and fat trimmed to 1/4 fat choice cooked broiled', ['lamb', 'loin', 'cooked', 'broiled'], { state: 'grigliato', exclude: ['new zealand', 'australian', 'lean only'] }),
  meat(D('Carne', 'Coniglio', ['crudo']), ['coniglio'], 'game meat rabbit domesticated composite of cuts raw', ['rabbit', 'domesticated', 'raw'], CRUDO),
  meat(D('Carne', 'Coniglio', ['arrosto']), ['coniglio', 'coniglio arrosto', 'coniglio cotto'], 'game meat rabbit domesticated composite of cuts cooked roasted', ['rabbit', 'domesticated', 'cooked', 'roasted'], { state: 'arrosto' }),
  meat(D('Carne', 'Cavallo', ['crudo']), ['cavallo', 'carne di cavallo', 'equina'], 'game meat horse raw', ['horse', 'raw'], CRUDO),
  meat(D('Carne', 'Cavallo', ['arrosto']), ['carne di cavallo', 'cavallo', 'cavallo cotto'], 'game meat horse cooked roasted', ['horse', 'cooked', 'roasted'], { state: 'arrosto' }),
  meat(D('Carne', 'Anatra', ['senza pelle', 'cruda']), ['anatra', 'petto d anatra'], 'duck domesticated meat only raw', ['duck', 'domesticated', 'meat only', 'raw'], CRUDO),
  meat(D('Carne', 'Anatra', ['senza pelle', 'arrosto']), ['anatra', 'anatra arrosto'], 'duck domesticated meat only cooked roasted', ['duck', 'domesticated', 'meat only', 'cooked', 'roasted'], { state: 'arrosto' }),
  meat(D('Carne', 'Cinghiale', ['crudo']), ['cinghiale'], 'game meat boar wild raw', ['boar', 'wild', 'raw'], CRUDO),
  meat(D('Carne', 'Cervo', ['crudo']), ['cervo', 'capriolo', 'selvaggina'], 'game meat deer raw', ['deer', 'raw'], CRUDO),

  // ---------------------------------------------------------------- Salumi
  cured(X('Salumi', 'Prosciutto cotto'), ['prosciutto cotto', 'cotto', 'prosciutto'], 'ham sliced regular approximately 11% fat', ['ham', 'sliced', 'regular'], { exclude: ['turkey', 'chicken', 'honey', 'smoked'], portions: [p('1 fetta', 20), p('1 porzione', 50)] }),
  cured(X('Salumi', 'Prosciutto crudo'), ['prosciutto crudo', 'crudo', 'prosciutto', 'prosciutto di parma', 'san daniele'], 'prosciutto', ['prosciutto'], { portions: [p('1 fetta', 15), p('1 porzione', 50)] }),
  cured(X('Salumi', 'Bresaola'), ['bresaola'], 'beef cured dried', ['beef', 'cured', 'dried'], { exclude: ['corned', 'smoked'], portions: [p('1 porzione', 50)] }),
  cured(X('Salumi', 'Salame'), ['salame', 'salami', 'salame milano', 'salame ungherese'], 'salami dry or hard pork', ['salami', 'dry or hard', 'pork'], { exclude: ['beef', 'turkey'], portions: [p('1 fetta', 10)] }),
  cured(X('Salumi', 'Salame', ['italiano']), ['salame', 'salame italiano', 'salame genovese'], 'salami italian pork', ['salami', 'italian', 'pork'], { portions: [p('1 fetta', 10)] }),
  cured(X('Salumi', 'Mortadella'), ['mortadella'], 'mortadella beef pork', ['mortadella'], { portions: [p('1 fetta', 15)] }),
  cured(X('Salumi', 'Pancetta', ['cruda']), ['pancetta', 'bacon', 'guanciale', 'pancetta affumicata'], 'pork cured bacon unprepared', ['pork', 'cured', 'bacon', 'unprepared'], { exclude: ['canadian', 'reduced', 'low sodium', 'microwave'] }),
  cured(X('Salumi', 'Pancetta', ['rosolata']), ['pancetta', 'pancetta cotta', 'bacon cotto', 'pancetta croccante'], 'pork cured bacon cooked pan-fried', ['pork', 'cured', 'bacon', 'pan-fried'], { state: 'in padella', exclude: ['canadian', 'reduced', 'low sodium', 'microwave'] }),
  cured(X('Salumi', 'Würstel'), ['wurstel', 'würstel', 'hot dog', 'frankfurter'], 'frankfurter beef and pork', ['frankfurter', 'beef and pork'], { exclude: ['low fat', 'reduced', 'chicken', 'turkey'], portions: [p('1 würstel', 50)] }),
  cured(X('Salumi', 'Würstel', ['di pollo']), ['wurstel di pollo', 'würstel di pollo', 'wurstel di tacchino'], 'frankfurter chicken', ['frankfurter', 'chicken'], { portions: [p('1 würstel', 50)] }),
  cured(X('Salumi', 'Fesa di tacchino', ['affettata']), ['fesa di tacchino affettata', 'fesa di tacchino', 'tacchino affettato', 'petto di tacchino affettato'], 'turkey breast sliced oven roasted luncheon meat', ['turkey', 'breast', 'sliced'], { exclude: ['smoked', 'honey'] }),

  // ---------------------------------------------------------------- Pesce e frutti di mare
  fish(D('Pesce', 'Salmone', ["d'allevamento", 'crudo']), ['salmone d allevamento', 'salmone', 'salmone fresco', 'trancio di salmone', 'filetto di salmone'], 'fish salmon atlantic farmed raw', ['salmon', 'atlantic', 'farmed', 'raw'], { ...CRUDO, portions: [p('1 trancio', 150)] }),
  fish(D('Pesce', 'Salmone', ["d'allevamento", 'cotto']), ['salmone d allevamento', 'salmone', 'salmone cotto', 'salmone al forno', 'salmone alla griglia'], 'fish salmon atlantic farmed cooked dry heat', ['salmon', 'atlantic', 'farmed', 'cooked', 'dry heat'], { state: 'cotto' }),
  fish(D('Pesce', 'Salmone', ['affumicato']), ['salmone', 'salmone affumicato'], 'fish salmon chinook smoked', ['salmon', 'smoked'], { exclude: ['lox', 'canned'], portions: [p('1 confezione', 100)] }),
  fish(D('Pesce', 'Tonno', ['fresco', 'crudo']), ['tonno', 'tonno fresco', 'trancio di tonno'], 'fish tuna fresh yellowfin raw', ['tuna', 'fresh', 'yellowfin', 'raw'], { ...CRUDO, portions: [p('1 trancio', 150)] }),
  fish(D('Pesce', 'Tonno', ['fresco', 'cotto']), ['tonno fresco', 'tonno', 'tonno cotto', 'tonno alla griglia'], 'fish tuna fresh yellowfin cooked dry heat', ['tuna', 'yellowfin', 'cooked', 'dry heat'], { state: 'cotto' }),
  fish(D('Pesce', 'Tonno', ["sott'olio", 'sgocciolato']), ['tonno in scatola sott olio', 'tonno', 'tonno in scatola', 'tonno sott olio', 'scatoletta di tonno'], 'fish tuna light canned in oil drained solids', ['tuna', 'light', 'canned in oil', 'drained solids'], { state: 'in scatola', exclude: ['without salt'], portions: [p('1 scatoletta sgocciolata', 52), p('1 scatoletta grande sgocciolata', 112)] }),
  fish(D('Pesce', 'Tonno', ['al naturale', 'sgocciolato']), ['tonno al naturale', 'tonno in acqua'], 'fish tuna light canned in water drained solids', ['tuna', 'light', 'canned in water', 'drained solids'], { state: 'in scatola', exclude: ['without salt'] }),
  fish(D('Pesce', 'Merluzzo', ['crudo']), ['merluzzo', 'filetto di merluzzo', 'nasello', 'pesce bianco'], 'fish cod atlantic raw', ['cod', 'atlantic', 'raw'], { ...CRUDO, portions: [p('1 filetto', 150)] }),
  fish(D('Pesce', 'Merluzzo', ['cotto']), ['merluzzo', 'merluzzo cotto', 'nasello cotto'], 'fish cod atlantic cooked dry heat', ['cod', 'atlantic', 'cooked', 'dry heat'], { state: 'cotto' }),
  fish(D('Pesce', 'Baccalà', ['salato', 'secco']), ['baccalà', 'baccala', 'stoccafisso'], 'fish cod atlantic dried and salted', ['cod', 'atlantic', 'dried and salted'], { state: 'secco' }),
  fish(D('Pesce', 'Branzino', ['crudo']), ['branzino', 'spigola'], 'fish sea bass mixed species raw', ['sea bass', 'raw'], CRUDO),
  fish(D('Pesce', 'Branzino', ['cotto']), ['branzino', 'branzino al forno', 'spigola cotta'], 'fish sea bass mixed species cooked dry heat', ['sea bass', 'cooked', 'dry heat'], { state: 'cotto' }),
  fish(D('Pesce', 'Orata', ['cruda']), ['orata', 'dentice', 'pagro'], 'fish sea bream raw', ['sea bream', 'raw'], CRUDO),
  fish(D('Pesce', 'Sgombro', ['crudo']), ['sgombro', 'maccarello'], 'fish mackerel atlantic raw', ['mackerel', 'atlantic', 'raw'], CRUDO),
  fish(D('Pesce', 'Sgombro', ['cotto']), ['sgombro', 'sgombro cotto'], 'fish mackerel atlantic cooked dry heat', ['mackerel', 'atlantic', 'cooked', 'dry heat'], { state: 'cotto' }),
  fish(D('Pesce', 'Sardina', ["sott'olio", 'sgocciolata']), ['sardine sott olio', 'sardine', 'sardina', 'sarde'], 'fish sardine atlantic canned in oil drained solids with bone', ['sardine', 'atlantic', 'canned in oil', 'drained'], { state: 'in scatola' }),
  fish(D('Pesce', 'Alice', ['fresca', 'cruda']), ['alici fresche', 'alici', 'acciughe', 'alice', 'acciuga'], 'fish anchovy european raw', ['anchovy', 'european', 'raw'], CRUDO),
  fish(D('Pesce', 'Acciuga', ["sott'olio"]), ['acciughe sott olio', 'filetti di acciuga'], 'fish anchovy european canned in oil drained solids', ['anchovy', 'european', 'canned in oil'], { state: 'in scatola' }),
  fish(D('Pesce', 'Trota', ['cruda']), ['trota', 'trota salmonata'], 'fish trout rainbow farmed raw', ['trout', 'rainbow', 'farmed', 'raw'], CRUDO),
  fish(D('Pesce', 'Trota', ['cotta']), ['trota', 'trota cotta'], 'fish trout rainbow farmed cooked dry heat', ['trout', 'rainbow', 'farmed', 'cooked', 'dry heat'], { state: 'cotto' }),
  fish(D('Pesce', 'Pesce spada', ['crudo']), ['pesce spada', 'spada'], 'fish swordfish raw', ['swordfish', 'raw'], CRUDO),
  fish(D('Pesce', 'Pesce spada', ['cotto']), ['pesce spada', 'pesce spada alla griglia'], 'fish swordfish cooked dry heat', ['swordfish', 'cooked', 'dry heat'], { state: 'cotto' }),
  fish(D('Pesce', 'Sogliola', ['cruda']), ['sogliola o platessa', 'sogliola', 'platessa', 'rombo', 'passera'], 'fish flatfish flounder and sole species raw', ['flatfish', 'raw'], CRUDO),
  fish(D('Pesce', 'Sogliola', ['cotta']), ['sogliola o platessa', 'sogliola', 'platessa cotta', 'sogliola cotta'], 'fish flatfish flounder and sole species cooked dry heat', ['flatfish', 'cooked', 'dry heat'], { state: 'cotto' }),
  fish(D('Pesce', 'Tilapia', ['cruda']), ['tilapia'], 'fish tilapia raw', ['tilapia', 'raw'], CRUDO),
  fish(D('Pesce', 'Tilapia', ['cotta']), ['tilapia', 'tilapia cotta'], 'fish tilapia cooked dry heat', ['tilapia', 'cooked', 'dry heat'], { state: 'cotto' }),
  fish(D('Pesce', 'Gambero', ['crudo']), ['gamberi', 'gamberetti', 'gamberoni', 'mazzancolle', 'scampi'], 'crustaceans shrimp raw', ['shrimp', 'raw'], { ...CRUDO, exclude: ['imitation', 'canned'] }),
  fish(D('Pesce', 'Gambero', ['cotto']), ['gamberi', 'gamberetti cotti', 'gamberi cotti'], 'crustaceans shrimp cooked', ['shrimp', 'cooked'], { state: 'cotto', exclude: ['imitation', 'canned', 'breaded', 'fried'] }),
  fish(D('Pesce', 'Calamaro', ['crudo']), ['calamari', 'calamaro', 'totani', 'seppia', 'seppie'], 'mollusks squid mixed species raw', ['squid', 'raw'], CRUDO),
  fish(D('Pesce', 'Calamaro', ['fritto']), ['calamari', 'calamari fritti', 'frittura di calamari'], 'mollusks squid mixed species cooked fried', ['squid', 'fried'], { state: 'fritto' }),
  fish(D('Pesce', 'Polpo', ['crudo']), ['polpo', 'polipo', 'moscardini'], 'mollusks octopus common raw', ['octopus', 'raw'], CRUDO),
  fish(D('Pesce', 'Polpo', ['lessato']), ['polpo', 'polpo lesso', 'polpo cotto'], 'mollusks octopus common cooked moist heat', ['octopus', 'cooked', 'moist heat'], { state: 'lessato' }),
  fish(D('Pesce', 'Cozza', ['cruda']), ['cozze', 'cozza', 'mitili'], 'mollusks mussel blue raw', ['mussel', 'blue', 'raw'], CRUDO),
  fish(D('Pesce', 'Cozza', ['cotta']), ['cozze', 'cozze cotte', 'impepata di cozze'], 'mollusks mussel blue cooked moist heat', ['mussel', 'blue', 'cooked', 'moist heat'], { state: 'cotto' }),
  fish(D('Pesce', 'Vongola', ['cruda']), ['vongole', 'vongola', 'lupini di mare'], 'mollusks clam mixed species raw', ['clam', 'mixed species', 'raw'], CRUDO),
  fish(D('Pesce', 'Vongola', ['cotta']), ['vongole', 'vongole cotte'], 'mollusks clam mixed species cooked moist heat', ['clam', 'mixed species', 'cooked', 'moist heat'], { state: 'cotto' }),
  fish(D('Pesce', 'Aragosta', ['cotta']), ['aragosta', 'astice'], 'crustaceans lobster northern cooked moist heat', ['lobster', 'cooked'], { state: 'cotto' }),
  fish(D('Pesce', 'Granchio', ['cotto']), ['granchio', 'polpa di granchio'], 'crustaceans crab blue cooked moist heat', ['crab', 'blue', 'cooked'], { state: 'cotto', exclude: ['canned', 'imitation'] }),

  // ---------------------------------------------------------------- Uova
  egg(D('Uova', 'Uovo', ['intero', 'crudo']), ['uovo', 'uova', 'uovo intero', 'uovo crudo'], 'egg whole raw fresh', ['egg', 'whole', 'raw', 'fresh'], { ...CRUDO, portions: [p('1 uovo medio (senza guscio)', 50), p('1 uovo grande (senza guscio)', 60)] }),
  egg(D('Uova', 'Uovo', ['sodo']), ['uovo', 'uova', 'uovo sodo', 'uova sode', 'uovo bollito'], 'egg whole cooked hard-boiled', ['egg', 'whole', 'hard-boiled'], { state: 'lessato', portions: [p('1 uovo medio', 50)] }),
  egg(D('Uova', 'Uovo', ['in camicia']), ['uovo alla coque o in camicia', 'uovo', 'uovo alla coque', 'uovo in camicia', 'uovo affogato'], 'egg whole cooked poached', ['egg', 'whole', 'poached'], { state: 'cotto', portions: [p('1 uovo medio', 50)] }),
  egg(D('Uova', 'Uovo', ['fritto']), ['uovo', 'uova', 'uovo fritto', 'uovo al tegamino', 'uovo all occhio di bue'], 'egg whole cooked fried', ['egg', 'whole', 'fried'], { state: 'fritto', portions: [p('1 uovo medio', 46)] }),
  egg(D('Uova', 'Uovo', ['strapazzato']), ['uova', 'uova strapazzate', 'frittata'], 'egg whole cooked scrambled', ['egg', 'whole', 'scrambled'], { state: 'in padella', portions: [p('2 uova', 120)] }),
  egg(D('Uova', 'Uovo', ['crudo'], 'albume'), ['albume d uovo', 'albume', 'albumi', 'bianco d uovo', 'chiara d uovo'], 'egg white raw fresh', ['egg', 'white', 'raw', 'fresh'], { ...CRUDO, portions: [p('1 albume', 33)] }),
  egg(D('Uova', 'Uovo', ['crudo'], 'tuorlo'), ['tuorlo d uovo', 'tuorlo', 'tuorli', 'rosso d uovo'], 'egg yolk raw fresh', ['egg', 'yolk', 'raw', 'fresh'], { ...CRUDO, portions: [p('1 tuorlo', 17)] }),

  // ---------------------------------------------------------------- Latte e latticini
  dairy(D('Latticini', 'Latte', ['intero']), ['latte', 'latte intero', 'latte fresco'], 'milk whole 3.25% milkfat with added vitamin d', ['milk', 'whole', '3.25%'], { exclude: ['dry', 'canned', 'chocolate', 'goat', 'human', 'buttermilk'], portions: [p('1 tazza', 250), p('1 bicchiere', 200)] }),
  dairy(D('Latticini', 'Latte', ['parzialmente scremato']), ['latte', 'latte parzialmente scremato', 'latte ps'], 'milk lowfat fluid 1% milkfat with added vitamin a and vitamin d', ['milk', 'lowfat', 'fluid', '1%'], { exclude: ['dry', 'chocolate', 'buttermilk', 'protein fortified'], portions: [p('1 tazza', 250), p('1 bicchiere', 200)] }),
  dairy(D('Latticini', 'Latte', ['scremato']), ['latte scremato', 'latte magro'], 'milk nonfat fluid with added vitamin a and vitamin d fat free or skim', ['milk', 'nonfat', 'fluid'], { exclude: ['dry', 'chocolate', 'buttermilk', 'protein fortified', 'calcium fortified'], portions: [p('1 tazza', 250)] }),
  dairy(D('Latticini', 'Latte', ['di capra']), ['latte di capra'], 'milk goat fluid with added vitamin d', ['milk', 'goat'], { portions: [p('1 bicchiere', 200)] }),
  dairy(D('Latticini', 'Yogurt', ['bianco', 'intero']), ['yogurt bianco intero', 'yogurt', 'yogurt bianco', 'yogurt intero'], 'yogurt plain whole milk', ['yogurt', 'plain', 'whole milk'], { exclude: ['greek', 'fruit', 'vanilla'], portions: [p('1 vasetto', 125)] }),
  dairy(D('Latticini', 'Yogurt', ['bianco', 'magro']), ['yogurt magro', 'yogurt bianco magro'], 'yogurt plain low fat', ['yogurt', 'plain', 'low fat'], { exclude: ['greek', 'fruit', 'vanilla', 'skim'], portions: [p('1 vasetto', 125)] }),
  dairy(D('Latticini', 'Yogurt', ['greco', 'intero']), ['yogurt greco', 'yogurt greco intero'], 'yogurt greek plain whole milk', ['yogurt', 'greek', 'plain', 'whole milk'], { exclude: ['fruit', 'vanilla'], portions: [p('1 vasetto', 150)] }),
  dairy(D('Latticini', 'Yogurt', ['greco', 'magro 0%']), ['yogurt greco', 'yogurt greco 0', 'yogurt greco magro', 'skyr'], 'yogurt greek plain nonfat', ['yogurt', 'greek', 'plain', 'nonfat'], { exclude: ['fruit', 'vanilla'], portions: [p('1 vasetto', 150)] }),
  dairy(D('Latticini', 'Kefir'), ['kefir'], 'kefir lowfat plain', ['kefir', 'plain'], { portions: [p('1 bicchiere', 200)] }),
  dairy(D('Latticini', 'Mozzarella'), ['mozzarella', 'fior di latte', 'mozzarella vaccina'], 'cheese mozzarella whole milk', ['cheese', 'mozzarella', 'whole milk'], { exclude: ['low moisture', 'part skim', 'nonfat', 'substitute'], portions: [p('1 mozzarella', 125), p('1 porzione', 100)] }),
  dairy(D('Latticini', 'Mozzarella', ['light']), ['mozzarella light', 'mozzarella magra'], 'cheese mozzarella part skim milk', ['cheese', 'mozzarella', 'part skim'], { exclude: ['low moisture'], portions: [p('1 mozzarella', 125)] }),
  dairy(D('Latticini', 'Parmigiano'), ['parmigiano', 'parmigiano reggiano', 'grana', 'grana padano', 'formaggio grattugiato'], 'cheese parmesan hard', ['cheese', 'parmesan', 'hard'], { exclude: ['low sodium', 'grated'], portions: [p('1 cucchiaio grattugiato', 10), p('1 scaglia', 15)] }),
  dairy(D('Latticini', 'Pecorino'), ['pecorino', 'pecorino romano', 'pecorino sardo'], 'cheese romano', ['cheese', 'romano'], { portions: [p('1 cucchiaio grattugiato', 10)] }),
  dairy(D('Latticini', 'Ricotta', ['vaccina', 'intera']), ['ricotta vaccina intera', 'ricotta', 'ricotta vaccina'], 'cheese ricotta whole milk', ['cheese', 'ricotta', 'whole milk'], { portions: [p('1 porzione', 100)] }),
  dairy(D('Latticini', 'Ricotta', ['parzialmente scremata']), ['ricotta light', 'ricotta magra', 'ricotta parzialmente scremata'], 'cheese ricotta part skim milk', ['cheese', 'ricotta', 'part skim'], { portions: [p('1 porzione', 100)] }),
  dairy(D('Latticini', 'Mascarpone'), ['mascarpone'], 'cheese mascarpone', ['mascarpone']),
  dairy(D('Latticini', 'Gorgonzola'), ['gorgonzola', 'erborinato', 'formaggio blu'], 'cheese blue', ['cheese', 'blue'], { exclude: ['dressing'] }),
  dairy(D('Latticini', 'Feta'), ['feta'], 'cheese feta', ['cheese', 'feta']),
  dairy(D('Latticini', 'Provolone'), ['provolone'], 'cheese provolone', ['cheese', 'provolone'], { exclude: ['reduced fat'] }),
  dairy(D('Latticini', 'Emmental'), ['emmental', 'emmentaler', 'groviera', 'formaggio svizzero'], 'cheese swiss', ['cheese', 'swiss'], { exclude: ['low fat', 'low sodium', 'pasteurized process', 'processed'] }),
  dairy(D('Latticini', 'Fontina'), ['fontina', 'asiago', 'taleggio'], 'cheese fontina', ['cheese', 'fontina']),
  dairy(D('Latticini', 'Gruviera'), ['gruviera', 'gruyere'], 'cheese gruyere', ['cheese', 'gruyere']),
  dairy(D('Latticini', 'Cheddar'), ['cheddar'], 'cheese cheddar', ['cheese', 'cheddar'], { exclude: ['reduced', 'low', 'nonfat', 'sharp, sliced'] }),
  dairy(D('Latticini', 'Formaggio spalmabile'), ['formaggio spalmabile', 'philadelphia', 'robiola', 'crescenza', 'stracchino'], 'cheese cream', ['cheese', 'cream'], { exclude: ['low fat', 'fat free', 'whipped', 'cheesecake'] }),
  dairy(D('Latticini', 'Formaggio di capra', ['morbido']), ['formaggio di capra morbido', 'caprino', 'formaggio di capra'], 'cheese goat soft type', ['cheese', 'goat', 'soft type']),
  dairy(D('Latticini', 'Fiocchi di latte'), ['fiocchi di latte', 'cottage cheese', 'cottage'], 'cheese cottage lowfat 2% milkfat', ['cheese', 'cottage', 'lowfat', '2%'], { exclude: ['with fruit', 'lactose', 'no sodium'], portions: [p('1 vasetto', 150)] }),
  dairy(D('Latticini', 'Burro'), ['burro'], 'butter without salt', ['butter', 'without salt'], { exclude: ['whipped', 'oil', 'light'], portions: [p('1 noce di burro', 10), p('1 cucchiaino', 5)] }),
  dairy(D('Latticini', 'Burro', ['salato']), ['burro salato'], 'butter salted', ['butter', 'salted'], { exclude: ['whipped', 'unsalted', 'light'] }),
  dairy(D('Latticini', 'Panna', ['da montare']), ['panna', 'panna fresca', 'panna da montare'], 'cream fluid heavy whipping', ['cream', 'heavy whipping'], { portions: [p('1 cucchiaio', 15)] }),
  dairy(D('Latticini', 'Panna', ['da cucina']), ['panna da cucina', 'panna leggera'], 'cream fluid light coffee cream or table cream', ['cream', 'fluid', 'light'], { exclude: ['whipping'], portions: [p('1 confezione', 200)] }),

  // ---------------------------------------------------------------- Oli e grassi
  fat(D('Grassi e oli', "Olio d'oliva"), ['olio extravergine d oliva', 'olio', 'olio d oliva', 'olio di oliva', 'olio extravergine', 'evo'], 'oil olive salad or cooking', ['oil', 'olive'], { portions: [p('1 cucchiaio', 10), p('1 cucchiaino', 5)] }),
  fat(D('Grassi e oli', 'Olio di girasole'), ['olio di semi', 'olio di girasole', 'olio di semi di girasole'], 'oil sunflower linoleic approx 65%', ['oil', 'sunflower'], { portions: [p('1 cucchiaio', 10)] }),
  fat(D('Grassi e oli', 'Olio di mais'), ['olio di mais'], 'oil corn industrial and retail all purpose salad or cooking', ['oil', 'corn'], { portions: [p('1 cucchiaio', 10)] }),
  fat(D('Grassi e oli', 'Olio di arachidi'), ['olio di arachidi', 'olio per friggere'], 'oil peanut salad or cooking', ['oil', 'peanut'], { portions: [p('1 cucchiaio', 10)] }),
  fat(D('Grassi e oli', 'Olio di cocco'), ['olio di cocco'], 'oil coconut', ['oil', 'coconut']),
  fat(D('Grassi e oli', 'Strutto'), ['strutto', 'lardo'], 'lard', ['lard']),
  fat(X('Grassi e oli', 'Margarina'), ['margarina'], 'margarine regular 80% fat composite stick with salt', ['margarine', 'regular', '80% fat'], { exclude: ['liquid'] }),

  // ---------------------------------------------------------------- Frutta secca e semi
  nut(D('Frutta secca', 'Noce'), ['noce', 'noci', 'gherigli di noce'], 'nuts walnuts english', ['walnuts', 'english'], { portions: [p('1 noce (gheriglio)', 5), p('1 manciata', 30)] }),
  nut(D('Frutta secca', 'Mandorla'), ['mandorla', 'mandorle'], 'nuts almonds', ['nuts', 'almonds'], { exclude: ['blanched', 'oil roasted', 'butter', 'paste', 'dry roasted'], portions: [p('1 manciata', 30), p('10 mandorle', 12)] }),
  nut(D('Frutta secca', 'Mandorla', ['tostata']), ['mandorle tostate'], 'nuts almonds dry roasted without salt added', ['almonds', 'dry roasted', 'without salt'], { state: 'tostato', portions: [p('1 manciata', 30)] }),
  nut(D('Frutta secca', 'Nocciola'), ['nocciola', 'nocciole'], 'nuts hazelnuts or filberts', ['hazelnuts or filberts'], { exclude: ['blanched', 'roasted'], portions: [p('1 manciata', 30)] }),
  nut(D('Frutta secca', 'Arachide', ['cruda']), ['arachide', 'arachidi', 'noccioline'], 'peanuts all types raw', ['peanuts', 'all types', 'raw'], { ...CRUDO, portions: [p('1 manciata', 30)] }),
  nut(D('Frutta secca', 'Arachide', ['tostata']), ['arachidi tostate', 'noccioline tostate'], 'peanuts all types dry-roasted without salt', ['peanuts', 'all types', 'dry-roasted', 'without salt'], { state: 'tostato', portions: [p('1 manciata', 30)] }),
  nut(X('Frutta secca', 'Burro di arachidi'), ['burro di arachidi', 'crema di arachidi'], 'peanut butter smooth style without salt', ['peanut butter', 'smooth', 'without salt'], { exclude: ['reduced fat', 'vitamin'], portions: [p('1 cucchiaio', 16)] }),
  nut(D('Frutta secca', 'Pistacchio', ['crudo']), ['pistacchio', 'pistacchi'], 'nuts pistachio nuts raw', ['pistachio', 'raw'], { ...CRUDO, portions: [p('1 manciata', 30)] }),
  nut(D('Frutta secca', 'Pistacchio', ['tostato']), ['pistacchi tostati', 'pistacchi salati'], 'nuts pistachio nuts dry roasted without salt added', ['pistachio', 'dry roasted', 'without salt'], { state: 'tostato', portions: [p('1 manciata', 30)] }),
  nut(D('Frutta secca', 'Anacardo', ['crudo']), ['anacardo', 'anacardi'], 'nuts cashew nuts raw', ['cashew', 'raw'], { ...CRUDO, portions: [p('1 manciata', 30)] }),
  nut(D('Frutta secca', 'Noce di macadamia'), ['macadamia', 'noci di macadamia'], 'nuts macadamia nuts raw', ['macadamia', 'raw'], CRUDO),
  nut(D('Frutta secca', 'Noce del Brasile'), ['noci del brasile', 'noce del brasile'], 'nuts brazilnuts dried unblanched', ['brazilnuts'], {}),
  nut(D('Frutta secca', 'Pinolo'), ['pinolo', 'pinoli'], 'nuts pine nuts dried', ['pine nuts', 'dried'], { portions: [p('1 cucchiaio', 10)] }),
  nut(D('Frutta secca', 'Castagna', ['cruda']), ['castagna', 'castagne', 'marroni'], 'nuts chestnuts european raw peeled', ['chestnuts', 'european', 'raw', 'peeled'], CRUDO),
  nut(D('Frutta secca', 'Castagna', ['arrosto']), ['castagne', 'caldarroste', 'castagne arrosto', 'castagne cotte'], 'nuts chestnuts european roasted', ['chestnuts', 'european', 'roasted'], { state: 'arrosto' }),
  nut(D('Frutta secca', 'Castagna', ['lessata']), ['castagne', 'castagne lesse', 'ballotte', 'castagne bollite'], 'nuts chestnuts european boiled and steamed', ['chestnuts', 'european', 'boiled'], { state: 'lessato' }),
  nut(D('Frutta secca', 'Semi di chia'), ['chia', 'semi di chia'], 'seeds chia seeds dried', ['chia seeds', 'dried'], { portions: [p('1 cucchiaio', 12)] }),
  nut(D('Frutta secca', 'Semi di lino'), ['lino', 'semi di lino'], 'seeds flaxseed', ['flaxseed'], { exclude: ['oil'], portions: [p('1 cucchiaio', 10)] }),
  nut(D('Frutta secca', 'Semi di girasole'), ['semi di girasole'], 'seeds sunflower seed kernels dried', ['sunflower seed kernels', 'dried'], { portions: [p('1 cucchiaio', 10)] }),
  nut(D('Frutta secca', 'Semi di zucca'), ['semi di zucca'], 'seeds pumpkin and squash seed kernels dried', ['pumpkin and squash seed kernels', 'dried'], { portions: [p('1 cucchiaio', 10)] }),
  nut(D('Frutta secca', 'Semi di sesamo'), ['sesamo', 'semi di sesamo'], 'seeds sesame seeds whole dried', ['sesame seeds', 'whole', 'dried'], { portions: [p('1 cucchiaio', 9)] }),
  nut(X('Frutta secca', 'Tahina'), ['tahina', 'tahini', 'crema di sesamo'], 'seeds sesame butter tahini', ['tahini'], {}),

  // ---------------------------------------------------------------- Dolcificanti, bevande, condimenti
  other(X('Dolci', 'Zucchero', ['semolato']), ['zucchero', 'zucchero bianco', 'zucchero semolato'], 'sugars granulated', ['sugars', 'granulated'], { portions: [p('1 cucchiaino', 5), p('1 bustina', 4)] }),
  other(X('Dolci', 'Zucchero di canna'), ['zucchero di canna', 'zucchero grezzo'], 'sugars brown', ['sugars', 'brown'], { portions: [p('1 cucchiaino', 5)] }),
  other(X('Dolci', 'Miele'), ['miele'], 'honey', ['honey'], { exclude: ['roasted', 'mustard', 'loaf', 'ham'], portions: [p('1 cucchiaino', 7), p('1 cucchiaio', 21)] }),
  other(X('Dolci', 'Marmellata'), ['marmellata', 'confettura'], 'jams and preserves', ['jams and preserves'], { exclude: ['dietetic', 'no sugar', 'apricot'], portions: [p('1 cucchiaino', 10)] }),
  other(X('Dolci', 'Cacao', ['amaro', 'in polvere']), ['cacao amaro in polvere', 'cacao', 'cacao amaro'], 'cocoa dry powder unsweetened', ['cocoa', 'dry powder', 'unsweetened'], { exclude: ['processed with alkali'], portions: [p('1 cucchiaio', 5)] }),
  other(X('Dolci', 'Cioccolato fondente', ['70-85%']), ['cioccolato fondente 70-85%', 'cioccolato fondente', 'cioccolato extra fondente', 'cioccolato'], 'chocolate dark 70-85% cacao solids', ['chocolate', 'dark', '70-85%'], { portions: [p('1 quadretto', 5), p('1 tavoletta', 100)] }),
  other(X('Dolci', 'Cioccolato fondente', ['45-59%']), ['cioccolato fondente 45-59%', 'cioccolato fondente', 'cioccolato'], 'chocolate dark 45-59% cacao solids', ['chocolate', 'dark', '45- 59%|45-59%'], { portions: [p('1 quadretto', 5)] }),
  other(X('Dolci', 'Cioccolato al latte'), ['cioccolato al latte', 'cioccolato'], 'candies milk chocolate', ['candies', 'milk chocolate'], { exclude: ['almonds', 'rice cereal', 'coated', 'peanuts'], portions: [p('1 quadretto', 5)] }),
  other(X('Bevande', 'Caffè', ['espresso']), ['caffè espresso', 'caffe', 'espresso', 'caffe espresso', 'tazzina di caffe'], 'beverages coffee brewed espresso restaurant-prepared', ['coffee', 'espresso'], { exclude: ['decaffeinated'], portions: [p('1 tazzina', 30)] }),
  other(X('Bevande', 'Caffè', ['americano']), ['caffè americano / filtro', 'caffe americano', 'caffe filtro', 'caffe lungo'], 'beverages coffee brewed prepared with tap water', ['coffee', 'brewed', 'tap water'], { exclude: ['decaffeinated', 'espresso'], portions: [p('1 tazza', 240)] }),
  other(X('Bevande', 'Tè', ['infuso']), ['tè', 'te', 'te nero', 'infuso', 'tisana'], 'beverages tea black brewed prepared with tap water', ['tea', 'black', 'brewed', 'tap water'], { exclude: ['decaffeinated', 'instant'], portions: [p('1 tazza', 240)] }),
  other(X('Bevande', "Succo d'arancia", ['fresco']), ['succo d arancia fresco', 'spremuta', 'spremuta d arancia', 'succo d arancia'], 'orange juice raw', ['orange juice', 'raw'], { portions: [p('1 bicchiere', 200)] }),
  other(X('Bevande', 'Vino', ['rosso']), ['vino', 'vino rosso'], 'alcoholic beverage wine table red', ['wine', 'table', 'red'], { portions: [p('1 bicchiere', 125)] }),
  other(X('Bevande', 'Vino', ['bianco']), ['vino bianco'], 'alcoholic beverage wine table white', ['wine', 'table', 'white'], { exclude: ['late harvest'], portions: [p('1 bicchiere', 125)] }),
  other(X('Bevande', 'Birra'), ['birra', 'birra chiara'], 'alcoholic beverage beer regular all', ['beer', 'regular', 'all'], { portions: [p('1 lattina', 330), p('1 bottiglia piccola', 330), p('1 pinta', 500)] }),
  other(X('Altro', 'Aceto', ['balsamico']), ['aceto balsamico', 'balsamico'], 'vinegar balsamic', ['vinegar', 'balsamic'], { portions: [p('1 cucchiaio', 16)] }),
  other(X('Altro', 'Aceto', ['di vino']), ['aceto', 'aceto di vino'], 'vinegar red wine', ['vinegar', 'red wine'], { portions: [p('1 cucchiaio', 15)] }),
  other(X('Altro', 'Maionese'), ['maionese'], 'salad dressing mayonnaise regular', ['mayonnaise', 'regular'], { exclude: ['light', 'reduced', 'imitation', 'soybean oil, with salt'], portions: [p('1 cucchiaio', 14)] }),
  other(X('Altro', 'Ketchup'), ['ketchup'], 'catsup', ['catsup'], { exclude: ['low sodium'], portions: [p('1 cucchiaio', 17)] }),
  other(X('Altro', 'Senape'), ['senape', 'mostarda'], 'mustard prepared yellow', ['mustard', 'prepared', 'yellow'], { portions: [p('1 cucchiaino', 5)] }),
  other(X('Altro', 'Pesto', ['alla genovese']), ['pesto', 'pesto alla genovese'], 'sauce pesto ready-to-serve refrigerated', ['pesto'], { portions: [p('1 cucchiaio', 15)] }),
  other(X('Altro', 'Lievito di birra', ['fresco']), ['lievito di birra fresco', 'lievito', 'lievito di birra'], 'leavening agents yeast baker s compressed', ['yeast', 'compressed'], { portions: [p('1 cubetto', 25)] }),
  other(X('Dolci', 'Gelato', ['alla crema']), ['gelato', 'gelato alla crema', 'gelato alla vaniglia'], 'ice creams vanilla', ['ice creams', 'vanilla'], { exclude: ['light', 'rich', 'fat free', 'no sugar', 'reduced'], portions: [p('1 coppetta', 100)] }),
]
