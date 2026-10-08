# ContaCalorie — contesto del progetto (da incollare in una nuova chat)

## Scopo
PWA personale in italiano per contare le calorie. L'utente accede con Google e registra i pasti (colazione, pranzo, cena, spuntini). Vede calorie e macronutrienti rispetto a un obiettivo calcolato (Mifflin-St Jeor), lo storico a 7 o 30 giorni e il peso. Cerca gli alimenti per nome o con lo scanner del codice a barre. Funziona offline e sincronizza da sola. Indirizzo: `https://samuelefbn.github.io/contacalorie/`.

## Stack
- React 19 + TypeScript strict + Vite 8 + Tailwind CSS v4 (tema chiaro/scuro), recharts, `@zxing/browser`, Fuse.js.
- Firebase 12 modulare: Authentication (Google, **solo popup**) e Cloud Firestore con cache persistente IndexedDB. Nessun backend proprio. Analytics **non** inizializzato.
- Dati nutrizionali: **USDA FoodData Central** (dataset locale generato + API live) e **Open Food Facts** (confezionati), chiamati dal browser.
- PWA con vite-plugin-pwa (Workbox): app shell in precache, API in stale-while-revalidate.
- Hosting: GitHub Pages (`base: '/contacalorie/'`), deploy con GitHub Actions; variabili dai GitHub Secrets.
- Test: Vitest (`npm test`) + test delle regole Firestore con l'emulatore (`npm run test:rules`, serve Java).

## Struttura delle cartelle
```
src/App.tsx            provider, login, onboarding, tutorial, schede nell'hash (#/diario, #/alimenti, #/storico, #/profilo)
src/types.ts           tipi: Profile, Entry, Food, WeightEntry, PendingScan, FoodItem, Nutrients…
src/lib/               logica pura testata: nutrition (BMR/TDEE/macro), dates (YYYY-MM-DD locali), format, csv,
                       foodLibrary (chiavi alimenti), myFoodsSearch (Fuse), pendingScanQueue, syncState,
                       localData (pulizia al logout), inAppBrowser (WebView, errori popup), firebase.ts (init)
src/lib/foodSearch/    ricerca: dataset generico, ranking, traduzione IT→EN e USDA→IT, client HTTP, cache, OFF, USDA
src/data/              genericFoods.it.json (circa 384 alimenti, valori da USDA, generato da script)
src/services/          UNICO livello che scrive su Firestore: entries, foods, profile, weights, pendingScans,
                       account (export/eliminazione), session (logout sicuro), mappers, refs
src/hooks/             listener in tempo reale (data.ts, useFirestore.ts), useHashTab, useOnlineStatus,
                       useInstallPrompt, usePendingScanCompletion
src/contexts/          AuthContext, ThemeContext, ToastContext, SyncContext
src/components/        ui/ (Button, Card, Sheet, campi, Progress, PendingMark…), layout/ (BottomNav, ErrorBoundary, SyncIndicator)
src/features/          auth, account, diary, picker (ricerca, scanner, quantità), foods, history, profile, tutorial
scripts/               build-generic-foods.ts + genericFoods.defs.ts (dataset), usdaPicker.ts, docs/ (strumenti doc)
tests/rules/           test delle regole Firestore
firestore.rules        regole di sicurezza (da pubblicare A MANO)
.github/workflows/     ci.yml (lint, test, build + regole), deploy.yml (Pages), generic-foods.yml (dataset)
docs/                  documentazione dettagliata (vedi docs/README.md)
```

## Modello dati (Firestore, tutto sotto `users/{uid}`)
- `users/{uid}`: profilo e obiettivi: sex, age, heightCm, weightKg, activityLevel, goal, kcalTarget, kcalManual, target dei macro, `onboarded`, `tutorial` (`completed`, `completedAt`, `version`, `skipped`; letto a parte da `toTutorialState`).
- `users/{uid}/entries/{id}`: voci del diario, con id generato sul dispositivo. Campi: date `YYYY-MM-DD`, mealType, name, brand, grams, kcal/protein/carbs/fat (per la quantità), `per100`, source (`off`/`usda`/`manual`/`custom`/`recipe`), foodId, barcode, createdAt.
- `users/{uid}/foods/{foodId}`: "i miei alimenti" e ricette. L'id è la chiave dell'alimento (`foodKey`): codice a barre, `gen-…` del dataset, `usda-…`, oppure `n-nome--marca`. Campi: per100, defaultGrams, servingGrams, favorite, kind (`food`/`recipe`), ingredients, type (`packaged`/`generic`/`custom`/`recipe`), origin (`scan`/`search`/`manual`/`recipe`), useCount, lastUsedAt.
- `users/{uid}/weights/{YYYY-MM-DD}`: kg (un valore al giorno).
- `users/{uid}/pendingScans/{barcode}`: codici scansionati offline da completare, status `pending`/`not_found`.
- Regole: accesso solo se `request.auth.uid == uid`, validazione di tipi e limiti (per 100 g: kcal 0–1000, macro 0–100), tutto il resto negato. Conflitti: vince l'ultima scrittura.

## Flussi principali
1. **Login**: `signInWithPopup` nel click (niente redirect: GitHub Pages ≠ authDomain). Popup bloccato → messaggio con "Riprova". Browser in-app (WhatsApp, Instagram…) → login disattivato e "Copia link". Persistenza in localStorage, poi IndexedDB, poi sessionStorage.
2. **Primo accesso**: se il server conferma che il profilo non esiste → `createUserDoc` (`onboarded: false`) → onboarding (profilo) → tutorial di benvenuto (una volta, 7 passi; stato in `users/{uid}.tutorial` + cache locale per uid; "Rivedi il tutorial" in Account) → app.
3. **Aggiunta al diario**: Diario → + su un pasto → ricerca, scanner, Miei, Recenti o Manuale → quantità → `recordFoodUse` (crea o aggiorna l'alimento in `foods`: `lastUsedAt`, `useCount`) + `addEntry`.
4. **Ricerca**: I miei alimenti (Fuse sul dispositivo) → dataset generico (offline) → USDA live se il dataset trova meno di 5 voci → Open Food Facts in parallelo. Ranking: prima gli alimenti semplici; trasformati espandibili; deduplica; cache di 24 h.
5. **Scansione**: già salvato → nessuna chiamata a Open Food Facts (aggiorna l'uso). Nuovo e online → OFF → salvato con id uguale al codice. Nuovo e offline → "Salva per dopo" (`pendingScans`), completato in automatico al ritorno della rete, con notifica.
6. **Offline**: scritture mai attese nell'interfaccia; indicatore nell'header (Online / Offline / Sincronizzazione in corso (N) / Tutto sincronizzato); pallino arancione sulle voci non sincronizzate.
7. **Logout sicuro**: `waitForPendingWrites` (o conferma se offline) → signOut → terminate → clearIndexedDbPersistence → pulizia delle chiavi dell'app e della cache `food-data` → ricarica.
8. **Storico e peso**: media sui soli giorni registrati, media settimanale, grafici; il peso di oggi aggiorna il profilo e ricalcola l'obiettivo se non è manuale.
9. **Export ed eliminazione**: CSV (diario, peso, alimenti) e JSON completo. Eliminazione dell'account con doppia conferma (scrivere `ELIMINA`) e nuovo accesso se Firebase lo chiede.

## Decisioni importanti
- Valori nutrizionali **mai inventati**: dataset generato dallo script tramite l'API USDA; nessun numero a mano.
- Nomi dei generici **"Categoria - Alimento (dettaglio)"** (es. `Frutta - Mela (Fuji, con buccia, cruda)`); i prodotti con marca si mostrano come "Nome - Marca". Una voce USDA non traducibile viene scartata: mai inglese nell'interfaccia.
- Nessuno store globale: listener Firestore + 4 Context. Nessun router: schede nell'hash.
- Regole Firestore pubblicate a mano e provate in CI sull'emulatore.
- Motivazioni complete in `docs/DECISIONS.md`.

## Stato attuale
- **Funziona e ha test**:
  - diario, ricerca a tre fonti, scanner, miei alimenti senza doppioni, ricette, storico, peso, export;
  - offline con indicatore, logout sicuro, onboarding, tutorial di benvenuto, eliminazione dell'account;
  - regole verificate sull'emulatore (36 test), circa 198 unit test (anche componenti con Testing Library e jsdom).
- **Non verificato**: login reale su iPhone e browser in-app (container senza accesso a Google), caso `requires-recent-login`, API reali dall'ambiente di sviluppo.
- **Problemi noti** (`docs/KNOWN_ISSUES.md`):
  - "Salva tra i miei alimenti" quasi mai visibile in `EntryEditor`;
  - "Annulla" sposta la voce in fondo;
  - codici in coda non ritentati periodicamente;
  - conteggio delle modifiche in attesa approssimato.

## Cosa NON toccare (senza una richiesta esplicita)
- Credenziali: mai committare `.env`, chiavi o service account. Nei documenti nessun valore reale.
- Valori nutrizionali e dataset (`src/data/genericFoods.it.json` si rigenera solo con lo script o il workflow).
- Formato dei nomi dei generici e regola "token sconosciuto = voce scartata".
- Percorso dei dati `users/{uid}/…` e isolamento nelle regole; ogni campo nuovo va aggiunto anche a `firestore.rules`, che poi vanno ripubblicate.
- Login solo con popup (niente `signInWithRedirect`).
- `base: '/contacalorie/'` in `vite.config.ts` (GitHub Pages).

## Comandi
`npm install` · `npm run dev` · `npm run build` · `npm run lint` · `npm test` · `npm run test:rules` · `npm run build:foods` · `npm run docs:functions` · `npm run docs:check`
