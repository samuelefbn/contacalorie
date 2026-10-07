import { normalize } from '../text'

/**
 * Dizionario italiano → inglese degli alimenti comuni, per interrogare USDA FoodData Central
 * (che è in inglese). Chiavi senza accenti e in minuscolo; le espressioni di più parole
 * hanno la precedenza sulle singole parole.
 */
const IT_EN: Record<string, string> = {
  // Frutta
  mela: 'apple', mele: 'apple', pera: 'pear', pere: 'pear', banana: 'banana', banane: 'banana',
  arancia: 'orange', arance: 'orange', mandarino: 'tangerine', mandarini: 'tangerine', clementina: 'clementine',
  limone: 'lemon', pompelmo: 'grapefruit', fragola: 'strawberries', fragole: 'strawberries',
  ciliegia: 'cherries', ciliegie: 'cherries', uva: 'grapes', pesca: 'peach', pesche: 'peach',
  albicocca: 'apricot', albicocche: 'apricot', prugna: 'plum', prugne: 'plum', susina: 'plum', susine: 'plum',
  kiwi: 'kiwifruit', ananas: 'pineapple', mango: 'mango', melone: 'melon cantaloupe', anguria: 'watermelon',
  cocomero: 'watermelon', fico: 'figs', fichi: 'figs', lampone: 'raspberries', lamponi: 'raspberries',
  mirtillo: 'blueberries', mirtilli: 'blueberries', more: 'blackberries', melograno: 'pomegranate',
  cachi: 'persimmon', avocado: 'avocado', cocco: 'coconut', datteri: 'dates', uvetta: 'raisins',
  'uva passa': 'raisins', 'prugne secche': 'prunes', 'frutta secca': 'nuts',
  // Verdura
  pomodoro: 'tomato', pomodori: 'tomato', 'pomodorini': 'cherry tomatoes', insalata: 'lettuce', lattuga: 'lettuce',
  spinaci: 'spinach', carota: 'carrot', carote: 'carrot', zucchina: 'zucchini', zucchine: 'zucchini',
  melanzana: 'eggplant', melanzane: 'eggplant', peperone: 'sweet pepper', peperoni: 'sweet pepper',
  cipolla: 'onion', cipolle: 'onion', aglio: 'garlic', patata: 'potato', patate: 'potato',
  'patata dolce': 'sweet potato', 'patate dolci': 'sweet potato', 'patate americane': 'sweet potato',
  broccoli: 'broccoli', broccolo: 'broccoli', cavolfiore: 'cauliflower', cavolo: 'cabbage', verza: 'savoy cabbage',
  'cavolo nero': 'kale', 'cavoletti di bruxelles': 'brussels sprouts', sedano: 'celery', finocchio: 'fennel',
  cetriolo: 'cucumber', cetrioli: 'cucumber', asparagi: 'asparagus', carciofo: 'artichoke', carciofi: 'artichoke',
  funghi: 'mushrooms', fungo: 'mushrooms', champignon: 'mushrooms', zucca: 'pumpkin', piselli: 'peas',
  fagiolini: 'green beans', rucola: 'arugula', radicchio: 'radicchio', bietola: 'chard', bietole: 'chard',
  porro: 'leeks', porri: 'leeks', barbabietola: 'beets', barbabietole: 'beets', mais: 'corn', olive: 'olives',
  ravanelli: 'radishes', germogli: 'sprouts', verdure: 'vegetables', verdura: 'vegetables',
  // Legumi e derivati
  fagioli: 'beans', 'fagioli borlotti': 'cranberry beans', 'fagioli neri': 'black beans',
  'fagioli cannellini': 'white beans', 'fagioli rossi': 'kidney beans', ceci: 'chickpeas', lenticchie: 'lentils',
  fave: 'fava beans', soia: 'soybeans', edamame: 'edamame', tofu: 'tofu', hummus: 'hummus', tempeh: 'tempeh',
  // Cereali, pane e pasta
  riso: 'rice', 'riso integrale': 'brown rice', 'riso basmati': 'basmati rice', 'riso bianco': 'white rice',
  pasta: 'pasta', 'pasta integrale': 'whole wheat pasta', spaghetti: 'spaghetti', pane: 'bread',
  'pane integrale': 'whole wheat bread', 'pane bianco': 'white bread', farina: 'flour',
  'farina integrale': 'whole wheat flour', avena: 'oats', 'fiocchi d avena': 'oats', 'fiocchi di avena': 'oats',
  orzo: 'barley', farro: 'spelt', quinoa: 'quinoa', couscous: 'couscous', polenta: 'cornmeal',
  crackers: 'crackers', cracker: 'crackers', 'fette biscottate': 'toast', biscotti: 'cookies',
  cornflakes: 'corn flakes', muesli: 'muesli', 'grano saraceno': 'buckwheat', pizza: 'pizza',
  piadina: 'flatbread', 'pan carre': 'white bread', grissini: 'breadsticks',
  // Carne e salumi
  pollo: 'chicken', 'petto di pollo': 'chicken breast', 'coscia di pollo': 'chicken thigh',
  'sovracoscia di pollo': 'chicken thigh', tacchino: 'turkey', 'petto di tacchino': 'turkey breast',
  manzo: 'beef', 'carne macinata': 'ground beef', macinato: 'ground beef', vitello: 'veal', maiale: 'pork',
  lonza: 'pork loin', agnello: 'lamb', coniglio: 'rabbit', prosciutto: 'ham', 'prosciutto cotto': 'ham',
  'prosciutto crudo': 'prosciutto', bresaola: 'dried beef', salame: 'salami', mortadella: 'bologna',
  wurstel: 'frankfurter', pancetta: 'bacon', salsiccia: 'sausage', bistecca: 'beef steak', hamburger: 'hamburger',
  // Pesce
  pesce: 'fish', salmone: 'salmon', tonno: 'tuna', 'tonno in scatola': 'tuna canned', merluzzo: 'cod',
  baccala: 'cod dried salted', branzino: 'sea bass', spigola: 'sea bass', sgombro: 'mackerel',
  sardina: 'sardines', sardine: 'sardines', acciughe: 'anchovy', alici: 'anchovy', gamberi: 'shrimp',
  gamberetti: 'shrimp', calamari: 'squid', polpo: 'octopus', cozze: 'mussels', vongole: 'clams', trota: 'trout',
  // Latte, latticini e uova
  latte: 'milk', 'latte intero': 'whole milk', 'latte scremato': 'nonfat milk',
  'latte parzialmente scremato': 'reduced fat milk', yogurt: 'yogurt', 'yogurt greco': 'greek yogurt',
  formaggio: 'cheese', mozzarella: 'mozzarella', parmigiano: 'parmesan', grana: 'parmesan', ricotta: 'ricotta',
  mascarpone: 'mascarpone', gorgonzola: 'blue cheese', pecorino: 'romano cheese', feta: 'feta',
  provolone: 'provolone', emmental: 'swiss cheese', 'fiocchi di latte': 'cottage cheese', burro: 'butter',
  panna: 'cream', uovo: 'egg', uova: 'egg', albume: 'egg white', albumi: 'egg white', tuorlo: 'egg yolk',
  kefir: 'kefir',
  // Grassi, frutta a guscio e semi
  olio: 'oil', 'olio d oliva': 'olive oil', 'olio di oliva': 'olive oil', 'olio extravergine': 'olive oil',
  'olio di semi': 'vegetable oil', margarina: 'margarine', noci: 'walnuts', mandorle: 'almonds',
  nocciole: 'hazelnuts', arachidi: 'peanuts', 'burro di arachidi': 'peanut butter', pistacchi: 'pistachio',
  anacardi: 'cashew', 'semi di chia': 'chia seeds', 'semi di lino': 'flaxseed', 'semi di girasole': 'sunflower seeds',
  'semi di zucca': 'pumpkin seeds', pinoli: 'pine nuts', sesamo: 'sesame seeds',
  // Dolci, bevande e condimenti
  zucchero: 'sugar', miele: 'honey', marmellata: 'jam', confettura: 'jam', cioccolato: 'chocolate',
  'cioccolato fondente': 'dark chocolate', 'cioccolato al latte': 'milk chocolate', gelato: 'ice cream',
  torta: 'cake', cornetto: 'croissant', brioche: 'croissant', caffe: 'coffee', te: 'tea',
  'succo d arancia': 'orange juice', succo: 'juice', vino: 'wine', 'vino rosso': 'red wine',
  'vino bianco': 'white wine', birra: 'beer', ketchup: 'ketchup', maionese: 'mayonnaise', senape: 'mustard',
  aceto: 'vinegar', 'salsa di pomodoro': 'tomato sauce', passata: 'tomato puree', pesto: 'pesto',
  patatine: 'potato chips', popcorn: 'popcorn', cacao: 'cocoa', lievito: 'yeast',
  // Modi di preparazione e qualificatori
  crudo: 'raw', cruda: 'raw', crudi: 'raw', crude: 'raw', cotto: 'cooked', cotta: 'cooked', cotti: 'cooked',
  bollito: 'boiled', lesso: 'boiled', griglia: 'grilled', grigliato: 'grilled', fritto: 'fried', fritta: 'fried',
  forno: 'baked', integrale: 'whole wheat', magro: 'lean', intero: 'whole', scremato: 'nonfat', fresco: 'fresh',
  secco: 'dried', secchi: 'dried', surgelato: 'frozen', 'in scatola': 'canned', sciroppato: 'canned in syrup',
}

const STOPWORDS = new Set([
  'di', 'del', 'della', 'dello', 'dei', 'degli', 'delle', 'al', 'alla', 'allo', 'ai', 'agli', 'alle',
  'con', 'e', 'in', 'a', 'da', 'il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'una', 'uno', 'per',
])

const MAX_PHRASE_WORDS = 4

/** Varianti singolare/plurale per le parole non presenti nel dizionario. */
function variants(word: string): string[] {
  const stem = word.slice(0, -1)
  return [`${stem}a`, `${stem}o`, `${stem}e`, `${stem}i`]
}

/** Traduce la query per USDA; `translated` è false se nessuna parola è nel dizionario. */
export function translateToEnglish(query: string): { text: string; translated: boolean } {
  const words = normalize(query)
    .replace(/[’'`]/g, ' ')
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
  const out: string[] = []
  let translated = false
  for (let i = 0; i < words.length; ) {
    let matched = 0
    for (let len = Math.min(MAX_PHRASE_WORDS, words.length - i); len >= 1; len--) {
      const phrase = words.slice(i, i + len).join(' ')
      if (IT_EN[phrase]) {
        out.push(IT_EN[phrase])
        matched = len
        break
      }
    }
    if (matched) {
      translated = true
      i += matched
      continue
    }
    const word = words[i]
    i++
    if (STOPWORDS.has(word)) continue
    const variant = word.length > 3 ? variants(word).find((v) => IT_EN[v]) : undefined
    if (variant) {
      out.push(IT_EN[variant])
      translated = true
    } else {
      out.push(word)
    }
  }
  return { text: out.join(' '), translated }
}

/** Numero di voci del dizionario (usato nei test). */
export const DICTIONARY_SIZE = Object.keys(IT_EN).length
