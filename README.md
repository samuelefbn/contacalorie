# ContaCalorie

App web personale per contare le calorie giornaliere: registri ciò che mangi e vedi subito se stai rispettando il tuo obiettivo calorico e di macronutrienti. È una PWA installabile sul telefono, funziona anche offline e usa Firebase (Authentication + Firestore) come database.

**Indirizzo dopo il deploy:** https://samuelefbn.github.io/contacalorie/

---

## ✅ Cosa devi fare tu (passo per passo)

Il codice è pronto, ma alcune impostazioni si fanno solo dalle console di GitHub, Firebase e Google Cloud.

### 1. Fai il merge della Pull Request su `main`

Su GitHub apri la Pull Request del branch `claude/serene-carson-gwg6c3` e premi **Merge pull request**.
Il merge avvia il workflow di deploy. Se lo fai prima dei passi 2 e 3, la prima esecuzione fallirà: nessun problema, al termine del passo 3 rilanciala da **Actions → Deploy su GitHub Pages → Run workflow**.

### 2. Aggiungi i GitHub Secrets (7 di Firebase + 1 per USDA)

Nel repository vai su **Settings → Secrets and variables → Actions → New repository secret** e crea questi secret (nomi esatti):

| Nome del secret | Dove trovi il valore |
|---|---|
| `VITE_FIREBASE_API_KEY` | `apiKey` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `authDomain` (di solito `contacalorie-28e2d.firebaseapp.com`) |
| `VITE_FIREBASE_PROJECT_ID` | `projectId` → `contacalorie-28e2d` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `storageBucket` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |
| `VITE_FIREBASE_APP_ID` | `appId` |
| `VITE_FIREBASE_MEASUREMENT_ID` | `measurementId` (Analytics non viene inizializzato, ma la variabile è prevista) |
| `VITE_USDA_API_KEY` | chiave gratuita di USDA FoodData Central (vedi [Ricerca alimenti](#ricerca-alimenti-fonti-e-fallback)) |

I valori Firebase sono in **Firebase Console → ⚙️ Impostazioni progetto → Generali → Le tue app → (app web) → Configurazione SDK → Config**. Se non hai ancora un'app web, creala con l'icona `</>`.

Per `VITE_USDA_API_KEY`:
1. Registrati gratis su https://fdc.nal.usda.gov/api-key-signup (bastano nome ed email): la chiave arriva subito via email.
2. Aggiungila come secret `VITE_USDA_API_KEY` (stessa schermata degli altri).
3. Rilancia il deploy da **Actions → Deploy su GitHub Pages → Run workflow** (o fai un push su `main`).

Senza questo secret l'app usa la chiave pubblica `DEMO_KEY`, che ha limiti molto bassi (circa 30 richieste l'ora e 50 al giorno per indirizzo IP): la ricerca USDA smetterebbe presto di rispondere. La chiave personale permette 1.000 richieste l'ora. Come la API key di Firebase, finisce nel JavaScript pubblicato: è normale per una chiave di sola lettura su dati pubblici.

### 3. Abilita GitHub Pages con sorgente "GitHub Actions"

**Settings → Pages → Build and deployment → Source: GitHub Actions**.

### 4. Autorizza il dominio di GitHub Pages in Firebase Authentication

**Firebase Console → Authentication → Impostazioni (Settings) → Domini autorizzati → Aggiungi dominio** e inserisci:

```
samuelefbn.github.io
```

(in generale `TUO-USERNAME.github.io`, senza `https://` e senza `/contacalorie`). `localhost` è già presente di default.

### 5. Pubblica le regole di sicurezza di Firestore

1. Apri il file [`firestore.rules`](firestore.rules) di questo repository e copiane **tutto** il contenuto.
2. **Firebase Console → Firestore Database → scheda Regole**.
3. Sostituisci il testo esistente con quello copiato e premi **Pubblica**.

**Ripeti questo passo ogni volta che `firestore.rules` cambia** (l'ultima modifica aggiunge la fonte `usda` alle voci di diario: senza ripubblicare, aggiungere al diario un alimento trovato su USDA dà "Permesso negato").

Senza questo passo l'app riceverà errori "Permesso negato". Le regole permettono a ciascun utente di leggere e scrivere **solo** i documenti sotto `users/{il-suo-uid}` e verificano tipi e limiti dei campi (data, pasto, grammi, calorie non negative…). Tutto il resto è negato.

### 6. Limita la API key dalla Google Cloud Console

La API key di Firebase non è un segreto (finisce comunque nel JavaScript pubblicato), ma va limitata così che nessuno possa usarla da altri siti.

1. Apri [Google Cloud Console → API e servizi → Credenziali](https://console.cloud.google.com/apis/credentials?project=contacalorie-28e2d) (progetto `contacalorie-28e2d`).
2. Apri la chiave usata dall'app (di solito **"Browser key (auto created by Firebase)"**: è quella con lo stesso valore di `VITE_FIREBASE_API_KEY`).
3. In **Restrizioni delle applicazioni** scegli **Siti web** (referrer HTTP) e aggiungi:
   ```
   http://localhost:5173/*
   http://localhost:4173/*
   https://samuelefbn.github.io/*
   https://contacalorie-28e2d.firebaseapp.com/*
   ```
   Il dominio `firebaseapp.com` serve perché il popup di accesso Google gira lì. Se usi anche Firebase Hosting aggiungi `https://contacalorie-28e2d.web.app/*`.
4. (Consigliato) In **Restrizioni API** scegli **Limita chiave** e seleziona: *Identity Toolkit API*, *Token Service API*, *Cloud Firestore API*.
5. **Salva**. Le modifiche possono richiedere qualche minuto.

Fatto: apri https://samuelefbn.github.io/contacalorie/, accedi con Google e completa il profilo.

---

## Funzionalità

- **Login con Google**: ogni utente vede solo i propri dati (garantito dalle regole Firestore, non solo dall'interfaccia).
- **Profilo e obiettivi**: sesso, età, altezza, peso, livello di attività e obiettivo (dimagrire / mantenere / aumentare). Il fabbisogno è calcolato con la formula di **Mifflin-St Jeor** × fattore di attività (−500 kcal per dimagrire, +300 per aumentare, con una soglia minima di sicurezza) e si può sovrascrivere a mano. Target di proteine, carboidrati e grassi modificabili, con calcolo automatico.
- **Diario giornaliero** diviso in colazione, pranzo, cena e spuntini: nome, grammi, kcal e macro per ogni voce. Tocca una voce per cambiare quantità, pasto o giorno, oppure eliminarla (con **Annulla**).
- **Ricerca alimenti** mentre scrivi, tra i tuoi alimenti e su più fonti con valori reali ([Open Food Facts](https://world.openfoodfacts.org) e [USDA FoodData Central](https://fdc.nal.usda.gov), vedi sotto), per nome o **codice a barre** (scanner con la fotocamera, o inserimento del codice a mano), più **inserimento manuale** con valori per 100 g o per la quantità consumata. Ogni risultato mostra la fonte.
- **Alimenti personali, preferiti e ricette**: salva con la ⭐ gli alimenti ricorrenti, crea ricette da ingredienti (con peso finale da cotto e numero di porzioni) o salva un intero pasto come ricetta. Gli **ultimi usati** si riaggiungono con un tap (pulsante **+**).
- **Dashboard**: anello con calorie consumate vs obiettivo, calorie rimanenti (o in eccesso) e barre dei macro.
- **Storico**: grafico delle calorie degli ultimi 7/30 giorni con linea dell'obiettivo, media giornaliera, **media settimanale**, giorni entro l'obiettivo; **registrazione e grafico del peso**.
- **Navigazione tra i giorni**: precedente / successivo, calendario e "Torna a oggi".
- **Esportazione CSV** di diario e peso (separatore `;` e virgola decimale, si apre direttamente in Excel in italiano).
- **PWA**: installabile, tema chiaro/scuro (o di sistema), funziona **offline** grazie alla cache persistente di Firestore; le modifiche fatte offline si sincronizzano al ritorno della rete.

## Ricerca alimenti: fonti e fallback

Open Food Facts è un database di **prodotti confezionati**: non copre bene gli alimenti sfusi (frutta, verdura, carne fresca, pesce, uova, legumi, cereali). Per questo la ricerca ha due binari, interrogati **sempre in parallelo** (un errore di uno non blocca l'altro), e i risultati sono mostrati in due sezioni:

**1. Alimenti generici** (in alto, fonte primaria)
1. **I tuoi alimenti e quelli già usati** (fino a 100 distinti dalle voci recenti): istantanei, anche offline.
2. **Dataset generico incluso nell'app** (`src/data/genericFoods.it.json`): circa 390 alimenti della cucina italiana con nomi e sinonimi in italiano, varianti crudo/cotto per carni e pesci, valori per 100 g presi da USDA FoodData Central. Funziona offline e con le API giù. Ricerca tollerante: senza accenti, singolare/plurale (*mele* → *mela*, *zucchine* → *zucchina*), senza preposizioni, con priorità *esatto > inizia con > contiene > approssimato* (errori di battitura, con Fuse.js).
3. **USDA FoodData Central live** (`api.nal.usda.gov/fdc/v1/foods/search`, dataset *Foundation* e *SR Legacy*, 15 risultati) per ciò che il dataset non copre: la query viene tradotta con un dizionario italiano → inglese (*mela* → *apple*, *salsiccia* → *pork sausage*); i nomi di questi risultati restano in inglese.

**2. Prodotti confezionati** (sotto): Open Food Facts, prima **Search-a-licious** (`search.openfoodfacts.org`) e, se fallisce o non trova nulla, la **ricerca classica** (`it.openfoodfacts.org/cgi/search.pl`, spesso sovraccarica: risponde 503 senza intestazione CORS, quindi qui si ritentano anche gli errori di rete).

Ogni risultato ha un'etichetta con la fonte (*USDA*, *Open Food Facts*, *Mio*, *Ricetta*). Per gli alimenti generici ci sono **porzioni rapide indicative** (es. *1 mela media ≈ 180 g*, *1 uovo medio ≈ 50 g*), sempre modificabili in grammi.

Regole comuni:
- **Timeout di 8 secondi** per richiesta e **fino a 2 retry** con attesa crescente (0,5 s, 1 s) solo su 5xx, 429 e timeout.
- La ricerca online parte **500 ms dopo che smetti di scrivere** (minimo 2 caratteri) e annulla quella precedente; i generici del dataset compaiono subito.
- **Cache** dei risultati per query e per fonte, in memoria e in `sessionStorage`, per **24 ore**.
- **Solo valori reali**: kcal, proteine, carboidrati e grassi per 100 g dichiarati dalla fonte. Un risultato con uno di questi valori mancante viene scartato (non si mette 0), così come valori incoerenti (kcal negative o oltre 950, un macro oltre 100 g per 100 g, somma dei macro oltre 100 g, kcal molto inferiori a quanto i macro impongono).
- Il messaggio d'errore compare **solo se tutte le fonti falliscono**, con **Riprova** e **Inserisci a mano**. Se fallisce una sola fonte compare una nota discreta (es. *"Prodotti confezionati non disponibili al momento"*) e restano visibili gli altri risultati.
- Il **codice a barre** usa `world.openfoodfacts.org/api/v2/product/{codice}.json` con gli stessi timeout e retry; se OFF non risponde lo dice e propone l'inserimento manuale.

### Generare (o aggiornare) il dataset degli alimenti generici

I valori del dataset arrivano **solo dall'API USDA**, tramite `scripts/build-generic-foods.ts`: l'elenco degli alimenti, con sinonimi, categoria, stato (crudo/cotto…) e porzioni indicative, è in `scripts/genericFoods.defs.ts` e non contiene valori nutrizionali. Per ogni alimento lo script cerca su USDA (Foundation e SR Legacy), sceglie la voce la cui descrizione corrisponde (es. *"Chicken, broilers or fryers, breast, meat only, raw"*) e ne copia i valori per 100 g, con data di generazione e `fdcId` originale. Se non trova una voce compatibile, l'alimento viene saltato e segnalato (mai inventato).

**Modo semplice, da GitHub** (consigliato):
1. Assicurati di avere il secret `VITE_USDA_API_KEY` (vedi passo 2 in alto).
2. Vai su **Actions → "Genera alimenti generici (USDA)" → Run workflow → Run workflow**.
3. In 1-2 minuti il workflow genera il dataset, esegue i test, lo committa su `main` e ripubblica il sito. Nella pagina dell'esecuzione trovi una tabella con, per ogni alimento, la voce USDA scelta e i valori, più l'elenco di quelli non trovati.

**In locale**:
```bash
VITE_USDA_API_KEY=la-tua-chiave npm run build:foods   # oppure metti la chiave nel file .env
git add src/data/genericFoods.it.json && git commit -m "Aggiorna dataset alimenti generici"
```

Finché il dataset è vuoto, gli alimenti generici arrivano solo da USDA live (nomi in inglese) e dai tuoi alimenti.

## Sviluppo in locale

Requisiti: Node.js 20.19+ (consigliato 22).

```bash
npm install
cp .env.example .env     # poi inserisci i valori reali, compresa VITE_USDA_API_KEY (il file .env è nel .gitignore)
npm run dev              # http://localhost:5173/contacalorie/
```

Altri comandi:

| Comando | Cosa fa |
|---|---|
| `npm run build` | build di produzione per GitHub Pages (in `dist/`) |
| `npm run preview` | serve la build in locale |
| `npm run lint` | ESLint |
| `npm test` | unit test (Vitest) di calcoli, date, CSV, ricerca alimenti e statistiche |
| `npm run build:foods` | genera `src/data/genericFoods.it.json` da USDA (serve `VITE_USDA_API_KEY`) |
| `npm run build:firebase` | build con `base` `/` per Firebase Hosting |

**Emulatori Firebase (facoltativo)**: per provare tutto in locale senza toccare i dati veri, avvia `firebase emulators:start --only auth,firestore` e poi `VITE_USE_EMULATORS=true npm run dev`.

## Deploy alternativo su Firebase Hosting

Il repository include `firebase.json` e `.firebaserc` (copia di `.firebaserc.example`, progetto `contacalorie-28e2d`). Con la [Firebase CLI](https://firebase.google.com/docs/cli):

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only hosting            # esegue in automatico `npm run build:firebase`
firebase deploy --only firestore:rules    # alternativa al passo 5 (pubblica le regole)
firebase deploy --only firestore:indexes  # facoltativo, vedi sotto
```

Serve un file `.env` locale con i valori reali. Ricordati di aggiungere `contacalorie-28e2d.web.app` ai domini autorizzati se non c'è già.

## Struttura del progetto

```
.github/workflows/   ci.yml (lint/test/build sulle PR) · deploy.yml (GitHub Pages)
                     generic-foods.yml (genera il dataset degli alimenti generici da USDA)
scripts/             build-generic-foods.ts + genericFoods.defs.ts (elenco alimenti generici)
public/              icone PWA e favicon
src/
  App.tsx            provider, autenticazione e navigazione a schede (#/diario, #/alimenti, …)
  types.ts           tipi del modello dati
  lib/               firebase.ts, nutrition.ts (Mifflin-St Jeor, macro), dates.ts,
                     csv.ts, format.ts, text.ts (+ test)
  lib/foodSearch/    ricerca alimenti: generici (dataset + USDA) e confezionati (Open Food Facts)
                     in parallelo, dizionario IT→EN, HTTP con timeout/retry, cache, validazione (+ test)
  data/              genericFoods.it.json (dataset generato da USDA)
  services/          scritture su Firestore e conversione dei documenti
  hooks/             listener in tempo reale (profilo, giorno, intervalli, alimenti, recenti, peso)
  contexts/          Auth, Tema, Notifiche
  components/ui/     Button, Card, Sheet (pannello modale), campi, anello e barre di progresso…
  components/layout/ barra di navigazione, banner offline, error boundary
  features/
    auth/            login e schermata "configurazione mancante"
    diary/           pagina diario, navigazione giorni, riepilogo, pasti, aggiunta e modifica voci
    picker/          selettore alimenti: ricerca, scanner, miei, recenti, manuale, quantità
    foods/           alimenti personali e ricette
    history/         grafici calorie e peso, statistiche
    profile/         profilo e obiettivi, tema, esportazione CSV
firestore.rules      regole di sicurezza
firestore.indexes.json
firebase.json · .firebaserc · .firebaserc.example
```

## Modello dati Firestore

| Percorso | Contenuto |
|---|---|
| `users/{uid}` | profilo e obiettivi: `sex`, `age`, `heightCm`, `weightKg`, `activityLevel`, `goal`, `kcalTarget`, `kcalManual`, `proteinTarget`, `carbsTarget`, `fatTarget` |
| `users/{uid}/entries/{id}` | voce di diario: `date` (`YYYY-MM-DD`), `mealType`, `name`, `brand`, `grams`, `kcal`, `protein`, `carbs`, `fat`, `per100` (valori per 100 g, per ricalcolare se cambi i grammi), `source` (`off` / `manual` / `custom` / `recipe`), `foodId`, `barcode`, `createdAt` |
| `users/{uid}/foods/{id}` | alimento personale o ricetta: `name`, `brand`, `barcode`, `per100`, `defaultGrams`, `favorite`, `kind` (`food` / `recipe`), `ingredients` |
| `users/{uid}/weights/{YYYY-MM-DD}` | peso del giorno: `date`, `kg` (l'id è la data → un valore al giorno) |

**Indici**: tutte le query dell'app usano solo gli indici a campo singolo che Firestore crea automaticamente (l'ordinamento secondario avviene nel browser), quindi **non devi creare indici a mano**. `firestore.indexes.json` esclude dall'indicizzazione i campi `per100` e `ingredients`, che non vengono mai interrogati: è un'ottimizzazione facoltativa da applicare con `firebase deploy --only firestore:indexes`.

## Sicurezza

- Nessuna credenziale nel codice: i valori arrivano da `.env` (ignorato da git) in locale e dai GitHub Secrets in CI. Non committare mai `.env` né file di service account (sono nel `.gitignore`).
- Le regole Firestore isolano i dati per utente e validano i campi; limita la API key (passo 6).
- Il CSV esportato neutralizza i testi che inizierebbero con `=`, `+`, `-`, `@` (protezione da "CSV injection").

Dati nutrizionali: © contributori di Open Food Facts, licenza [ODbL](https://opendatacommons.org/licenses/odbl/1-0/). I valori calcolati sono stime e non sostituiscono il parere di un professionista.
