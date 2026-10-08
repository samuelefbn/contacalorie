# ContaCalorie

App web personale per contare le calorie, in italiano. Registri ciò che mangi e vedi subito se rispetti il tuo obiettivo di calorie e macronutrienti. È una **PWA** installabile sul telefono, **funziona anche offline** (sincronizza da sola al ritorno della rete) e usa **Firebase** (Authentication + Firestore) per i dati privati di ogni utente.

**Indirizzo:** https://samuelefbn.github.io/contacalorie/

> Documentazione tecnica completa in [`docs/`](docs/README.md). Per assistenti AI: [`CLAUDE.md`](CLAUDE.md) e [`docs/PROJECT_CONTEXT.md`](docs/PROJECT_CONTEXT.md).

## Funzionalità

- **Accesso con Google** e **dati privati**: ogni utente vede solo i propri dati, garantito dalle regole di Firestore. Al primo accesso c'è un breve **onboarding**.
- **Diario giornaliero** diviso in colazione, pranzo, cena e spuntini, con kcal e macro per voce; si modifica o si elimina (con **Annulla**).
- **Dashboard** del giorno: anello delle calorie rimanenti o in eccesso e barre di proteine, carboidrati e grassi.
- **Obiettivo calorico** con la formula di **Mifflin-St Jeor** × fattore di attività (−500 kcal per dimagrire, +300 per aumentare, soglia minima di sicurezza), impostabile anche a mano, con target dei macro.
- **Ricerca alimenti** mentre scrivi, su tre fonti con valori reali:
  - i tuoi alimenti;
  - un dataset di circa 384 alimenti generici italiani generato da [USDA FoodData Central](https://fdc.nal.usda.gov), più USDA live;
  - i prodotti confezionati di [Open Food Facts](https://world.openfoodfacts.org).

  I nomi dei generici sono in italiano nel formato **"Categoria - Alimento (dettaglio)"**, per esempio `Frutta - Mela (Fuji, con buccia, cruda)`.
- **Scanner del codice a barre** (fotocamera o codice digitato). Ogni prodotto scansionato viene salvato senza doppioni; offline c'è **"Salva per dopo"**.
- **I miei alimenti, preferiti e ricette**: tutto ciò che usi diventa ricercabile per primo; le ricette si creano dagli ingredienti o da un pasto intero.
- **Storico** di 7 o 30 giorni con grafico, media giornaliera e settimanale; **registrazione e grafico del peso**.
- **Esportazione** in CSV (diario, peso, alimenti) e JSON; **eliminazione dell'account** con tutti i dati.
- **Offline-first**: indicatore di sincronizzazione nell'header, voci non ancora sincronizzate segnate con un pallino.
- Tema chiaro, scuro o di sistema.

## Schermate

| Schermata | Cosa contiene |
|---|---|
| **Accesso** | logo, "Accedi con Google", avvisi se sei offline o in un browser interno (WhatsApp, Instagram…) |
| **Benvenuto** (primo accesso) | sesso, età, altezza, peso, attività, obiettivo; "Crea profilo" o "Salta per ora" |
| **Diario** | giorno precedente o successivo e calendario; anello delle kcal e barre dei macro; i quattro pasti con le voci e il pulsante **+** |
| **Aggiungi alimento** | schede Cerca (con scanner), Miei, Recenti, Manuale; poi quantità con anteprima di kcal e macro |
| **Alimenti** | i miei alimenti e le ricette, filtri, preferiti, codici "da completare" |
| **Storico** | grafico delle calorie, medie, tabella settimanale; sezione peso con grafico |
| **Profilo** | account (foto, email, ultimo accesso, Esci), profilo e obiettivi, tema, installazione, esportazioni, eliminazione dell'account |

Dettagli e schema di navigazione: [`docs/UI_SCREENS.md`](docs/UI_SCREENS.md).

## Avvio rapido (sviluppo)

Requisiti: Node.js 20.19 o superiore (consigliato 22).

```bash
npm install
cp .env.example .env     # inserisci i valori Firebase e VITE_USDA_API_KEY (il file .env non va mai committato)
npm run dev              # http://localhost:5173/contacalorie/
npm test                 # unit test (Vitest)
npm run build            # build di produzione in dist/
```

Altri comandi (`npm run lint`, `npm run test:rules`, `npm run build:foods`, `npm run docs:check`…) ed emulatori Firebase: [`docs/DEPLOY_AND_CONFIG.md`](docs/DEPLOY_AND_CONFIG.md).

## Pubblicazione: cosa configurare

Il deploy su GitHub Pages è automatico a ogni push su `main`. Una sola volta, a mano:

1. **GitHub Secrets**: le 7 variabili Firebase e `VITE_USDA_API_KEY` (Settings → Secrets and variables → Actions).
2. **GitHub Pages**: Settings → Pages → Source: **GitHub Actions**.
3. **Firebase Authentication**: provider Google attivo e `samuelefbn.github.io` tra i **domini autorizzati**; `VITE_FIREBASE_AUTH_DOMAIN` = `<progetto>.firebaseapp.com`.
4. **Regole di Firestore**: incolla `firestore.rules` in Firebase Console → Firestore → Regole → **Pubblica**. Da ripetere **ogni volta che il file cambia**, altrimenti compare "Permesso negato".
5. **API key** limitata per referrer e per API dalla Google Cloud Console.
6. **Dataset dei generici**: Actions → "Genera alimenti generici (USDA)" → Run workflow.

Procedura completa, tabella delle variabili e checklist: [`docs/DEPLOY_AND_CONFIG.md`](docs/DEPLOY_AND_CONFIG.md).

## Problemi di accesso

L'accesso usa **solo la finestra (popup) di Google**, aperta direttamente al tocco su "Accedi con Google". L'app non usa il reindirizzamento (`signInWithRedirect`): è ospitata su GitHub Pages, un dominio diverso da `authDomain`, e su Safari/iOS e nei browser delle app il reindirizzamento perdeva il suo stato ("Unable to process request due to missing initial state…"). L'accesso resta salvato sul dispositivo.

- **iPhone / iPad**: apri il sito in **Safari** (o Chrome) e tocca "Accedi con Google"; dopo l'accesso la finestra si chiude da sola. Se non si apre nulla: **Impostazioni → Safari** → disattiva **"Blocca finestre a comparsa"**, poi **Riprova**. Con "Blocca cookie" attivo l'accesso può fallire.
- **App installata sulla schermata Home**: funziona come in Safari. Se fallisce, accedi una volta in Safari e riapri l'app.
- **Link aperto da WhatsApp, Instagram, Facebook, Messenger, TikTok, LINE, LinkedIn**: Google blocca l'accesso in questi browser interni. L'app mostra **"Per accedere apri questo link in Safari o Chrome"** con **"Copia link"** e disattiva il pulsante. In alternativa usa il menu dell'app (⋯ o ↗) → "Apri nel browser".
- **Popup bloccati (computer o Android)**: compare "La finestra di accesso di Google non si è aperta" con **Riprova**; consenti i popup per il sito.
- **Finestra chiusa per errore**: nessun messaggio, basta toccare di nuovo "Accedi con Google".
- **`auth/unauthorized-domain`**: aggiungi il dominio GitHub Pages ai domini autorizzati di Firebase Authentication.

**Come provarlo su iPhone**:
1. Apri il sito in Safari, accedi e verifica di arrivare al diario.
2. Chiudi e riapri Safari: devi essere ancora collegato.
3. Apri il link da WhatsApp: deve comparire l'avviso con "Copia link".
4. Prova anche da Chrome e dall'app sulla schermata Home.

## Provare l'offline a mano

1. Apri l'app, accedi e aspetta "Online" nell'header.
2. **DevTools (F12) → Network → Throttling: Offline** (oppure Application → Service Workers → "Offline").
3. L'header mostra **Offline**. Aggiungi due o tre voci, registra il peso, scansiona o digita un codice mai visto e premi **Salva per dopo**: l'header diventa "Offline · N modifiche in attesa" e le voci hanno il pallino arancione.
4. Ricarica ancora offline: l'app si apre (service worker) e le voci ci sono (cache di Firestore).
5. Rimetti **No throttling**: "Sincronizzazione in corso (N modifiche in attesa)", poi **"Tutto sincronizzato"**. I pallini spariscono e il codice salvato per dopo viene completato con una notifica.

Cosa non funziona offline e come si gestiscono i conflitti: [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) e [`docs/KNOWN_ISSUES.md`](docs/KNOWN_ISSUES.md).

## Documentazione

| Documento | Contenuto |
|---|---|
| [`docs/README.md`](docs/README.md) | indice e ordine di lettura |
| [`docs/PROJECT_CONTEXT.md`](docs/PROJECT_CONTEXT.md) | il progetto in una pagina |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | livelli, cartelle, routing, stato, PWA e offline |
| [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) | collezioni Firestore, regole, sincronizzazione |
| [`docs/FLOWS.md`](docs/FLOWS.md) | diagrammi dei flussi principali |
| [`docs/SEARCH_PIPELINE.md`](docs/SEARCH_PIPELINE.md) | ricerca alimenti, dizionari, dataset |
| [`docs/FUNCTIONS.md`](docs/FUNCTIONS.md) | riferimento di funzioni, hook e componenti |
| [`docs/UI_SCREENS.md`](docs/UI_SCREENS.md) | schermate e navigazione |
| [`docs/DEPLOY_AND_CONFIG.md`](docs/DEPLOY_AND_CONFIG.md) | variabili, workflow, Firebase, checklist |
| [`docs/DECISIONS.md`](docs/DECISIONS.md) | decisioni architetturali |
| [`docs/KNOWN_ISSUES.md`](docs/KNOWN_ISSUES.md) | problemi noti e idee future |
| [`docs/HOW_TO_WORK_WITH_AI.md`](docs/HOW_TO_WORK_WITH_AI.md) | come riprendere il lavoro con un assistente AI |

## Sicurezza e privacy

- Nessuna credenziale nel codice: i valori arrivano da `.env` (ignorato da git) in locale e dai GitHub Secrets in CI. Non committare mai `.env` né file di service account.
- Le regole di Firestore isolano i dati per utente (`request.auth.uid == uid`), validano tipi e limiti dei campi e bloccano qualsiasi altro percorso; sono provate con l'emulatore (`npm run test:rules`).
- **Logout sicuro** per i dispositivi condivisi: prima di uscire l'app sincronizza (o avvisa se sei offline), poi cancella la copia locale dei dati e le cache.
- Il CSV esportato neutralizza i testi che inizierebbero con `=`, `+`, `-`, `@` ("CSV injection").
- Analytics non viene inizializzato.

Dati nutrizionali: USDA FoodData Central e © contributori di Open Food Facts, licenza [ODbL](https://opendatacommons.org/licenses/odbl/1-0/). I valori calcolati sono stime e non sostituiscono il parere di un professionista.
