# Flussi principali

Ogni flusso indica i file coinvolti. I nomi tra parentesi sono funzioni o componenti reali; il dettaglio è in `docs/FUNCTIONS.md`.

- [Login Google](#login-google)
- [Logout sicuro e pulizia delle cache](#logout-sicuro-e-pulizia-delle-cache)
- [Primo accesso e onboarding](#primo-accesso-e-onboarding)
- [Aggiunta di un alimento al diario](#aggiunta-di-un-alimento-al-diario)
- [Ricerca alimenti](#ricerca-alimenti)
- [Scansione del codice a barre](#scansione-del-codice-a-barre)
- [Sincronizzazione offline](#sincronizzazione-offline)
- [Calcolo del fabbisogno calorico](#calcolo-del-fabbisogno-calorico)
- [Dashboard e storico](#dashboard-e-storico)
- [Registrazione del peso](#registrazione-del-peso)
- [Esportazione CSV e JSON](#esportazione-csv-e-json)
- [Eliminazione dell'account](#eliminazione-dellaccount)

## Login Google

File: `src/features/auth/LoginPage.tsx`, `src/contexts/AuthContext.tsx`, `src/lib/inAppBrowser.ts`, `src/lib/firebase.ts`.

```mermaid
flowchart TD
    A["Apertura dell'app senza utente"] --> B["LoginPage"]
    B --> C{"detectInAppBrowser: WhatsApp, Instagram, Facebook, Messenger, TikTok, LINE, LinkedIn o WebView?"}
    C -- sì --> D["Avviso: apri il link in Safari o Chrome, pulsante Copia link, login disattivato"]
    C -- no --> E{"Online?"}
    E -- no --> F["Avviso: per accedere serve internet, login disattivato"]
    E -- sì --> G["Pulsante Accedi con Google attivo"]
```

```mermaid
sequenceDiagram
    actor U as Utente
    participant L as LoginPage
    participant A as AuthProvider
    participant F as Firebase Auth
    participant G as Google su authDomain
    U->>L: tocca Accedi con Google
    L->>A: signIn nel gestore del click
    A->>F: signInWithPopup senza await prima
    F->>G: apre il popup
    alt accesso completato
        G-->>F: credenziali
        F-->>A: onAuthStateChanged con utente
        A-->>L: Gate mostra AuthenticatedApp
    else popup bloccato o non supportato
        F-->>A: auth/popup-blocked o operation-not-supported
        A-->>L: popupUnavailable true
        L-->>U: messaggio con Riprova e istruzioni per Safari o Chrome
    else popup chiuso o annullato
        F-->>A: popup-closed-by-user o cancelled-popup-request
        A-->>L: nessun messaggio
    else altro errore
        F-->>A: es. auth/unauthorized-domain
        A-->>L: error, mostrato con ErrorNotice e errorMessage
    end
```

Note:
- Non esiste un ripiego su `signInWithRedirect` (rimosso apposta, vedi `docs/DECISIONS.md`).
- La sessione resta salvata grazie a `initializeAuth` con `browserLocalPersistence`, poi IndexedDB e poi sessionStorage come riserva (`src/lib/firebase.ts`).
- `classifySignInError` (`src/lib/inAppBrowser.ts`) decide tra `ignore`, `popup-unavailable` ed `error`.

## Logout sicuro e pulizia delle cache

File: `src/features/account/AccountSection.tsx`, `src/services/session.ts`, `src/lib/localData.ts`, `src/contexts/AuthContext.tsx`, `src/contexts/SyncContext.tsx`.

```mermaid
sequenceDiagram
    actor U as Utente
    participant S as AccountSection
    participant Y as SyncProvider
    participant X as session.ts
    participant FS as Firestore
    participant AU as Firebase Auth
    participant B as Browser
    U->>S: Esci
    S->>Y: online e pendingCount
    alt online
        S->>X: flushPendingWrites con timeout 15 s
        X->>FS: waitForPendingWrites
        FS-->>X: confermate oppure timeout
        opt timeout
            S->>U: conferma uscita con perdita delle modifiche
        end
    else offline
        S->>U: conferma con il numero di modifiche non sincronizzate
    end
    S->>X: secureSignOut
    X->>AU: signOut
    X->>FS: terminate
    X->>FS: clearIndexedDbPersistence con fino a 5 tentativi
    X->>B: clearLocalAppData su localStorage, sessionStorage e CacheStorage
    X->>B: location.replace senza hash, quindi si riparte dal Diario
```

- `clearLocalAppData` rimuove solo le chiavi con prefisso `contacalorie:`, `firestore_` e `firebase:`, più la cache `food-data` del service worker. Tiene `theme` e la precache dell'app shell.
- **Altre schede**: `AuthProvider` ricorda l'ultimo uid. Se `onAuthStateChanged` arriva con un utente diverso o nullo, e la scheda non sta già uscendo (`isLeaving`), chiama `wipeLocalDataAndReload`.
- Se un'altra scheda tiene aperta la copia locale, `clearIndexedDbPersistence` fallisce: dopo 5 tentativi scrive un avviso in console e la pagina viene ricaricata comunque.

## Primo accesso e onboarding

File: `src/App.tsx`, `src/hooks/data.ts` (`useProfile`), `src/hooks/useFirestore.ts` (`useDocData`), `src/services/profile.ts`, `src/features/account/OnboardingPage.tsx`, `src/features/profile/ProfileForm.tsx`.

```mermaid
flowchart TD
    A["AuthenticatedApp: useProfile ascolta users/uid"] --> B{"Documento ricevuto?"}
    B -- "esiste" --> C{"onboarded è false?"}
    C -- sì --> O["OnboardingPage"]
    C -- no --> APP["App normale"]
    B -- "non esiste e fromCache vero" --> W["Si aspetta il server: app con valori predefiniti"]
    B -- "non esiste e fromCache falso" --> N["createUserDoc: profilo base con onboarded false"]
    N --> O
    O --> P{"Scelta dell'utente"}
    P -- "Crea profilo" --> Q["ProfileForm: saveProfile con onboarded true"]
    P -- "Salta per ora" --> R["saveProfile con i valori attuali e onboarded true"]
    Q --> APP
    R --> APP
```

- `createUserDoc` parte **solo** se il server conferma che il documento non esiste (`fromCache === false`), per non sovrascrivere un profilo esistente ma non ancora in cache.
- I profili creati prima dell'onboarding non hanno il campo `onboarded`: `toProfile` lo considera `true`.

## Aggiunta di un alimento al diario

File: `src/features/diary/DiaryPage.tsx`, `src/features/diary/MealSection.tsx`, `src/features/diary/AddFoodSheet.tsx`, `src/features/picker/*`, `src/services/foods.ts`, `src/services/entries.ts`, `src/lib/foodLibrary.ts`.

```mermaid
sequenceDiagram
    actor U as Utente
    participant M as MealSection
    participant A as AddFoodSheet
    participant P as FoodPicker
    participant F as foods.ts
    participant E as entries.ts
    participant FS as Firestore cache e server
    U->>M: tocca più sul pasto
    M->>A: apre con il pasto iniziale
    A->>P: schede Cerca, Miei, Recenti, Manuale
    U->>P: sceglie un alimento
    P->>A: onSelect con FoodItem
    A->>U: PortionForm con grammi e anteprima di kcal e macro
    U->>A: Aggiungi
    A->>F: recordFoodUse con origine e countUse
    F->>FS: getDocFromCache su foods con id foodKey
    alt documento già presente
        F->>FS: updateDoc con lastUsedAt e useCount più 1
    else nuovo
        F->>FS: setDoc del nuovo alimento con useCount 1
    end
    A->>E: addEntry con foodId
    E->>FS: setDoc della voce con id generato sul dispositivo
    FS-->>M: onSnapshot aggiorna subito il pasto, anche offline
```

- Il tasto **+** accanto a un risultato (`onDirect`) aggiunge subito con `defaultGrams`, senza passare da `PortionForm`.
- Se l'alimento arriva da una scansione (`fromScan`), `countUse` è falso: la scansione ha già contato come utilizzo.
- "Aggiungi ai preferiti" passa `favorite: true` a `recordFoodUse`, che non toglie mai il preferito.
- Il pannello resta aperto dopo ogni aggiunta, per registrare più alimenti di fila.

## Ricerca alimenti

File: `src/features/picker/SearchTab.tsx`, `src/lib/myFoodsSearch.ts`, `src/lib/foodSearch/*`. Il dettaglio di ranking e dizionari è in `docs/SEARCH_PIPELINE.md`.

```mermaid
flowchart TD
    Q["Query con almeno 2 caratteri"] --> L1["I miei alimenti: createMyFoodsSearch con Fuse.js, sul dispositivo"]
    Q --> L2["Voci di diario recenti non ancora salvate"]
    Q --> D["Dataset generico: searchGenericDataset, sincrono e offline"]
    Q --> T["Attesa di 500 ms, poi searchOnline"]
    T --> U{"Il dataset trova meno di 5 voci?"}
    U -- sì --> UL["searchUsdaLive: cache usda, poi USDA con query tradotta in inglese"]
    U -- no --> SK["USDA saltato"]
    T --> OF["searchPackaged: cache off, poi Search-a-licious, poi ricerca classica"]
    UL --> R["rankGenericResults su mergeGeneric di dataset e USDA"]
    D --> R
    SK --> R
    R --> S1["Sezione Alimenti generici"]
    R --> S2["Mostra anche prodotti trasformati"]
    OF --> S3["Sezione Prodotti confezionati"]
    L1 --> S0["Sezione I miei alimenti, in cima"]
    L2 --> S0
    UL -. "errore" .-> N1["Nota: USDA non risponde"]
    OF -. "errore" .-> N2["Nota: Open Food Facts non risponde o sei offline"]
    S0 --> X{"Tutte le fonti in errore e nessun risultato locale?"}
    X -- sì --> E["AllSourcesFailedError o OfflineError con Riprova e Inserisci a mano"]
```

- `searchOnline` interroga USDA e Open Food Facts in parallelo con `Promise.allSettled`: l'errore di una fonte non blocca l'altra. Un `AbortError` (nuova ricerca) viene rilanciato.
- `fetchJson` (`src/lib/foodSearch/http.ts`): timeout di 8 s per tentativo, 2 ritentativi con attesa esponenziale su 5xx, 429 e timeout. La ricerca classica di OFF e il prodotto per codice ritentano anche gli errori di rete.
- Cache: `createSearchCache` (memoria + `sessionStorage`, 24 h). Il service worker tiene inoltre le risposte delle API con stale-while-revalidate.
- I risultati già presenti tra "i miei alimenti" vengono esclusi dalle altre sezioni (`notLocal` in `SearchTab`).

## Scansione del codice a barre

File: `src/features/picker/BarcodeScanner.tsx`, `src/features/picker/SearchTab.tsx`, `src/services/foods.ts`, `src/services/pendingScans.ts`, `src/hooks/usePendingScanCompletion.ts`, `src/lib/pendingScanQueue.ts`.

```mermaid
flowchart TD
    A["BarcodeScanner: fotocamera con zxing o codice digitato di almeno 6 cifre"] --> B["lookupBarcode"]
    B --> C{"Già tra i miei alimenti in memoria?"}
    C -- sì --> S["pickSaved: recordFoodUse con scan, poi quantità"]
    C -- no --> D["findSavedFood: copia locale, poi server se online"]
    D --> E{"Trovato?"}
    E -- sì --> S
    E -- no --> F{"navigator.onLine?"}
    F -- no --> G["Messaggio: codice non disponibile offline"]
    G --> H["Salva per dopo: queuePendingScan in pendingScans"]
    G --> I["Inserisci a mano con il codice precompilato"]
    F -- sì --> J["getProductByBarcode su Open Food Facts"]
    J --> K{"Esito"}
    K -- "prodotto valido" --> L["recordFoodUse con scan: documento con id uguale al codice, poi quantità"]
    K -- "non trovato o valori incompleti" --> I
    K -- "errore di rete" --> M["Errore con Riprova, Salva per dopo, Inserisci a mano"]
```

```mermaid
sequenceDiagram
    participant H as usePendingScanCompletion
    participant Q as completePendingScans
    participant O as Open Food Facts
    participant FS as Firestore
    participant T as Toast
    Note over H: parte quando l'app è online e ci sono codici pending
    H->>Q: codici con status pending
    loop per ogni codice
        Q->>O: getProductByBarcode
        alt prodotto trovato
            Q->>FS: recordFoodUse con origine scan
            Q->>FS: removePendingScan
            Q->>T: Prodotto completato con nome e marca
        else non esiste
            Q->>FS: markPendingNotFound
            Q->>T: inseriscilo a mano
        else rete ancora assente
            Q-->>H: retryLater, resta in coda
        end
    end
```

- I codici in coda compaiono nella pagina Alimenti, nella sezione "Da completare" (`src/features/foods/FoodsPage.tsx`), con il pulsante "Rimuovi".
- Un codice in `retryLater` viene ritentato solo quando cambiano lo stato online o la lista dei codici (vedi `docs/KNOWN_ISSUES.md`).

## Sincronizzazione offline

File: `src/lib/firebase.ts`, `src/hooks/useFirestore.ts`, `src/contexts/SyncContext.tsx`, `src/lib/syncState.ts`, `src/components/layout/SyncIndicator.tsx`, `src/components/ui/PendingMark.tsx`.

```mermaid
sequenceDiagram
    actor U as Utente
    participant C as Componente
    participant S as Servizio
    participant L as Cache Firestore IndexedDB
    participant Y as SyncProvider
    participant R as Server Firestore
    U->>C: azione, per esempio aggiunge una voce
    C->>S: chiamata senza attendere la Promise
    S->>L: scrittura locale immediata
    L-->>C: onSnapshot con hasPendingWrites vero, pallino arancione
    L-->>Y: conteggio in attesa, header Offline o Sincronizzazione in corso
    Note over L,R: offline la scrittura resta in coda
    L->>R: invio automatico al ritorno della rete
    R-->>L: conferma
    L-->>C: hasPendingWrites falso, il pallino sparisce
    L-->>Y: conteggio a zero, Tutto sincronizzato per 4 secondi, poi Online
```

- `pendingInSnapshot` conta i documenti con scritture in attesa; se lo snapshot ha scritture in attesa ma nessun documento visibile (per esempio un'eliminazione) conta 1.
- Il conteggio considera profilo, alimenti, pesi, codici in coda e voci degli ultimi 90 giorni. Le due query sulle voci si sovrappongono: si prende il massimo, non la somma.
- Regole dei conflitti: `docs/DATA_MODEL.md`.

## Calcolo del fabbisogno calorico

File: `src/lib/nutrition.ts`, `src/features/profile/ProfileForm.tsx`, `src/services/weights.ts`.

```mermaid
flowchart LR
    A["Sesso, età, altezza, peso"] --> B["bmr: Mifflin-St Jeor"]
    B --> C["tdee: bmr per fattore di attività"]
    C --> D["recommendedKcal: tdee più delta dell'obiettivo"]
    D --> E["Minimo di sicurezza: 1500 uomo, 1200 donna"]
    E --> F["Arrotondato a 10 kcal"]
    F --> G{"kcalManual?"}
    G -- no --> H["kcalTarget calcolato"]
    G -- sì --> I["kcalTarget inserito a mano tra 500 e 10000"]
    H --> J["defaultMacros con il pulsante Calcola"]
    I --> J
```

- **BMR** = 10 × peso + 6,25 × altezza − 5 × età + 5 (uomo) oppure − 161 (donna).
- **Fattori di attività** (`ACTIVITY_LEVELS`): sedentario 1,2 · leggero 1,375 · moderato 1,55 · attivo 1,725 · molto attivo 1,9.
- **Delta dell'obiettivo** (`GOALS`): dimagrire −500 · mantenere 0 · aumentare +300 kcal.
- **Macro predefiniti** (`defaultMacros`): proteine = peso × g/kg dell'obiettivo (2,0 / 1,6 / 1,8), al massimo il 40% delle kcal; grassi = 25% delle kcal / 9; carboidrati = il resto / 4.
- Registrando il **peso di oggi**, `logWeight` aggiorna `weightKg` e, se `kcalManual` è falso, ricalcola `kcalTarget` con `recommendedKcal`. I target dei macro restano invariati.

## Dashboard e storico

File: `src/features/diary/DiaryPage.tsx`, `src/features/diary/DaySummary.tsx`, `src/components/ui/Progress.tsx`, `src/features/history/*`.

```mermaid
flowchart TD
    A["DiaryPage: useDayEntries del giorno"] --> B["sumNutrients"]
    B --> C["DaySummary: ProgressRing kcal rimanenti o oltre l'obiettivo"]
    B --> D["MacroBar per proteine, carboidrati, grassi"]
    A --> E["MealSection per Colazione, Pranzo, Cena, Spuntini"]
    H["HistoryPage: periodo 7 o 30 giorni"] --> I["lastNDays e useEntriesRange"]
    I --> J["dailyTotals con logged per giorno"]
    J --> K["average solo sui giorni registrati"]
    J --> L["weeks: settimane di 7 giorni a ritroso"]
    J --> M["CaloriesChart con linea dell'obiettivo, giorni oltre in ambra"]
    H --> N["WeightSection: useWeights e WeightChart"]
```

- Senza profilo il diario usa `DEFAULT_PROFILE` (2000 kcal) e mostra un invito a completare il profilo.
- "Entro l'obiettivo" conta i giorni registrati con kcal ≤ obiettivo.

## Registrazione del peso

File: `src/features/history/WeightSection.tsx`, `src/services/weights.ts`.

```mermaid
sequenceDiagram
    actor U as Utente
    participant W as WeightSection
    participant S as logWeight
    participant FS as Firestore
    U->>W: data e peso tra 20 e 400 kg, Salva
    W->>S: peso arrotondato a 0,1
    S->>FS: setDoc su weights con id uguale alla data
    opt la data è oggi e il profilo esiste
        S->>FS: saveProfile con weightKg e kcalTarget ricalcolato se non manuale
    end
    FS-->>W: useWeights aggiorna WeightChart e la variazione dal primo peso
```

- Un solo valore per giorno: salvare di nuovo la stessa data sovrascrive.
- Eliminazione con il pulsante × (`deleteWeight`).

## Esportazione CSV e JSON

File: `src/features/profile/ExportSection.tsx`, `src/features/account/MyDataSection.tsx`, `src/services/account.ts`, `src/lib/csv.ts`.

```mermaid
flowchart TD
    A["ExportSection: intervallo di date facoltativo"] --> B["Diario: fetchEntries, toCsv, downloadCsv"]
    A --> C["Peso: fetchWeights filtrato, toCsv, downloadCsv"]
    D["MyDataSection: Esporta i miei dati"] --> E["exportAllData: profilo, voci, alimenti, pesi, codici in coda"]
    E --> F["downloadJson contacalorie-dati-data.json"]
    E --> G["Alimenti in CSV: downloadCsv contacalorie-alimenti-data.csv"]
```

- CSV con separatore `;` e virgola decimale (per Excel in italiano), BOM UTF-8, protezione da "CSV injection" (`formatCell` in `src/lib/csv.ts`).
- Nel JSON il campo locale `pending` viene rimosso.
- Le esportazioni usano `getDocs`: offline restituiscono solo ciò che è in cache.

## Eliminazione dell'account

File: `src/features/account/MyDataSection.tsx`, `src/services/account.ts`, `src/services/session.ts`.

```mermaid
sequenceDiagram
    actor U as Utente
    participant M as MyDataSection
    participant A as account.ts
    participant FS as Firestore
    participant AU as Firebase Auth
    participant X as session.ts
    U->>M: Elimina il mio account
    M->>M: offline? allora messaggio e stop
    M->>U: prima conferma con window.confirm
    M->>U: pannello: scrivi ELIMINA
    U->>M: Elimina definitivamente
    M->>A: deleteAllUserData
    A->>FS: getDocs e writeBatch delete a blocchi di 400 per entries, foods, weights, pendingScans
    A->>FS: deleteDoc del profilo
    M->>A: deleteAuthAccount
    alt eliminato
        AU-->>M: ok
        M->>X: wipeLocalDataAndReload
    else auth/requires-recent-login
        AU-->>M: errore
        M->>U: i dati sono cancellati, rifai l'accesso
        U->>M: Accedi di nuovo con Google ed elimina
        M->>A: reauthenticateAndDelete con popup
        A->>AU: reauthenticateWithPopup e deleteUser
        M->>X: wipeLocalDataAndReload
    end
```
