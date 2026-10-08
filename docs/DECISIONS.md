# Registro delle decisioni architetturali

Ogni voce: **contesto**, **decisione**, **motivazione**, **alternative scartate**, **fonti**.
Lo **stato** è:
- *confermata*: la motivazione è scritta nel codice, nei commenti, nei commit o nel README;
- *da confermare*: la motivazione è dedotta, senza una prova diretta.

---

## ADR-01 — Firebase (Authentication + Cloud Firestore) come backend
- **Stato**: confermata per la scelta, *da confermare* per le alternative.
- **Contesto**: app personale senza server proprio, ospitata come sito statico, con dati privati per utente e uso da telefono.
- **Decisione**: Firebase Authentication (Google) e Cloud Firestore, chiamati direttamente dal browser (SDK modulare, `firebase` 12). Nessun backend.
- **Motivazione**:
  - accesso Google pronto;
  - listener in tempo reale (`onSnapshot`) e cache offline integrata;
  - regole di sicurezza per utente senza scrivere un server (`firestore.rules`).
- **Alternative scartate** (*da confermare*, non documentate): backend proprio (Node/Express), Supabase, solo `localStorage`.
- **Fonti**: commit `142f943`, `ff04c03`; `src/lib/firebase.ts`; README.

## ADR-02 — Tutti i dati sotto `users/{uid}`, regole con validazione dei campi
- **Stato**: confermata.
- **Contesto**: privacy dei dati di ogni persona.
- **Decisione**: una sola radice per utente (`users/{uid}` con le sottocollezioni `entries`, `foods`, `weights`, `pendingScans`). Le regole permettono l'accesso solo se `request.auth.uid == uid`, validano tipi e limiti e negano qualsiasi altro percorso.
- **Motivazione**: l'isolamento è garantito dal server e non solo dall'interfaccia; una regola semplice è facile da verificare (test sull'emulatore in `tests/rules/firestore.rules.emu.ts`).
- **Alternative scartate**: collezioni globali con un campo `ownerId` (*da confermare*).
- **Fonti**: `firestore.rules`, `src/services/refs.ts`, README "Account e privacy".

## ADR-03 — Offline-first: cache persistente di Firestore e scritture ottimistiche
- **Stato**: confermata.
- **Contesto**: l'app si usa al supermercato o a tavola, anche senza rete.
- **Decisione**:
  - `initializeFirestore` con `persistentLocalCache({ tabManager: persistentMultipleTabManager() })`;
  - le Promise di scrittura non vengono mai attese per aggiornare l'interfaccia;
  - le voci del diario hanno id generati sul dispositivo;
  - i conflitti si risolvono con "vince l'ultima scrittura".
- **Motivazione**: commento in `src/services/entries.ts`: "con la cache offline le Promise si risolvono solo quando il server conferma. L'interfaccia quindi NON le attende". Più il README, sezione "Offline e sincronizzazione".
- **Alternative scartate**:
  - attendere la conferma del server, che bloccherebbe l'interfaccia offline;
  - unione campo per campo dei conflitti, che sarebbe complessa e non necessaria per un diario personale (*da confermare*).
- **Fonti**: `src/lib/firebase.ts`, `src/services/*.ts`, `src/contexts/SyncContext.tsx`, commit `83c6f84`.

## ADR-04 — Service worker: app shell in precache e API in stale-while-revalidate
- **Stato**: confermata.
- **Contesto**: l'app deve aprirsi senza rete; le risposte di Open Food Facts/USDA già viste sono utili offline.
- **Decisione**: vite-plugin-pwa con `autoUpdate`, precache di tutti gli asset e `navigateFallback`, cache `food-data` **StaleWhileRevalidate** per `*.openfoodfacts.org` e `api.nal.usda.gov`.
- **Alternative scartate**: `NetworkFirst` con timeout di 8 s (configurazione precedente, sostituita nel commit `83c6f84`).
- **Fonti**: `vite.config.ts`.

## ADR-05 — Alimenti generici: dataset locale generato da USDA più USDA live
- **Stato**: confermata.
- **Contesto**: Open Food Facts copre i prodotti confezionati, non frutta, verdura, carne e pesce sfusi. In più le sue API rispondevano spesso con errori (commit `ad89f61`).
- **Decisione**:
  - circa 384 alimenti italiani definiti in `scripts/genericFoods.defs.ts`;
  - valori presi **solo** dall'API USDA FoodData Central (Foundation e SR Legacy) tramite `scripts/build-generic-foods.ts` e salvati in `src/data/genericFoods.it.json`;
  - USDA live (con la query tradotta in inglese) solo se il dataset trova meno di 5 voci;
  - Open Food Facts per i confezionati, interrogato sempre in parallelo.
- **Motivazione**:
  - ricerca dei generici istantanea, offline e indipendente dalle API;
  - valori reali e verificabili (`fdcId`, `usdaDescription` nel JSON);
  - nessun numero scritto a mano.
- **Alternative scartate**:
  - solo Open Food Facts (prima versione, commit `ff04c03`);
  - catena sequenziale Open Food Facts → USDA (commit `428f786`, sostituita dal commit `6d409f8` con le fonti in parallelo);
  - valori nutrizionali scritti a mano, vietati esplicitamente.
- **Fonti**: README "Ricerca alimenti"; `src/lib/foodSearch/index.ts`; `docs/SEARCH_PIPELINE.md`.

## ADR-06 — Nomi italiani strutturati "Categoria - Alimento (dettaglio)"
- **Stato**: confermata.
- **Contesto**: le descrizioni USDA sono in inglese e poco leggibili ("Apples, raw, fuji, with skin").
- **Decisione**:
  - tipo `GenericFoodDisplay` e `formatFoodLabel`;
  - traduzione token per token in `usdaToItalian`, con accordo di genere;
  - una voce con un token sconosciuto viene **scartata**;
  - i prodotti trasformati vengono mostrati solo se cercati o espandendo la sezione.
- **Motivazione**: mai testo inglese nell'interfaccia; ordine prevedibile (prima l'alimento base, il crudo prima del cotto).
- **Alternative scartate**: mostrare la descrizione USDA originale (comportamento precedente, corretto nel commit `d40492b`); badge della fonte (rimosso nel commit `c5c0e61`).
- **Fonti**: `src/lib/foodSearch/display.ts`, `src/lib/foodSearch/usdaToItalian.ts`, `src/lib/foodSearch/genericRanking.ts`.

## ADR-07 — Login solo con popup, niente redirect
- **Stato**: confermata.
- **Contesto**: l'app è su GitHub Pages, un dominio diverso da `authDomain` (`<progetto>.firebaseapp.com`). Su Safari/iOS e nei browser in-app, con lo storage separato per sito, `signInWithRedirect` falliva con "missing initial state".
- **Decisione**:
  - `signInWithPopup` chiamato direttamente nel gestore del click, senza `await` prima;
  - nessun ripiego automatico sul redirect;
  - messaggio "Riprova" se il popup è bloccato;
  - login disattivato nei browser in-app (dove Google lo blocca con `disallowed_useragent`), con l'invito ad aprire il link in Safari o Chrome;
  - persistenza `browserLocalPersistence`, poi IndexedDB e poi sessionStorage, tramite `initializeAuth`.
- **Alternative scartate**:
  - popup con ripiego su redirect (versione precedente);
  - ospitare l'app sul dominio `firebaseapp.com` o servire `/__/auth` dallo stesso dominio, che non si può fare su GitHub Pages (*da confermare*: non documentata).
- **Fonti**: commit `05415c6`; commento in `src/contexts/AuthContext.tsx`; README "Problemi di accesso".

## ADR-08 — Hosting su GitHub Pages con navigazione nell'hash
- **Stato**: confermata per la scelta; *da confermare* per la preferenza su Firebase Hosting.
- **Contesto**: sito statico, deploy automatico a ogni push.
- **Decisione**:
  - workflow `deploy.yml` con le variabili dai GitHub Secrets;
  - `base: '/contacalorie/'`;
  - schede nell'hash dell'URL (`useHashTab`), così non servono riscritture lato server.
- **Alternative**: Firebase Hosting resta supportato (`npm run build:firebase`, `firebase.json`) come deploy alternativo.
- **Fonti**: `vite.config.ts`, `src/hooks/useHashTab.ts`, `.github/workflows/deploy.yml`, commit `1d05398`.

## ADR-09 — Nessuno store globale: Context + hook sui listener
- **Stato**: *da confermare* (dedotta dalla struttura del codice).
- **Decisione**:
  - i dati dell'utente arrivano dai listener Firestore negli hook (`src/hooks/data.ts`);
  - lo stato trasversale vive in quattro Context (Auth, Theme, Toast, Sync);
  - il resto è stato locale dei componenti.
- **Motivazione presunta**: la cache di Firestore è già la fonte di verità locale; un secondo store la duplicherebbe.

## ADR-10 — "I miei alimenti": id deterministico e ricerca sul dispositivo
- **Stato**: confermata.
- **Contesto**: ogni prodotto scansionato o alimento usato deve essere salvato senza doppioni e cercabile; Firestore non fa ricerca testuale.
- **Decisione**:
  - l'id del documento è la chiave dell'alimento (`foodKey`): codice a barre, chiave del dataset o di USDA, oppure `n-nome--marca`;
  - esistenza verificata sulla copia locale (`getDocFromCache`);
  - aggiornamento di `lastUsedAt` e `useCount` con `increment`;
  - ricerca con Fuse.js sulla lista già in memoria, ordinata per uso recente e frequente.
- **Alternative scartate**: id automatici con deduplica a posteriori; ricerca testuale lato server (non disponibile in Firestore senza servizi esterni).
- **Fonti**: `src/lib/foodLibrary.ts`, `src/services/foods.ts`, `src/lib/myFoodsSearch.ts`, commit `83c6f84`.

## ADR-11 — Logout sicuro con cancellazione dei dati locali
- **Stato**: confermata.
- **Contesto**: telefoni e computer condivisi; la cache di Firestore resta su disco.
- **Decisione**:
  - `waitForPendingWrites` se online, oppure conferma se offline;
  - `signOut`, `terminate`, `clearIndexedDbPersistence`;
  - pulizia delle chiavi dell'app e di Firebase (solo quelle con prefisso, perché l'origine `github.io` è condivisa con altri siti) e della cache `food-data`;
  - ricarica della pagina; anche le altre schede puliscono i dati quando ricevono l'evento di logout.
- **Fonti**: `src/services/session.ts`, `src/lib/localData.ts`, `src/contexts/AuthContext.tsx`.

## ADR-12 — Regole pubblicate a mano, ma provate in CI sull'emulatore
- **Stato**: confermata per la pubblicazione manuale; *da confermare* il motivo per cui non si pubblicano in automatico (probabilmente per non dover dare a GitHub una credenziale di deploy Firebase).
- **Decisione**: nessun workflow pubblica `firestore.rules`; il job `rules` di `ci.yml` esegue `npm run test:rules` su ogni PR.
- **Fonti**: README, `.github/workflows/ci.yml`, `tests/rules/firestore.rules.emu.ts`.

## ADR-13 — Niente Analytics
- **Stato**: confermata.
- **Decisione**: `VITE_FIREBASE_MEASUREMENT_ID` viene letta ma Analytics **non** viene inizializzato.
- **Fonti**: commento in `src/lib/firebase.ts`, README.

## ADR-14 — Stack del frontend
- **Stato**: confermata per la scelta; *da confermare* per le motivazioni.
- **Decisione**:
  - React 19, TypeScript strict, Vite 8, Tailwind CSS v4 (variante `dark` a classe);
  - recharts per i grafici, caricato in modo lazy;
  - `@zxing/browser` per lo scanner, con import dinamico;
  - Fuse.js per la ricerca approssimata;
  - Vitest per i test.
- **Fonti**: `package.json`, `vite.config.ts`, commit `7def06e`.
