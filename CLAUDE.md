# CLAUDE.md — istruzioni per assistenti AI

ContaCalorie: PWA personale in italiano per contare le calorie. Diario dei pasti, obiettivo calorico e macro, storico, peso, ricerca alimenti (USDA + Open Food Facts) e scanner del codice a barre, offline-first. Il contesto completo in una pagina è in **`docs/PROJECT_CONTEXT.md`**: leggilo per primo.

## Stack
React 19 · TypeScript strict · Vite 8 · Tailwind CSS v4 · Firebase 12 (Auth Google con popup, Firestore con cache persistente) · vite-plugin-pwa · recharts · @zxing/browser · Fuse.js · Vitest. Hosting su GitHub Pages (`base: '/contacalorie/'`).

## Comandi
```bash
npm install
npm run dev            # http://localhost:5173/contacalorie/ (serve .env, vedi .env.example)
npm run build          # tsc -b + vite build
npm run lint           # ESLint
npm test               # Vitest
npm run test:rules     # regole Firestore sull'emulatore (npx firebase-tools, serve Java)
npm run build:foods    # rigenera src/data/genericFoods.it.json da USDA (serve VITE_USDA_API_KEY)
npm run docs:functions # rigenera docs/FUNCTIONS.md dagli export
npm run docs:check     # verifica percorsi citati, Mermaid e FUNCTIONS.md
```

## Dove mettere le mani
- Logica pura e testabile: `src/lib/` (ricerca in `src/lib/foodSearch/`).
- Scritture Firestore: **solo** in `src/services/`.
- Listener e stato: `src/hooks/`, `src/contexts/`.
- Schermate: `src/features/<area>/`; componenti di base in `src/components/ui/`.
- Tipi del modello dati: `src/types.ts`; lettura dei documenti: `src/services/mappers.ts`.

## Convenzioni di codice
- Testi dell'interfaccia, commenti, commit e documentazione **in italiano**.
- Stile del codice esistente: niente punto e virgola, apici singoli, componenti funzionali, export con nome. I commenti spiegano il perché.
- Scritture Firestore **mai attese** per aggiornare l'interfaccia: `servizio(...).catch(reportError)`; i listener aggiornano la UI (offline).
- Id delle voci generati sul dispositivo; date come stringhe locali `YYYY-MM-DD` (`src/lib/dates.ts`).
- Query Firestore memoizzate con `useMemo`; funzioni `map` dei listener definite a livello di modulo.
- Nuova logica → test Vitest accanto al file (`*.test.ts`).
- Commit al presente con l'area in testa (`Login Google: …`, `Docs: …`); si lavora su un branch e si apre una PR verso `main`.

## Regole da non violare
1. **Mai committare credenziali**: `.env`, chiavi, service account. Nei documenti nessun valore reale delle variabili.
2. **Valori nutrizionali mai inventati**: arrivano da USDA (dataset generato dallo script o API live) o da Open Food Facts. Non scrivere numeri a mano nel dataset.
3. **Formato dei nomi dei generici**: `Categoria - Alimento (dettaglio)` (`formatFoodLabel`, es. `Frutta - Mela (Fuji, con buccia, cruda)`). Una descrizione USDA con un token non tradotto va **scartata**, mai mostrata in inglese.
4. **Dati sempre sotto `users/{uid}`**. Ogni campo nuovo va aggiunto anche a `firestore.rules` (`hasOnly` + validazione) e ai test in `tests/rules/`; poi le regole vanno **ripubblicate a mano** (scrivilo nella PR).
5. **Login solo con `signInWithPopup`** chiamato direttamente nel click: niente `signInWithRedirect`.
6. Non toccare `base` in `vite.config.ts` né il dataset `src/data/genericFoods.it.json`, se non richiesto.
7. Prima di una PR: `npm run lint`, `npm test`, `npm run build` (e `npm run test:rules` se cambiano dati o regole). Dichiara cosa non hai potuto verificare (API esterne, iPhone, login reale).

## Documentazione (`docs/`)
- `docs/README.md` — indice e ordine di lettura
- `docs/PROJECT_CONTEXT.md` — tutto il progetto in una pagina
- `docs/ARCHITECTURE.md` — livelli, cartelle, routing, stato, tema, PWA e offline
- `docs/DATA_MODEL.md` — collezioni, campi, indici, regole, sincronizzazione e conflitti
- `docs/FLOWS.md` — diagrammi dei flussi (login, logout, ricerca, scansione, offline…)
- `docs/FUNCTIONS.md` — riferimento di funzioni, hook e componenti (generato)
- `docs/SEARCH_PIPELINE.md` — ranking, dizionari, traduzione USDA, dataset
- `docs/UI_SCREENS.md` — schermate e navigazione
- `docs/DEPLOY_AND_CONFIG.md` — variabili, workflow, Firebase, checklist
- `docs/DECISIONS.md` — decisioni architetturali
- `docs/KNOWN_ISSUES.md` — bug noti, limiti, debito tecnico
- `docs/HOW_TO_WORK_WITH_AI.md` — come riprendere il lavoro e modelli di prompt
