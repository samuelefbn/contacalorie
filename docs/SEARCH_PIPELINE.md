# Pipeline di ricerca alimenti

Codice: `src/lib/foodSearch/` (la ricerca), `src/lib/myFoodsSearch.ts` (i miei alimenti), `src/features/picker/SearchTab.tsx` (l'interfaccia), `scripts/` (generazione del dataset).

## Fonti e ordine delle sezioni

| Sezione nell'interfaccia | Fonte | Codice | Funziona offline |
|---|---|---|---|
| **I miei alimenti** | `users/{uid}/foods` già in memoria + voci di diario recenti non salvate | `createMyFoodsSearch` (`src/lib/myFoodsSearch.ts`), `useFoods`, `useRecentFoods` | sì |
| **Alimenti generici** | dataset incluso nell'app (circa 384 voci) | `searchGenericDataset` (`src/lib/foodSearch/genericSearch.ts`) | sì |
| | USDA FoodData Central live, solo se il dataset trova meno di 5 voci (`DATASET_ENOUGH` in `SearchTab.tsx`) | `searchUsdaLive` → `searchUsda` (`src/lib/foodSearch/usda.ts`) | no (cache del service worker per le query già fatte) |
| **Mostra anche prodotti trasformati** | generici non primitivi non richiesti esplicitamente | `rankGenericResults` (`processed`) | come sopra |
| **Prodotti confezionati** | Open Food Facts: prima Search-a-licious, poi la ricerca classica | `searchPackaged` (`src/lib/foodSearch/index.ts`), `src/lib/foodSearch/openFoodFacts.ts` | no |

Le fonti online partono 500 ms dopo l'ultima battuta (`DEBOUNCE_MS`), con almeno 2 caratteri (`MIN_CHARS`), in parallelo (`searchOnline`, `Promise.allSettled`).

## Normalizzazione della query

`src/lib/foodSearch/queryText.ts`:

1. `queryTokens`: minuscolo e senza accenti (`normalize` in `src/lib/text.ts`), apostrofi trasformati in spazi, divisione su tutto ciò che non è `a-z`, `0-9` o `%`, rimozione di articoli e preposizioni (`di`, `del`, `con`, `senza`…).
2. `canonical`: se la parola ha più di 3 lettere e finisce per `a`/`e`/`i`/`o`, toglie la vocale finale. Così singolare e plurale coincidono (mela/mele → `mel`, zucchina/zucchine → `zucchin`).
3. `canonicalTokens` = 1 + 2; `normalizeQuery` le unisce con uno spazio.
4. `wordMatches(q, word, allowPrefix)`: parola uguale, oppure prefisso di almeno 3 lettere quando il prefisso è ammesso.

La cache usa invece `cacheKey` (`src/lib/foodSearch/cache.ts`): minuscolo, spazi compattati.

## Ricerca nel dataset generico

`createGenericSearch` (`src/lib/foodSearch/genericSearch.ts`) prova tre livelli e si ferma al primo che trova qualcosa:

1. **parole intere**: `matchTier(q, r) > 0`;
2. **prefisso** sull'ultima parola mentre si scrive ("zucch" → zucchina);
3. **Fuse.js** su `name` e `synonyms` (soglia 0,3, massimo 10 risultati) per gli errori di battitura ("zuchine").

Il prefisso e la ricerca approssimata servono solo se le parole intere non trovano nulla: altrimenti "mela" troverebbe anche melanzana e melone.

## Ranking dei generici

`rankGenericResults(query, results)` in `src/lib/foodSearch/genericRanking.ts` riceve `mergeGeneric(dataset, usdaLive)` (il dataset prima; da USDA live si scartano gli `fdcId` già presenti nel dataset).

1. **Deduplica per etichetta** (`dedupeByLabel`): a parità di nome italiano tiene la fonte preferita. Ordine: dataset curato (`id` che inizia con `gen:`), poi USDA `Foundation`, poi `SR Legacy`.
2. **Livello di corrispondenza** (`matchTier`, costanti in `TIER`):

   | Livello | Valore | Quando |
   |---|---|---|
   | `baseExact` | 100 | le parole della query sono esattamente il nome base, oppure nome base + taglio |
   | `synonym` | 95 | coincidono con un sinonimo |
   | `primary` | 80 | ogni parola compare nel nome base o nel taglio |
   | `anyWord` | 60 | ogni parola compare anche nei dettagli o nei sinonimi |
   | `other` | 10 | nessuna corrispondenza (risultato USDA live tenuto in fondo) |

3. **Ordine dentro lo stesso livello** (`compare`):
   - nome base in ordine alfabetico;
   - prima la voce senza taglio, poi i tagli in ordine alfabetico;
   - le voci crude prima di quelle cotte;
   - prima la voce senza informazioni aggiuntive, poi varietà e informazioni in ordine alfabetico;
   - infine gli stati di cottura nell'ordine di `stateRank` (`src/lib/foodSearch/display.ts`): crudo/fresco 0, secco 1, lessato 2, cotto/vapore 3, griglia 4, arrosto/forno 5, padella 6, brasato 7, fritto 8, in scatola/surgelato/affumicato 9.
4. **Primitivi e trasformati**: una voce va in `main` se è primitiva (`isPrimitive`) oppure se il trasformato è **richiesto esplicitamente** (`isExplicitRequest`). Lo è quando la query inizia con il suo nome base o taglio ("succo di mela", "strudel"), oppure contiene una parola tipica dei trasformati (`PROCESSED_QUERY_WORDS`: `succ`, `tort`, `biscott`, `marmellat`, `gelat`, `cioccolat`, `salum`, `wurstel`…). Le altre vanno in `processed`, che l'interfaccia mostra solo espandendo "Mostra anche prodotti trasformati". Massimo 30 voci per gruppo.

### Criterio "alimento primitivo"

- **Dataset**: `isPrimitive` deciso nelle definizioni (`scripts/genericFoods.defs.ts`): `D(...)` = primitivo, `X(...)` = trasformato.
- **USDA live**: `usdaToItalian` imposta `isPrimitive = !processed`, dove `processed` è vero se:
  - l'alimento base è marcato `processed` nel dizionario (succhi, dolci, salumi, margarina…);
  - oppure la `foodCategory` USDA è tra `PROCESSED_FOOD_CATEGORIES` (Baked Products, Baby Foods, Sweets, Snacks, Beverages, Sausages and Luncheon Meats…);
  - oppure un token contiene `juice`, `syrup`, `sauce`, `candied`, `sweetened`, `jelly`, `pudding`, `babyfood` (la voce viene comunque scartata se il token non è tradotto).
- **Open Food Facts**: sempre `isPrimitive: false` (prodotti confezionati).

## Formato del nome

`formatFoodLabel` (`src/lib/foodSearch/display.ts`) produce **`Categoria - Alimento, taglio (dettaglio, dettaglio)`**:

- `Frutta - Mela (Fuji, con buccia, cruda)`
- `Carne - Pollo, petto (crudo)`
- `Carne - Maiale, salsiccia (cotta)`

Struttura `GenericFoodDisplay`: `category` (elenco chiuso `DISPLAY_CATEGORIES`: Frutta, Verdura, Legumi, Cereali e derivati, Carne, Salumi, Pesce, Uova, Latticini, Grassi e oli, Frutta secca, Dolci, Bevande, Altro), `baseName` (singolare, iniziale maiuscola), `cut` facoltativo, `details` (varietà, informazioni, stato, in quest'ordine). Gli aggettivi si accordano con il genere del nome o del taglio ("cruda" per la mela, "crudo" per il petto).

Tra i miei alimenti i prodotti con marca si mostrano come **`Nome prodotto - Marca`** (`foodLabel` in `src/lib/foodLibrary.ts`).

## Dizionario italiano → inglese (query per USDA)

`translateToEnglish` in `src/lib/foodSearch/translate.ts`:

- dizionario `IT_EN` (chiavi minuscole, senza accenti): frutta, verdura, legumi, cereali, carne e salumi, pesce, latticini e uova, grassi e semi, dolci e bevande, modi di preparazione (`crudo` → `raw`, `cotto` → `cooked`…);
- prima le **espressioni** fino a 4 parole ("petto di pollo" → `chicken breast`), poi le singole parole;
- le preposizioni vengono saltate;
- se una parola non è nel dizionario si provano le varianti singolare/plurale (`-a`, `-o`, `-e`, `-i`); altrimenti resta com'è;
- `translated` indica se almeno una parola è stata tradotta.

## Traduzione delle descrizioni USDA in italiano

`usdaToItalian(description, foodCategory?)` in `src/lib/foodSearch/usdaToItalian.ts`. Esempio: "Apples, raw, fuji, with skin" → `Frutta - Mela (Fuji, con buccia, cruda)`.

1. **Token**: la descrizione si divide sulle virgole (`tokenize`); il testo tra parentesi è ignorato; i **marchi** in `BRANDS` (CHOBANI, QUAKER, MORI-NU…) vengono tolti.
2. **Alimento base**: si cercano in `BASES` le chiavi formate dai primi 1–4 token uniti da `|` (es. `squash|summer|zucchini` → Zucchina). Se non c'è corrispondenza si riprova saltando i token in `IGNORE` ("Oil, industrial, mid-oleic, sunflower" → `oil|sunflower`). Le chiavi con prefisso di gruppo (`fish|`, `nuts|`, `seeds|`…) hanno anche un alias senza prefisso (`ALIAS_PREFIXES`).
3. **Token successivi**, in quest'ordine di dizionario:
   - `CONTEXT[nome base]`: significato che dipende dall'alimento (per il latte "whole" = intero);
   - `FLAVORS`: gusti, solo per i prodotti trasformati ("Strudel, apple" → alla mela);
   - `VARIETIES`: varietà con nome proprio (Fuji, Gala…);
   - `CUTS`: tagli e parti; `CUT_REFINES` sceglie il taglio più specifico (loin + tenderloin = filetto);
   - `STATES`: stati di cottura, accordati al genere; con `=` davanti sono invariabili;
   - `INFO`: con buccia o con pelle secondo il tipo di alimento, solo polpa…;
   - `ADJECTIVES`: colori e qualificatori, accordati se non hanno `=`;
   - `IGNORE`: token senza informazione utile (gradi commerciali, "year round average"…);
   - `LEAN_FAT`: "85% lean / 15% fat" → `15% grassi`.
4. **Token sconosciuto** → la voce viene **scartata** (`null`): l'interfaccia non mostra mai testo inglese. Il token viene contato in `untranslatedReport()`; in sviluppo (`import.meta.env.DEV`) viene anche scritto in console con `console.debug`.
5. **Stati**: "cotto" è tolto se c'è uno stato più specifico; "fresco" è tolto se ci sono altri stati; "crudo" è tolto se restano più stati.
6. **Categoria**: quella del nome base, altrimenti `mapFoodCategory(foodCategory)` (`FOOD_CATEGORY_MAP`), altrimenti `Altro`.

`usdaFoodToResult` (`src/lib/foodSearch/usdaMap.ts`) estrae poi i nutrienti per 100 g:
- energia in kcal (id 1008, 2047, 2048, oppure kJ / 4,184);
- proteine 1003, grassi 1004, carboidrati 1005 (oppure 1050).

Scarta le voci con nutrienti mancanti o non plausibili.

## Validazione dei valori

`isPlausible` (`src/lib/foodSearch/validate.ts`), usata per USDA, Open Food Facts e dal picker dello script:
- kcal ≤ 950 per 100 g;
- macro tra 0 e 100 e somma ≤ 105;
- kcal non inferiori alla metà di quelle stimate dai macro (4/4/9, se queste superano 40).

Per Open Food Facts un macro mancante **non** viene sostituito con 0: la voce viene scartata (`offProductToResult`). `roundResult` arrotonda kcal all'intero e macro a un decimale.

## Deduplica nell'interfaccia

In `SearchTab`:
- le voci già presenti tra "i miei alimenti" (stessa chiave `foodKey` o stesso nome + marca normalizzati) non vengono ripetute nelle sezioni generici e confezionati;
- `mergeGeneric` toglie da USDA live gli `fdcId` già nel dataset;
- `dedupeByLabel` unisce le etichette uguali.

## I miei alimenti

`createMyFoodsSearch(foods, now)` (`src/lib/myFoodsSearch.ts`):
- indice Fuse.js (soglia 0,3) su nome (peso 2), marca e codice a barre, tutti normalizzati;
- prima le voci che contengono **tutte** le parole della query (o il cui codice inizia con la query numerica), poi le corrispondenze approssimate;
- dentro ogni gruppo ordine per `usageScore` = `(1 + useCount) × e^(−giorni dall'ultimo uso / 14)`;
- massimo 8 risultati (insieme alle voci recenti non salvate).

## Il dataset generico

- **File**: `src/data/genericFoods.it.json` (`GenericFoodsDataset`). Contiene `category`, `baseName`, `cut`, `details`, `isPrimitive`, `synonyms`, valori per 100 g, `fdcId`, `usdaDescription`, `dataType`, `portions`.
- **Generazione**: `npm run build:foods` (`scripts/build-generic-foods.ts`), oppure il workflow `.github/workflows/generic-foods.yml`.
  - Per ogni definizione di `scripts/genericFoods.defs.ts` lo script interroga USDA; la query perde la punteggiatura (`usdaQueryText`).
  - `pickUsdaFood` (`scripts/usdaPicker.ts`) sceglie la voce che contiene tutti i termini `match` e nessuno degli `exclude`; le esclusioni generali non valgono se un termine richiesto le contiene. A parità preferisce SR Legacy e la descrizione più corta.
  - Copia i valori **solo** dall'API: nessun numero è scritto a mano.
- **Prova senza toccare `main`**: avviato su un branch, il workflow genera il riepilogo (alimenti non trovati con le prime voci USDA, token non tradotti) senza committare né pubblicare.

## Come aggiungere voci

| Obiettivo | Dove | Poi |
|---|---|---|
| Nuova parola italiana da cercare su USDA | `IT_EN` in `src/lib/foodSearch/translate.ts` (chiave minuscola, senza accenti; espressioni fino a 4 parole) | `npm test` (`translate.test.ts`) |
| Nuovo alimento base USDA tradotto | `BASES` in `src/lib/foodSearch/usdaToItalian.ts` con `plant`, `animal` o `proc` (nome italiano, genere `m`/`f`/`mp`/`fp`, categoria) | aggiungere un caso in `src/lib/foodSearch/usdaToItalian.test.ts` |
| Nuovo taglio, stato, varietà, aggettivo o token da ignorare | `CUTS`, `STATES`, `VARIETIES`, `ADJECTIVES`, `INFO`, `IGNORE`, `CONTEXT`, `FLAVORS`, `BRANDS` nello stesso file | test come sopra |
| Nuovo alimento nel dataset | `scripts/genericFoods.defs.ts` con `D(categoria, nome, dettagli, taglio)` o `X(...)` per i trasformati, sinonimi, `query`, `match`, `exclude`, porzioni | `npm test` (`scripts/genericFoods.test.ts` verifica anche che il traduttore copra la voce). Poi il workflow "Genera alimenti generici (USDA)" su un branch (prova) e su `main` |
| Nuova parola che indica un trasformato | `PROCESSED_QUERY_WORDS` in `src/lib/foodSearch/genericRanking.ts` | `genericRanking.test.ts` |

Regole da rispettare:
- I valori nutrizionali **non si inventano mai**: arrivano da USDA o Open Food Facts.
- Il formato dei nomi resta "Categoria - Alimento (dettaglio)".
- Un token USDA sconosciuto deve far scartare la voce, non comparire in inglese.
