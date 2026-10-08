import type { DisplayCategory, GenericFoodDisplay } from './display'

/**
 * Traduzione delle descrizioni USDA FoodData Central ("Apples, raw, fuji, with skin")
 * nel formato italiano strutturato ("Frutta - Mela (Fuji, con buccia, cruda)").
 *
 * Regole: la descrizione si divide in token separati da virgola (il testo tra parentesi è ignorato);
 * i primi token identificano l'alimento base, gli altri sono varietà, tagli, stati o altre
 * informazioni. Se anche un solo token non è riconosciuto la voce viene SCARTATA (mai testo
 * inglese nella UI) e conteggiata in `untranslatedReport()` per ampliare i dizionari.
 */

type Gender = 'm' | 'f' | 'mp' | 'fp'
type Kind = 'plant' | 'animal'

interface Base {
  it: string
  g: Gender
  cat: DisplayCategory
  kind?: Kind
  /** Taglio implicito nel nome USDA (es. "Pork sausage" → Maiale, salsiccia). */
  cut?: [string, Gender]
  /** Dettagli impliciti (es. "Beans, kidney, red" → fagiolo rosso). */
  details?: string[]
  processed?: boolean
  /** Voce da non mostrare mai (es. alimenti per l'infanzia). */
  discard?: true
}

const plant = (it: string, g: Gender, cat: DisplayCategory, extra: Partial<Base> = {}): Base => ({ it, g, cat, kind: 'plant', ...extra })
const animal = (it: string, g: Gender, cat: DisplayCategory, extra: Partial<Base> = {}): Base => ({ it, g, cat, kind: 'animal', ...extra })
const proc = (it: string, g: Gender, cat: DisplayCategory, extra: Partial<Base> = {}): Base => ({ it, g, cat, processed: true, ...extra })
const F = 'Frutta', V = 'Verdura', L = 'Legumi', C = 'Cereali e derivati', M = 'Carne', S = 'Salumi', P = 'Pesce'
const U = 'Uova', D = 'Latticini', G = 'Grassi e oli', N = 'Frutta secca', DO = 'Dolci', B = 'Bevande', A = 'Altro'

/** Alimento base, indicizzato dai primi token della descrizione uniti da "|". */
const BASES: Record<string, Base> = {
  // Frutta
  apples: plant('Mela', 'f', F), apple: plant('Mela', 'f', F), pears: plant('Pera', 'f', F), bananas: plant('Banana', 'f', F),
  oranges: plant('Arancia', 'f', F), tangerines: plant('Mandarino', 'm', F), clementines: plant('Clementina', 'f', F),
  lemons: plant('Limone', 'm', F), limes: plant('Lime', 'm', F), grapefruit: plant('Pompelmo', 'm', F),
  strawberries: plant('Fragola', 'f', F), cherries: plant('Ciliegia', 'f', F), grapes: plant('Uva', 'f', F),
  peaches: plant('Pesca', 'f', F), nectarines: plant('Pesca noce', 'f', F), apricots: plant('Albicocca', 'f', F),
  plums: plant('Prugna', 'f', F), kiwifruit: plant('Kiwi', 'm', F), pineapple: plant('Ananas', 'm', F),
  mangos: plant('Mango', 'm', F), papayas: plant('Papaya', 'f', F), 'melons|cantaloupe': plant('Melone', 'm', F, { details: ['cantalupo'] }),
  'melons|honeydew': plant('Melone', 'm', F, { details: ['bianco'] }), watermelon: plant('Anguria', 'f', F), figs: plant('Fico', 'm', F),
  raspberries: plant('Lampone', 'm', F), blueberries: plant('Mirtillo', 'm', F), blackberries: plant('Mora', 'f', F),
  pomegranates: plant('Melograno', 'm', F), persimmons: plant('Caco', 'm', F), avocados: plant('Avocado', 'm', F),
  litchis: plant('Litchi', 'm', F), dates: plant('Dattero', 'm', F), raisins: plant('Uvetta', 'f', F, { details: ['secca'] }),
  cranberries: plant('Mirtillo rosso', 'm', F), 'nuts|coconut meat': plant('Cocco', 'm', F, { details: ['polpa'] }),
  // Frutta trasformata (mostrata solo se cercata esplicitamente)
  'apple juice': proc('Succo di mela', 'm', B), 'orange juice': proc("Succo d'arancia", 'm', B),
  applesauce: proc('Purea di mela', 'f', F), 'fruit butters': proc('Crema di frutta', 'f', DO),
  'jams and preserves': proc('Marmellata', 'f', DO), croissants: proc('Cornetto', 'm', DO), strudel: proc('Strudel', 'm', DO),
  pie: proc('Torta', 'f', DO), 'pie fillings': proc('Ripieno per torte', 'm', DO), cake: proc('Torta', 'f', DO),
  cookies: proc('Biscotto', 'm', DO), babyfood: proc('Omogeneizzato', 'm', A, { discard: true }),
  // Verdura
  tomatoes: plant('Pomodoro', 'm', V), 'tomato products|canned|puree': proc('Passata di pomodoro', 'f', V),
  'tomato products|canned|paste': proc('Concentrato di pomodoro', 'm', V), lettuce: plant('Lattuga', 'f', V),
  arugula: plant('Rucola', 'f', V), radicchio: plant('Radicchio', 'm', V), endive: plant('Indivia', 'f', V),
  'chicory greens': plant('Cicoria', 'f', V), spinach: plant('Spinaci', 'mp', V), carrots: plant('Carota', 'f', V),
  'squash|summer|zucchini': plant('Zucchina', 'f', V), 'squash|winter|butternut': plant('Zucca', 'f', V, { details: ['butternut'] }),
  eggplant: plant('Melanzana', 'f', V), 'peppers|sweet': plant('Peperone', 'm', V), 'peppers|hot chili': plant('Peperoncino', 'm', V),
  onions: plant('Cipolla', 'f', V), 'onions|spring or scallions': plant('Cipollotto', 'm', V), shallots: plant('Scalogno', 'm', V),
  garlic: plant('Aglio', 'm', V), leeks: plant('Porro', 'm', V), potatoes: plant('Patata', 'f', V),
  'sweet potato': plant('Patata dolce', 'f', V), broccoli: plant('Broccolo', 'm', V), 'broccoli raab': plant('Cima di rapa', 'f', V),
  cauliflower: plant('Cavolfiore', 'm', V), cabbage: plant('Cavolo', 'm', V), 'cabbage|savoy': plant('Verza', 'f', V),
  kale: plant('Cavolo nero', 'm', V), 'brussels sprouts': plant('Cavoletto di Bruxelles', 'm', V), celery: plant('Sedano', 'm', V),
  fennel: plant('Finocchio', 'm', V), cucumber: plant('Cetriolo', 'm', V), asparagus: plant('Asparago', 'm', V),
  artichokes: plant('Carciofo', 'm', V), mushrooms: plant('Fungo', 'm', V), pumpkin: plant('Zucca', 'f', V),
  'pumpkin flowers': plant('Fiore di zucca', 'm', V), 'pumpkin|flowers': plant('Fiore di zucca', 'm', V),
  'peas|green': plant('Pisello', 'm', V), 'beans|snap': plant('Fagiolino', 'm', V), 'chard|swiss': plant('Bietola', 'f', V),
  beets: plant('Barbabietola', 'f', V), 'corn|sweet': plant('Mais', 'm', V, { details: ['dolce'] }), olives: plant('Oliva', 'f', V),
  radishes: plant('Ravanello', 'm', V), 'mung beans': plant('Germogli di soia', 'mp', V), parsley: plant('Prezzemolo', 'm', V),
  basil: plant('Basilico', 'm', V), 'sweet potato leaves': plant('Foglie di patata dolce', 'fp', V), 'ginger root': plant('Zenzero', 'm', V),
  // Legumi
  'beans|cranberry': plant('Fagiolo', 'm', L, { details: ['borlotto'] }), 'beans|white': plant('Fagiolo', 'm', L, { details: ['cannellino'] }),
  'beans|kidney': plant('Fagiolo', 'm', L), 'beans|black': plant('Fagiolo', 'm', L, { details: ['nero'] }),
  'beans|pinto': plant('Fagiolo', 'm', L, { details: ['pinto'] }), chickpeas: plant('Cece', 'm', L), lentils: plant('Lenticchia', 'f', L),
  broadbeans: plant('Fava', 'f', L), soybeans: plant('Soia', 'f', L), edamame: plant('Edamame', 'm', L),
  'peas|split': plant('Pisello', 'm', L, { details: ['spezzato'] }), lupins: plant('Lupino', 'm', L), tofu: plant('Tofu', 'm', L),
  tempeh: plant('Tempeh', 'm', L), hummus: proc('Hummus', 'm', L),
  // Cereali e derivati
  rice: plant('Riso', 'm', C), pasta: plant('Pasta', 'f', C), 'noodles|egg': plant('Pasta', 'f', C, { details: ["all'uovo"] }),
  bread: plant('Pane', 'm', C), 'bread|stick': proc('Grissino', 'm', C), 'bread|sticks': proc('Grissino', 'm', C), crackers: proc('Cracker', 'm', C),
  'wheat flour': plant('Farina', 'f', C, { details: ['di frumento'] }), semolina: plant('Semola', 'f', C),
  cornmeal: plant('Farina', 'f', C, { details: ['di mais'] }), oats: plant('Avena', 'f', C), barley: plant('Orzo', 'm', C),
  spelt: plant('Farro', 'm', C), quinoa: plant('Quinoa', 'f', C), couscous: plant('Couscous', 'm', C),
  'buckwheat groats': plant('Grano saraceno', 'm', C), millet: plant('Miglio', 'm', C), bulgur: plant('Bulgur', 'm', C),
  amaranth: plant('Amaranto', 'm', C), 'snacks|popcorn': proc('Popcorn', 'm', C), 'snacks|rice cakes': proc('Galletta di riso', 'f', C),
  'cereals ready-to-eat': proc('Cereali pronti', 'mp', C), 'cereals|quick oats': plant("Fiocchi d'avena", 'mp', C),
  // Carne
  chicken: animal('Pollo', 'm', M), turkey: animal('Tacchino', 'm', M), beef: animal('Manzo', 'm', M), veal: animal('Vitello', 'm', M),
  pork: animal('Maiale', 'm', M), lamb: animal('Agnello', 'm', M), duck: animal('Anatra', 'f', M),
  'game meat|rabbit': animal('Coniglio', 'm', M), 'game meat|horse': animal('Cavallo', 'm', M), 'game meat|boar': animal('Cinghiale', 'm', M),
  'game meat|deer': animal('Cervo', 'm', M),
  sausage: animal('Salsiccia', 'f', S, { processed: true }),
  'pork sausage': animal('Maiale', 'm', M, { cut: ['salsiccia', 'f'], details: ["all'americana"] }),
  'sausage|italian|pork': animal('Maiale', 'm', M, { cut: ['salsiccia', 'f'] }),
  'sausage|turkey': animal('Tacchino', 'm', M, { cut: ['salsiccia', 'f'] }),
  // Salumi
  ham: animal('Prosciutto cotto', 'm', S, { processed: true }), prosciutto: animal('Prosciutto crudo', 'm', S, { processed: true }),
  'turkey breast': animal('Fesa di tacchino', 'f', S, { processed: true }),
  'beef|cured|dried': animal('Bresaola', 'f', S, { processed: true }), salami: animal('Salame', 'm', S, { processed: true }),
  mortadella: animal('Mortadella', 'f', S, { processed: true }), bologna: animal('Mortadella', 'f', S, { processed: true }),
  'pork|cured|bacon': animal('Pancetta', 'f', S, { processed: true }), frankfurter: animal('Würstel', 'm', S, { processed: true }),
  // Pesce
  'fish|salmon': animal('Salmone', 'm', P), 'fish|tuna': animal('Tonno', 'm', P), 'fish|cod': animal('Merluzzo', 'm', P),
  'fish|sea bass': animal('Branzino', 'm', P), 'fish|sea bream': animal('Orata', 'f', P), 'fish|mackerel': animal('Sgombro', 'm', P),
  'fish|sardine': animal('Sardina', 'f', P), 'fish|anchovy': animal('Acciuga', 'f', P), 'fish|trout': animal('Trota', 'f', P),
  'fish|swordfish': animal('Pesce spada', 'm', P), 'fish|flatfish': animal('Sogliola', 'f', P), 'fish|tilapia': animal('Tilapia', 'f', P),
  'fish|haddock': animal('Eglefino', 'm', P), 'fish|halibut': animal('Halibut', 'm', P),
  'crustaceans|shrimp': animal('Gambero', 'm', P), 'crustaceans|lobster': animal('Aragosta', 'f', P), 'crustaceans|crab': animal('Granchio', 'm', P),
  'mollusks|squid': animal('Calamaro', 'm', P), 'mollusks|octopus': animal('Polpo', 'm', P), 'mollusks|mussel': animal('Cozza', 'f', P),
  'mollusks|clam': animal('Vongola', 'f', P), 'mollusks|cuttlefish': animal('Seppia', 'f', P),
  // Uova
  egg: animal('Uovo', 'm', U), 'egg|whole': animal('Uovo', 'm', U, { details: ['intero'] }),
  'egg|white': animal('Uovo', 'm', U, { cut: ['albume', 'm'] }), 'egg|yolk': animal('Uovo', 'm', U, { cut: ['tuorlo', 'm'] }),
  // Latticini
  milk: animal('Latte', 'm', D), yogurt: animal('Yogurt', 'm', D), 'cheese|mozzarella': animal('Mozzarella', 'f', D),
  'cheese|parmesan': animal('Parmigiano', 'm', D), 'cheese|romano': animal('Pecorino', 'm', D), 'cheese|ricotta': animal('Ricotta', 'f', D),
  'cheese|mascarpone': animal('Mascarpone', 'm', D), mascarpone: animal('Mascarpone', 'm', D), 'cheese|blue': animal('Gorgonzola', 'm', D),
  'cheese|feta': animal('Feta', 'f', D), 'cheese|provolone': animal('Provolone', 'm', D), 'cheese|swiss': animal('Emmental', 'm', D),
  'cheese|fontina': animal('Fontina', 'f', D), 'cheese|gruyere': animal('Gruviera', 'm', D), 'cheese|cheddar': animal('Cheddar', 'm', D),
  'cheese|cream': animal('Formaggio spalmabile', 'm', D), 'cheese|goat': animal('Formaggio di capra', 'm', D),
  'cheese|cottage': animal('Fiocchi di latte', 'mp', D), kefir: animal('Kefir', 'm', D), butter: animal('Burro', 'm', D),
  'cream|fluid|heavy whipping': animal('Panna', 'f', D, { details: ['da montare'] }), 'cream|fluid|light': animal('Panna', 'f', D, { details: ['da cucina'] }),
  // Grassi e oli
  'oil|olive': plant("Olio d'oliva", 'm', G), 'oil|sunflower': plant('Olio di girasole', 'm', G), 'oil|corn': plant('Olio di mais', 'm', G),
  'oil|peanut': plant('Olio di arachidi', 'm', G), 'oil|coconut': plant('Olio di cocco', 'm', G), lard: animal('Strutto', 'm', G),
  margarine: proc('Margarina', 'f', G), 'oil|corn|peanut|and olive': plant('Olio', 'm', G, { details: ['=di mais, arachidi e oliva'] }),
  // Frutta secca e semi
  'nuts|walnuts': plant('Noce', 'f', N), 'nuts|almonds': plant('Mandorla', 'f', N), 'nuts|hazelnuts or filberts': plant('Nocciola', 'f', N),
  peanuts: plant('Arachide', 'f', N), 'peanut butter': proc('Burro di arachidi', 'm', N), 'nuts|pistachio nuts': plant('Pistacchio', 'm', N),
  'nuts|cashew nuts': plant('Anacardo', 'm', N), 'nuts|macadamia nuts': plant('Noce di macadamia', 'f', N),
  'nuts|brazilnuts': plant('Noce del Brasile', 'f', N), 'nuts|pine nuts': plant('Pinolo', 'm', N), 'nuts|chestnuts': plant('Castagna', 'f', N),
  'seeds|chia seeds': plant('Semi di chia', 'mp', N), 'seeds|flaxseed': plant('Semi di lino', 'mp', N),
  'seeds|sunflower seed kernels': plant('Semi di girasole', 'mp', N), 'seeds|pumpkin and squash seed kernels': plant('Semi di zucca', 'mp', N),
  'seeds|sesame seeds': plant('Semi di sesamo', 'mp', N), 'seeds|sesame butter': proc('Tahina', 'f', N),
  // Dolci, bevande e altro
  'sugars|granulated': proc('Zucchero', 'm', DO, { details: ['semolato'] }), 'sugars|brown': proc('Zucchero di canna', 'm', DO),
  honey: proc('Miele', 'm', DO), cocoa: proc('Cacao', 'm', DO), 'chocolate|dark': proc('Cioccolato fondente', 'm', DO),
  'candies|milk chocolate': proc('Cioccolato al latte', 'm', DO), 'ice creams': proc('Gelato', 'm', DO),
  'beverages|coffee': proc('Caffè', 'm', B), 'beverages|tea': proc('Tè', 'm', B), 'alcoholic beverage|wine': proc('Vino', 'm', B),
  'alcoholic beverage|beer': proc('Birra', 'f', B), vinegar: proc('Aceto', 'm', A), 'salad dressing|mayonnaise': proc('Maionese', 'f', A),
  catsup: proc('Ketchup', 'm', A), mustard: proc('Senape', 'f', A), 'sauce|pesto': proc('Pesto', 'm', A),
  'leavening agents|yeast': proc('Lievito', 'm', A),
}

// Molte descrizioni USDA hanno un prefisso di gruppo ("Fish, salmon", "Nuts, walnuts"): l'alimento
// viene riconosciuto anche senza (es. "Salmon, ..." in altri dataset o nelle query di prova).
const ALIAS_PREFIXES = [
  'fish', 'crustaceans', 'mollusks', 'nuts', 'seeds', 'game meat', 'beverages', 'alcoholic beverage', 'snacks',
  'salad dressing', 'sauce', 'leavening agents', 'squash|summer', 'squash|winter', 'onions',
]
for (const [key, base] of Object.entries(BASES)) {
  const prefix = ALIAS_PREFIXES.find((p) => key.startsWith(`${p}|`))
  const alias = prefix && key.slice(prefix.length + 1)
  if (alias && !BASES[alias]) BASES[alias] = base
}
Object.assign(BASES, {
  pistachio: BASES['nuts|pistachio nuts'], cashew: BASES['nuts|cashew nuts'], macadamia: BASES['nuts|macadamia nuts'],
  tahini: BASES['seeds|sesame butter'], 'tomato|puree': BASES['tomato products|canned|puree'],
  'tomato|paste': BASES['tomato products|canned|paste'], 'tomato|canned|paste': BASES['tomato products|canned|paste'], 'corn flakes': proc('Corn flakes', 'mp', C),
  'cereals ready-to-eat|corn flakes': proc('Corn flakes', 'mp', C),
  'onions|spring': BASES['onions|spring or scallions'], cream: animal('Panna', 'f', D),
} satisfies Record<string, Base>)

/** Varietà: restano col loro nome proprio (iniziale maiuscola). */
const VARIETIES: Record<string, string> = {
  fuji: 'Fuji', gala: 'Gala', 'golden delicious': 'Golden Delicious', 'granny smith': 'Granny Smith',
  'red delicious': 'Red Delicious', honeycrisp: 'Honeycrisp', 'pink lady': 'Pink Lady', braeburn: 'Braeburn',
  medjool: 'Medjool', deglet: 'Deglet', iceberg: 'iceberg', 'cos or romaine': 'romana', butterhead: 'cappuccina',
  'green leaf': 'a foglia verde', 'red leaf': 'a foglia rossa', butternut: 'butternut', basmati: 'basmati',
  'cherry': 'ciliegino', romaine: 'romana', cremini: 'cremini', muscadine: 'Muscadine', manzanilla: 'Manzanilla', portabella: 'portobello', shiitake: 'shiitake',
}

/** Tagli e parti. */
const CUTS: Record<string, [string, Gender]> = {
  breast: ['petto', 'm'], thigh: ['coscia', 'f'], drumstick: ['sottocoscia', 'f'], wing: ['ala', 'f'], leg: ['coscia', 'f'],
  liver: ['fegato', 'm'], ground: ['macinato', 'm'], tenderloin: ['filetto', 'm'], loin: ['lonza', 'f'], 'top sirloin': ['controfiletto', 'm'],
  'rib eye': ['costata', 'f'], 'rib eye steak': ['costata', 'f'], 'eye of round': ['girello', 'm'], chuck: ['spalla', 'f'],
  brisket: ['punta di petto', 'f'], spareribs: ['costine', 'fp'], 'variety meats and by-products': ['frattaglie', 'fp'],
  'top round': ['fesa', 'f'], round: ['fesa', 'f'], 'chuck for stew': ['spalla', 'f'], rib: ['costata', 'f'], back: ['schiena', 'f'], neck: ['collo', 'm'], shoulder: ['spalla', 'f'],
}

/** Tagli che specificano quello precedente (es. il filetto è parte della lonza). */
const CUT_REFINES: Record<string, string> = { tenderloin: 'lonza', 'top sirloin': 'lonza', 'eye of round': 'fesa', 'top round': 'fesa' }

/** Stati di cottura e conservazione. Gli aggettivi in -o si accordano; "=" indica forma invariabile. */
const STATES: Record<string, string> = {
  raw: 'crudo', uncooked: 'crudo', unprepared: 'crudo', cooked: 'cotto', boiled: 'lessato', 'boiled and steamed': 'lessato',
  roasted: '=arrosto', grilled: 'grigliato', broiled: '=alla griglia', fried: 'fritto', 'pan-fried': '=in padella',
  baked: '=al forno', 'baked in skin': '=al forno', braised: 'brasato', 'pan-browned': 'rosolato', steamed: '=al vapore',
  stewed: '=in umido', simmered: 'lessato', poached: '=in camicia', 'hard-boiled': 'sodo', scrambled: 'strapazzato',
  dried: 'secco', dry: 'secco', dehydrated: 'disidratato', canned: '=in scatola', frozen: 'surgelato', smoked: 'affumicato',
  toasted: 'tostato', 'dry roasted': 'tostato', 'dry-roasted': 'tostato', 'oil roasted': '=tostato in olio', fresh: 'fresco',
  'mature cooked': 'cotto', 'drained solids': 'sgocciolato', 'drained solids with bone': 'sgocciolato', 'dried and salted': 'secco',
}

/** Colori e qualificatori che si accordano col nome. */
const ADJECTIVES: Record<string, string> = {
  red: 'rosso', green: 'verde', yellow: 'giallo', white: 'bianco', black: 'nero', purple: 'viola', orange: 'arancione',
  sweet: 'dolce', hot: 'piccante', mild: '', lean: 'magro', salted: 'salato', sliced: 'affettato',
  pearled: 'perlato', 'whole-wheat': 'integrale', 'whole-grain': 'integrale', 'whole grain': 'integrale', peeled: 'pelato',
  farmed: "=d'allevamento", wild: 'selvatico', seedless: '=senza semi', unsweetened: '=non zuccherato', sweetened: 'zuccherato',
  'immature seeds': 'fresco', sprouted: 'germogliato', plain: 'bianco', greek: 'greco', 'low fat': 'magro', lowfat: 'magro',
  nonfat: '=magro 0%', 'fat free': '=magro 0%', italian: '=tipo italiano', 'french or vienna': '=tipo francese', rye: '=di segale',
  'medium-grain': '=a chicco medio', 'long-grain': '=a chicco lungo', 'short-grain': '=a chicco corto', brown: 'integrale',
  'canned in oil': "=sott'olio", 'canned in water': '=al naturale', 'packed in tomato juice': '=pelato', 'in oil': "=sott'olio",
  'split': 'spezzato', goat: '=di capra', 'heavy whipping': '=da montare', 'part skim': '=parzialmente scremato',
  'part skim milk': '=parzialmente scremato', 'whole milk': 'intero', 'soft type': 'morbido', 'hard': '', 'dark': '',
  'spring or scallions': '', 'cherry tomatoes': '=ciliegino', 'sun-dried': 'secco', '85% lean meat / 15% fat': '=15% grassi',
  '95% lean meat / 5% fat': '=5% grassi', '85% lean': '=15% grassi', '95% lean': '=5% grassi',
  '70-85%': '=70-85%', '45- 59%': '=45-59%', '45-59%': '=45-59%', firm: 'compatto', 'tomato juice': '=pelato',
  chicken: '=di pollo', turkey: '=di tacchino', pork: '=di maiale', 'beef and pork': '=di manzo e maiale', '90% lean meat / 10% fat': '=10% grassi', '80% lean meat / 20% fat': '=20% grassi',
  '70-85% cacao solids': '=70-85%', '45- 59% cacao solids': '=45-59%', '45-59% cacao solids': '=45-59%', espresso: '=espresso',
  boneless: 'disossato', 'whole wheat': 'integrale', 'pre-sliced': 'affettato', silken: 'vellutato', 'grass-fed': '=da pascolo', beef: '=di manzo',
  'pork and beef': '=di maiale e manzo', 'with cheddar cheese': '=al formaggio', sunflower: '=di girasole',
  'red wine': '=di vino', balsamic: 'balsamico', 'table': '', compressed: 'fresco',
}

/** Gusti dei prodotti trasformati ("Strudel, apple" → Strudel (alla mela)). */
const FLAVORS: Record<string, string> = {
  apple: 'alla mela', apples: 'alla mela', cherry: 'alle ciliegie', blueberry: 'ai mirtilli', strawberry: 'alla fragola',
  peach: 'alla pesca', apricot: "all'albicocca", lemon: 'al limone', orange: "all'arancia", chocolate: 'al cioccolato',
  'chocolate chip': 'con gocce di cioccolato', vanilla: 'alla vaniglia', plain: 'semplice', butter: 'al burro',
  'mixed fruit': 'alla frutta mista', 'fruit-filled': 'ripieno di frutta', pecan: 'alle noci pecan',
}

/** Significati che dipendono dall'alimento base ("whole" = intero solo per il latte). */
const CONTEXT: Record<string, Record<string, string>> = {
  Latte: { whole: 'intero', lowfat: 'parzialmente scremato', 'reduced fat': 'parzialmente scremato', nonfat: 'scremato' },
  Yogurt: { 'whole milk': 'intero', whole: 'intero', 'low fat': 'magro', nonfat: 'magro 0%' },
  Ricotta: { 'whole milk': 'intera', 'part skim milk': 'parzialmente scremata' },
  Mozzarella: { 'whole milk': '', 'part skim milk': 'light', 'low moisture': 'per pizza' },
  Uovo: { whole: 'intero' },
  Riso: { white: 'bianco', brown: 'integrale' },
  Pane: { white: 'bianco' },
  Farina: { white: 'bianca' },
  Tonno: { light: '', fresh: 'fresco' },
  Cacao: { unsweetened: 'amaro' },
  Pomodoro: { red: '' },
  Oliva: { 'stuffed with pimiento': 'ripiena di peperone' },
  Lievito: { "baker's": 'di birra' },
  "Fiocchi d'avena": { dry: '' },
  'Galletta di riso': { 'brown rice': 'integrale', unsalted: 'senza sale' },
  Edamame: { frozen: '', prepared: 'cotto', unprepared: 'crudo' },
}

/** Informazioni che dipendono dall'alimento (buccia per i vegetali, pelle per gli animali). */
const INFO: Record<string, (kind?: Kind) => string> = {
  'with skin': (k) => (k === 'animal' ? 'con pelle' : 'con buccia'),
  'includes skin': (k) => (k === 'animal' ? 'con pelle' : 'con buccia'),
  'flesh and skin': () => 'con buccia',
  'with peel': () => 'con buccia',
  'without skin': (k) => (k === 'animal' ? 'senza pelle' : 'senza buccia'),
  'without peel': () => 'senza buccia',
  'cooked without skin': () => 'senza buccia',
  'cooked in skin': () => 'con buccia',
  'meat only': () => 'solo polpa',
  'meat and skin': () => 'con pelle',
  skinless: () => 'senza pelle',
  'separable lean only': () => 'solo parte magra',
  'with salt': () => 'con sale',
  'with salt added': () => 'con sale',
}

/** Token senza informazione utile per l'utente (classificazioni, gradi, note di confezionamento). */
const IGNORE = new Set([
  'broilers or fryers', 'broiler or fryers', 'all commercial varieties', 'all varieties', 'all types', 'all classes', 'all grades',
  'year round average', 'mixed species', 'common', 'atlantic', 'pacific', 'european', 'yellowfin', 'chinook', 'rainbow', 'blue',
  'northern', 'domesticated', 'domestic', 'composite of cuts', 'whole', 'mature seeds', 'mature', 'regular', 'enriched', 'unenriched',
  'commercially prepared', 'without salt', 'without added salt', 'without salt added', 'no salt added', 'choice', 'select', 'prime',
  'trimmed to 0 fat', 'trimmed to 1/8 fat', 'trimmed to 1/4 fat', 'separable lean and fat', 'bone-in', 'center loin', 'flat half',
  'boneless', 'fluid', 'with added vitamin d', 'with added vitamin a and vitamin d', '3.25% milkfat', '1% milkfat', '2% milkfat',
  'fat free or skim', 'salad or cooking', 'industrial and retail', 'all purpose salad or cooking', 'linoleic', 'linoleic approx 65%',
  'all-purpose', 'bleached', 'unbleached', 'groats', 'kernels', 'bulb', 'bulb and lower leaf-portion', 'includes tops and bulb',
  'flesh', 'ripe', 'summer', 'winter', 'swiss', 'snap', 'globe or french', 'japanese', 'sulfured', 'european type', 'american type',
  'red or green', 'light', 'meat', 'lean meat', 'stick', 'patty', 'crumbles', 'dry heat', 'moist heat', 'prepared', 'ready-to-serve',
  'refrigerated', 'brewed', 'prepared with tap water', 'black', 'restaurant-prepared', 'all', 'pink and red', 'pink or red',
  'medium', 'large', 'small', 'jumbo', 'small-extra large', 'whole kernel', 'cultured', 'pasteurized', 'dry powder', 'granulated',
  'fresh-refrigerated', 'nfs', 'eye', 'air-popped', 'english', 'tap water', '3.25%', '1%', '2%', '80% fat', 'smooth', 'smooth style', 'saltines',
  'dry or hard', 'chunky', 'chunk style', 'canned or bottled', 'without added ascorbic acid', 'with added ascorbic acid',
  'with added vitamin c', 'frozen concentrate', 'not breaded', 'drained', 'shank and sirloin', 'steak', 'roast', 'for stew', 'chops',
  'dark meat', 'light meat', 'lip off', 'florida', 'california', 'commercial', 'australian', 'imported', 'new zealand', 'prepackaged',
  'industrial', 'mid-oleic', 'high oleic', 'composite', 'tub', 'unblanched', 'blanched', 'tahini', 'type of kernels unspecified',
])

/** Marchi presenti in alcune descrizioni ("MORI-NU, Tofu, silken"): non sono mostrati. */
const BRANDS = ['mori-nu', 'chobani', 'lifeway', 'quaker', 'ralston', 'kraft', 'kellogg\'s', 'general mills', 'oscar mayer']

/** "85% lean / 15% fat", "90% lean meat / 10% fat" → "15% grassi". */
const LEAN_FAT = /^\d+% lean(?: meat)? \/ (\d+)% fat$/

/** Categorie USDA di prodotti trasformati: declassati (o nascosti) se non cercati esplicitamente. */
const PROCESSED_FOOD_CATEGORIES = new Set([
  'Baked Products', 'Baby Foods', 'Sweets', 'Snacks', 'Meals, Entrees, and Side Dishes', 'Fast Foods', 'Restaurant Foods',
  'Beverages', 'Soups, Sauces, and Gravies', 'Breakfast Cereals', 'Sausages and Luncheon Meats', 'American Indian/Alaska Native Foods',
])

/** Categoria USDA → categoria italiana (usata quando l'alimento base non la fissa). */
const FOOD_CATEGORY_MAP: Record<string, DisplayCategory> = {
  'Fruits and Fruit Juices': F, 'Vegetables and Vegetable Products': V, 'Poultry Products': M, 'Pork Products': M,
  'Beef Products': M, 'Lamb, Veal, and Game Products': M, 'Sausages and Luncheon Meats': S, 'Finfish and Shellfish Products': P,
  'Dairy and Egg Products': D, 'Legumes and Legume Products': L, 'Cereal Grains and Pasta': C, 'Baked Products': DO,
  'Fats and Oils': G, 'Nut and Seed Products': N, Beverages: B, Sweets: DO, Snacks: A, 'Spices and Herbs': V,
}

export function mapFoodCategory(foodCategory: string | undefined): DisplayCategory | null {
  return (foodCategory && FOOD_CATEGORY_MAP[foodCategory]) || null
}

// ------------------------------------------------------------------ traduzione

const normalizeToken = (t: string) =>
  t
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/["“”]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

/** Toglie il marchio, da solo ("CHOBANI") o in testa al token ("RALSTON Corn Flakes"). */
const stripBrand = (t: string) => {
  const brand = BRANDS.find((b) => t === b || t.startsWith(`${b} `))
  return brand ? t.slice(brand.length).trim() : t
}

export function tokenize(description: string): string[] {
  // Le virgole dentro le parentesi non separano i token.
  const withoutParens = description.replace(/\([^)]*\)/g, ' ')
  return withoutParens.split(',').map(normalizeToken).map(stripBrand).filter(Boolean)
}

const MAX_BASE_TOKENS = 4

function findBase(tokens: string[]): [Base, string[]] | null {
  for (let len = Math.min(MAX_BASE_TOKENS, tokens.length); len >= 1; len--) {
    const candidate = BASES[tokens.slice(0, len).join('|')]
    if (candidate) return [candidate, tokens.slice(len)]
  }
  return null
}

/** Accorda un aggettivo in -o al genere ("crudo" → "cruda"); "=" iniziale = invariabile. */
export function inflect(adj: string, g: Gender): string {
  if (adj.startsWith('=')) return adj.slice(1)
  if (adj.endsWith('o')) return adj.slice(0, -1) + { m: 'o', f: 'a', mp: 'i', fp: 'e' }[g]
  if (adj.endsWith('e') && (g === 'mp' || g === 'fp')) return adj.slice(0, -1) + 'i'
  return adj
}

export interface UsdaTranslation {
  display: GenericFoodDisplay
  isPrimitive: boolean
}

const untranslated = new Map<string, { count: number; example: string }>()

function recordUntranslated(token: string, description: string) {
  const entry = untranslated.get(token)
  untranslated.set(token, { count: (entry?.count ?? 0) + 1, example: entry?.example ?? description })
  // In sviluppo (Vite) logga ogni token sconosciuto; nello script Node import.meta.env non esiste.
  if ((import.meta as { env?: { DEV?: boolean } }).env?.DEV) {
    console.debug(`[usdaToItalian] token non tradotto "${token}" in "${description}" (descrizioni scartate: ${untranslatedTotal()})`)
  }
}

const untranslatedTotal = () => [...untranslated.values()].reduce((s, e) => s + e.count, 0)

/** Token non tradotti incontrati finora, con conteggio ed esempio (per ampliare i dizionari). */
export function untranslatedReport(): { token: string; count: number; example: string }[] {
  return [...untranslated.entries()].map(([token, e]) => ({ token, ...e })).sort((a, b) => b.count - a.count)
}

export function resetUntranslated() {
  untranslated.clear()
}

/**
 * Traduce una descrizione USDA. Restituisce null se un token non è riconosciuto
 * (la voce va scartata) o se l'alimento non va mai mostrato (es. alimenti per l'infanzia).
 */
export function usdaToItalian(description: string, foodCategory?: string): UsdaTranslation | null {
  const tokens = tokenize(description)
  if (tokens.length === 0) return null

  // Se l'alimento non è riconosciuto, si riprova saltando i token senza informazione
  // ("Oil, industrial, mid-oleic, sunflower" → oil|sunflower).
  const found = findBase(tokens) ?? findBase(tokens.filter((t) => !IGNORE.has(t)))
  if (!found) {
    recordUntranslated(tokens[0], description)
    return null
  }
  const [base, rest] = found
  if (base.discard) return null

  let cut = base.cut
  const varieties: string[] = []
  const info: [string, boolean][] = [] // [testo, si accorda?]
  const states: string[] = []
  let processed = base.processed ?? false
  const unknown: string[] = []

  const context = CONTEXT[base.it] ?? {}
  for (const tok of rest) {
    if (tok in context) {
      if (context[tok]) info.push([context[tok], false])
    } else if (base.processed && FLAVORS[tok]) info.push([FLAVORS[tok], false])
    else if (VARIETIES[tok]) varieties.push(VARIETIES[tok])
    else if (CUTS[tok]) {
      // "loin, tenderloin": vince il taglio più specifico.
      if (!cut || (CUT_REFINES[tok] && cut[0] === CUT_REFINES[tok])) cut = CUTS[tok]
      else info.push([CUTS[tok][0], false])
    } else if (STATES[tok]) states.push(STATES[tok])
    else if (INFO[tok]) info.push([INFO[tok](base.kind), false])
    else if (tok in ADJECTIVES) {
      if (ADJECTIVES[tok]) info.push([ADJECTIVES[tok], true])
    } else if (IGNORE.has(tok)) continue
    else if (LEAN_FAT.test(tok)) info.push([`${tok.match(LEAN_FAT)![1]}% grassi`, false])
    else if (/juice|syrup|sauce|candied|sweetened|jelly|pudding|babyfood/.test(tok)) {
      processed = true
      unknown.push(tok)
    } else unknown.push(tok)
  }

  if (unknown.length > 0) {
    unknown.forEach((t) => recordUntranslated(t, description))
    return null
  }

  const g = cut?.[1] ?? base.g
  // "cooked, roasted" → solo "arrosto": lo stato generico "cotto" è ridondante se ce n'è uno specifico.
  const inflectedStates = [...new Set(states.map((s) => inflect(s, g)))]
  // "fresco" (non stagionato) non serve se c'è già uno stato di cottura.
  const specificStates = inflectedStates.filter((s) => !/^cott[oaie]$/.test(s) && !/^fresc/.test(s))
  const chosen =
    specificStates.length > 0
      ? specificStates
      : inflectedStates.filter((s, _, all) => !(all.length > 1 && /^fresc/.test(s)))
  // "raw" insieme a una cottura o conservazione ("raw, ..., cooked, boiled") è ridondante.
  const finalStates = chosen.length > 1 ? chosen.filter((s) => !/^crud[oaie]$/.test(s)) : chosen

  const details = [
    ...(base.details ?? []).map((d) => inflect(d, base.g)),
    ...varieties,
    ...info.map(([text, agrees]) => (agrees ? inflect(text, g) : text)),
    ...finalStates,
  ].filter((d, i, all) => d && all.indexOf(d) === i)

  if (foodCategory && PROCESSED_FOOD_CATEGORIES.has(foodCategory)) processed = true

  return {
    display: {
      category: base.cat ?? mapFoodCategory(foodCategory) ?? 'Altro',
      baseName: base.it,
      cut: cut?.[0],
      details,
    },
    isPrimitive: !processed,
  }
}
