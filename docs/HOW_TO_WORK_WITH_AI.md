# Lavorare sul progetto con un assistente AI

## Cosa dare all'assistente in una nuova chat

Come minimo:
1. **`CLAUDE.md`** (root): regole, comandi, convenzioni.
2. **`docs/PROJECT_CONTEXT.md`**: il progetto in una pagina.

Poi, a seconda del compito:

| Compito | Documenti da aggiungere |
|---|---|
| Nuova funzionalità o schermata | `docs/ARCHITECTURE.md`, `docs/UI_SCREENS.md`, `docs/FUNCTIONS.md` (le sezioni dei moduli coinvolti) |
| Dati o regole Firestore | `docs/DATA_MODEL.md`, `firestore.rules` |
| Ricerca alimenti | `docs/SEARCH_PIPELINE.md` |
| Login, offline, logout | `docs/FLOWS.md`, `docs/DECISIONS.md` (ADR-03, ADR-07, ADR-11) |
| Deploy o configurazione | `docs/DEPLOY_AND_CONFIG.md` |
| Correzione di un bug noto | `docs/KNOWN_ISSUES.md` |

Se l'assistente ha accesso al repository (per esempio Claude Code), basta dirgli di leggere `CLAUDE.md` e `docs/PROJECT_CONTEXT.md`: troverà il resto da solo.

## Come descrivere un nuovo compito

- **Cosa** deve succedere, dal punto di vista dell'utente (schermata, pulsante, messaggio esatto in italiano).
- **Cosa non toccare** (per esempio "non cambiare valori nutrizionali né formato dei nomi").
- **Come verificarlo**: test da aggiungere, prove nel browser, casi offline.
- **Cosa consegnare**: branch, commit, Pull Request, aggiornamento della documentazione.
- Chiedere di **dire esplicitamente cosa non ha potuto verificare** (API esterne, iPhone, login reale).

## Checklist prima di una Pull Request

- [ ] `npm run lint` senza errori
- [ ] `npm test` tutto verde, con test per la logica nuova (in `src/lib/` si testa facilmente)
- [ ] `npm run build` passa
- [ ] se cambiano `firestore.rules` o i campi scritti dai servizi: `npm run test:rules` e una nota "ripubblicare le regole" nella PR
- [ ] nessuna credenziale nel diff (`.env`, chiavi, service account)
- [ ] valori nutrizionali non inventati; formato "Categoria - Alimento (dettaglio)" rispettato
- [ ] dati solo sotto `users/{uid}`
- [ ] scritture Firestore non attese nell'interfaccia (offline)
- [ ] documentazione aggiornata: `npm run docs:functions` se cambiano gli export, poi `npm run docs:check`

## Convenzioni dei commit

Dalla storia del repository (`git log`):
- **messaggi in italiano**, al presente, con l'area in testa quando serve: `Login Google: solo popup, …`, `Dataset generico: …`, `Docs: …`, `README: …`;
- un corpo con elenco puntato del perché e del cosa, quando la modifica non è banale;
- un commit per argomento coerente;
- si lavora su un branch e si apre una Pull Request verso `main`; la CI (`check` e `rules`) deve essere verde prima del merge.

## Modelli di prompt

### Aggiungere una funzionalità
```
Leggi CLAUDE.md e docs/PROJECT_CONTEXT.md.
Voglio aggiungere: <descrizione dal punto di vista dell'utente>.
Vincoli: non modificare <…>; testi dell'interfaccia in italiano; dati solo sotto users/{uid};
nessun valore nutrizionale inventato.
Prima dimmi in breve quali file toccherai (vedi docs/ARCHITECTURE.md e docs/FUNCTIONS.md),
poi implementa con test Vitest per la logica nuova.
Verifica: npm run lint, npm test, npm run build; se cambiano campi o regole, npm run test:rules.
Aggiorna la documentazione in docs/ (npm run docs:functions, npm run docs:check).
Committa su un branch e prepara la PR. Dimmi cosa non hai potuto verificare.
```

### Correggere un bug
```
Leggi CLAUDE.md e docs/PROJECT_CONTEXT.md.
Bug: <cosa succede> invece di <cosa dovrebbe succedere>. Passi per riprodurlo: <…>.
Dispositivo/browser: <…>. Messaggio d'errore esatto: <…>.
Trova la causa nel codice (non supporre), scrivi prima un test che fallisce, poi correggi
con la modifica minima. Non toccare altro. Controlla se il bug è in docs/KNOWN_ISSUES.md
e aggiorna quel file. Verifica con lint, test e build, committa e prepara la PR.
```

### Modificare la ricerca alimenti
```
Leggi CLAUDE.md, docs/PROJECT_CONTEXT.md e docs/SEARCH_PIPELINE.md.
Problema nella ricerca: cercando "<query>" ottengo <risultati>, mi aspetto <risultati>.
Regole: valori nutrizionali solo da USDA/Open Food Facts (mai inventati); formato dei nomi
"Categoria - Alimento (dettaglio)"; un token USDA sconosciuto fa scartare la voce.
Se servono nuove voci di dizionario (translate.ts, usdaToItalian.ts) o nel dataset
(scripts/genericFoods.defs.ts), aggiungi i test relativi. Se cambia il dataset, prova il
workflow "Genera alimenti generici (USDA)" sul branch. Dimmi se non puoi raggiungere le API.
```

### Modificare le regole Firestore
```
Leggi CLAUDE.md, docs/PROJECT_CONTEXT.md e docs/DATA_MODEL.md.
Devo <aggiungere il campo X a / creare la collezione Y sotto> users/{uid}.
Aggiorna insieme: tipi (src/types.ts), mapper (src/services/mappers.ts), servizi che
scrivono, firestore.rules (hasOnly e validazione) e i test in tests/rules/firestore.rules.emu.ts
(un caso valido e almeno un caso rifiutato, più l'isolamento tra utenti).
Esegui npm run test:rules. Nella PR scrivi chiaramente che le regole vanno ripubblicate
a mano dalla Firebase Console o con firebase deploy --only firestore:rules.
```
