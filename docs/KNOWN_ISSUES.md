# Problemi noti, limiti e lacune

Ricavati dalla lettura del codice e dalle prove fatte durante lo sviluppo. Nel codice **non ci sono commenti `TODO` o `FIXME`**: le voci qui sotto vengono da comportamenti osservati o dedotti. Per ognuna è indicato se è *verificata* (provata o leggibile direttamente nel codice) o *da verificare*.

## Bug e comportamenti discutibili

| # | Descrizione | Dove | Stato |
|---|---|---|---|
| B1 | **"⭐ Salva tra i miei alimenti" quasi mai visibile**: `EntryEditor` lo mostra solo se la voce non ha `foodId`, ma dal commit `83c6f84` ogni voce aggiunta dal diario ha `foodId`. Per le voci nuove il preferito si può impostare solo dalla pagina Alimenti o dalla ricerca. | `src/features/diary/EntryEditor.tsx` | verificata nel codice |
| B2 | **"Annulla" dopo l'eliminazione cambia l'ordine**: `restoreEntry` ricrea la voce con un nuovo `createdAt`, e il diario ordina per `createdAt`, quindi la voce ripristinata finisce in fondo al pasto. | `src/services/entries.ts`, `useDayEntries` | verificata nel codice |
| B3 | **Codice "da completare" non ritentato**: se la rete risponde male mentre si è online (`retryLater`), il codice resta in coda finché non cambiano lo stato online o la lista dei codici; non c'è un nuovo tentativo periodico. | `src/hooks/usePendingScanCompletion.ts` | verificata nel codice |
| B4 | Un codice "non trovato" invita a crearlo con "+ Alimento", ma l'editor **non riceve il codice precompilato**. | `src/features/foods/FoodsPage.tsx` | verificata nel codice |
| B5 | **Conteggio delle modifiche in attesa approssimato**: considera solo le voci degli ultimi 90 giorni più le ultime 50 create, e prende il massimo delle due query invece di unirle. Una modifica a una voce più vecchia non viene contata. | `src/contexts/SyncContext.tsx` | verificata nel codice |
| B6 | Durante il logout, se un'altra scheda tiene aperta la copia locale, `clearIndexedDbPersistence` fallisce dopo 5 tentativi: resta solo un avviso in console e **i dati possono restare su disco**. | `src/services/session.ts` | verificata nel codice |
| B7 | **Eliminazione dell'account in due fasi non atomiche**: se `deleteUser` fallisce per un motivo diverso da `requires-recent-login`, i dati sono già cancellati ma l'account resta. | `src/features/account/MyDataSection.tsx`, `src/services/account.ts` | verificata nel codice |
| B8 | Il caso `auth/requires-recent-login` **non è mai stato provato** con un account reale. | `src/services/account.ts` | da verificare |

## Limiti dell'offline

- **Primo accesso**: richiede la rete. Il pulsante di login è disattivato offline.
- **Prodotti mai visti** (Open Food Facts) e **ricerca USDA live**: richiedono la rete. Funzionano offline solo le query già fatte (cache del service worker) e quelle del dataset locale.
- **Codici nuovi scansionati offline**: solo "Salva per dopo".
- **Esportazione** (`getDocs`): offline esporta solo ciò che è nella copia locale. **Eliminazione dell'account**: richiede la rete.
- **Conflitti**: vince l'ultima scrittura. Caso limite: un alimento non ancora arrivato su questo dispositivo, se usato offline, viene ricreato e al ritorno della rete sovrascrive l'originale (preferito e `useCount` ripartono). Vedi `docs/DATA_MODEL.md`.
- **Limite del browser**: cancellando i dati del sito, usando la navigazione privata o uscendo dall'account offline, le modifiche non ancora sincronizzate si perdono.

## API esterne

- **USDA**: senza `VITE_USDA_API_KEY` si usa `DEMO_KEY` (circa 30 richieste l'ora). La chiave finisce nel JavaScript pubblicato.
- **Open Food Facts**: la ricerca classica risponde spesso 503 senza intestazione CORS (il browser lo vede come errore di rete); per questo c'è Search-a-licious come prima fonte e i ritentativi. Le immagini dei prodotti arrivano dai server di Open Food Facts.
- **Copertura di USDA**: alcuni alimenti italiani non esistono in Foundation/SR Legacy e sono stati tolti dal dataset: prosciutto crudo, orata, mascarpone, salsiccia all'americana (cruda e cotta). Altri sono approssimati: il "fungo secco" è lo shiitake, la "coscia di tacchino" è la carne scura.
- **Traduttore USDA**: una voce con un token non tradotto viene scartata in silenzio. In produzione l'utente non lo sa e non ci sono log; il conteggio dei token mancanti esiste solo in sviluppo e nello script.

## Login, browser in-app e iOS

- Il **login reale su iPhone** (Safari, Chrome iOS, app installata sulla schermata Home) **non è stato verificato** in un ambiente di prova. È descritto come provarlo in `README.md`, sezione "Problemi di accesso". *Da verificare.*
- Il rilevamento delle **WebView iOS** è euristico: un user agent iPhone/iPad con WebKit, senza `Safari/` e senza i browser noti (CriOS, FxiOS, EdgiOS, OPiOS, DuckDuckGo, GSA). Un browser iOS sconosciuto potrebbe essere scambiato per una WebView e vedere il login disattivato. L'app installata sulla schermata Home è esclusa grazie a `navigator.standalone` / `display-mode: standalone`.
- Il messaggio "popup bloccato" è coperto solo da test unitari (`classifySignInError`), non da prove in un browser vero.
- Lo scanner richiede HTTPS e il permesso della fotocamera; se manca resta l'inserimento manuale del codice.

## Debito tecnico

- **Export non usati**: `fmtKcal` e `fmtGrams` (`src/lib/format.ts`), `SOURCE_LABEL` di `src/lib/foodSearch/types.ts` (riesportato da `src/lib/foodSearch/index.ts`, ma `ExportSection` ne definisce uno proprio), il tipo `DayPoint` usato solo nel suo file. Elenco completo con i chiamanti in `docs/FUNCTIONS.md`.
- **Test**: nessun test dei componenti React e nessun test end-to-end nel repository. Le prove nel browser sono state fatte a mano con script esterni. I test delle regole richiedono Java (in CI c'è il job `rules`).
- **README lungo**: contiene sia la guida all'uso sia la configurazione; i dettagli tecnici sono ora in `docs/`.
- **Regole Firestore**: vanno pubblicate a mano. Se il codice aggiunge un campo e le regole non vengono ripubblicate, le scritture falliscono ("Permesso negato").
- **`useRecentFoods`** legge le ultime 400 voci per ricavare gli alimenti recenti. Ora che ogni voce ha `foodId` e gli alimenti sono salvati in `foods`, è parzialmente ridondante.
- **Nessuna internazionalizzazione**: testi in italiano scritti direttamente nei componenti.

## Idee future (in ordine di priorità)

1. Correggere B1: mostrare "Aggiungi ai preferiti" nell'editor della voce usando `foodId`.
2. Ritentare periodicamente i codici "da completare" quando si è online (B3) e precompilare il codice nell'editor (B4).
3. Mantenere `createdAt` originale in `restoreEntry` (B2). Richiede di adattare la regola `createdAtOk`.
4. Test dei componenti principali (ricerca, aggiunta al diario) e un test end-to-end con gli emulatori in CI.
5. Rendere visibili all'utente (o registrare) le voci USDA scartate dal traduttore.
6. Pubblicazione automatica delle regole Firestore da GitHub Actions (servirebbe una credenziale di deploy nei Secrets).
7. Rimuovere gli export non usati.
