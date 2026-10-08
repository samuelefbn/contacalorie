# Documentazione di ContaCalorie

## Ordine di lettura consigliato

1. [`../CLAUDE.md`](../CLAUDE.md): regole, comandi e convenzioni, in breve. Per assistenti AI, ma utile a tutti.
2. [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md): tutto il progetto in una pagina. Da incollare in una nuova chat.
3. [`ARCHITECTURE.md`](ARCHITECTURE.md): livelli, cartelle, routing, stato, tema, PWA e offline.
4. [`DATA_MODEL.md`](DATA_MODEL.md): collezioni Firestore, campi, indici, regole di sicurezza, sincronizzazione e conflitti.
5. [`FLOWS.md`](FLOWS.md): diagrammi di login, logout, onboarding, tutorial di benvenuto, diario, ricerca, scansione, offline, calcoli, export ed eliminazione dell'account.
6. Poi, secondo il compito:
   - [`SEARCH_PIPELINE.md`](SEARCH_PIPELINE.md): ranking, normalizzazione, dizionari IT→EN e USDA→IT, dataset, come aggiungere voci.
   - [`UI_SCREENS.md`](UI_SCREENS.md): schermate, dati mostrati, azioni, navigazione.
   - [`FUNCTIONS.md`](FUNCTIONS.md): riferimento di tutte le funzioni, gli hook e i componenti esportati (generato dal codice).
   - [`DEPLOY_AND_CONFIG.md`](DEPLOY_AND_CONFIG.md): variabili d'ambiente, GitHub Actions e Pages, Firebase, restrizioni della API key, checklist.
   - [`DECISIONS.md`](DECISIONS.md): perché le cose sono fatte così (decisioni confermate o da confermare).
   - [`KNOWN_ISSUES.md`](KNOWN_ISSUES.md): bug noti, limiti, debito tecnico, idee future.
   - [`HOW_TO_WORK_WITH_AI.md`](HOW_TO_WORK_WITH_AI.md): come riprendere il lavoro, checklist della PR, modelli di prompt.

## Mantenere la documentazione allineata

- `npm run docs:functions` rigenera [`FUNCTIONS.md`](FUNCTIONS.md) dagli export di `src/`. Le descrizioni vengono dai commenti TSDoc del codice e da `scripts/docs/descriptions.ts`.
- `npm run docs:check` controlla:
  - che ogni percorso citato (`src/…`, `scripts/…`, `tests/…`, `docs/…`, `.github/…`, `public/…`) esista;
  - che i blocchi Mermaid non siano vuoti e dichiarino un tipo di diagramma;
  - che `FUNCTIONS.md` sia aggiornato e che ogni export abbia scopo ed effetti collaterali;
  - che non ci siano valori che sembrano chiavi reali.
- I diagrammi sono in Mermaid: GitHub li mostra direttamente.
