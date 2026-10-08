# Deploy e configurazione

> In questo documento non ci sono valori reali delle variabili. L'id del progetto Firebase (`contacalorie-28e2d`) non è un segreto: è già in `.firebaserc`.

## Variabili d'ambiente

Vite espone al codice solo le variabili con prefisso `VITE_`, che finiscono nel JavaScript pubblicato. La API key di Firebase e quella di USDA non sono segreti veri e propri, ma vanno **limitate** (vedi sotto). Lette in `src/lib/firebase.ts` e `src/lib/foodSearch/usda.ts`.

| Nome | Obbligatoria | A cosa serve | Dove si legge |
|---|---|---|---|
| `VITE_FIREBASE_API_KEY` | sì | `apiKey` della configurazione Firebase | `src/lib/firebase.ts` |
| `VITE_FIREBASE_AUTH_DOMAIN` | sì | `authDomain`: dominio della finestra di accesso Google (deve essere quello `firebaseapp.com` del progetto) | `src/lib/firebase.ts` |
| `VITE_FIREBASE_PROJECT_ID` | sì | `projectId` | `src/lib/firebase.ts` |
| `VITE_FIREBASE_APP_ID` | sì | `appId` | `src/lib/firebase.ts` |
| `VITE_FIREBASE_STORAGE_BUCKET` | no | `storageBucket` (Storage non è usato) | `src/lib/firebase.ts` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | no | `messagingSenderId` | `src/lib/firebase.ts` |
| `VITE_FIREBASE_MEASUREMENT_ID` | no | letta ma **Analytics non viene inizializzato** | `src/lib/firebase.ts` |
| `VITE_USDA_API_KEY` | consigliata | chiave di USDA FoodData Central; se manca si usa `DEMO_KEY` (limiti molto bassi) | `src/lib/foodSearch/usda.ts`, `scripts/build-generic-foods.ts` |
| `VITE_USE_EMULATORS` | no, solo sviluppo | `true` collega gli emulatori Auth (127.0.0.1:9099) e Firestore (127.0.0.1:8080), solo con `npm run dev` | `src/lib/firebase.ts` |

Le prime quattro sono controllate da `missingFirebaseKeys`: se ne manca una, l'app mostra `ConfigMissing` invece di avviarsi. Lo script `scripts/build-generic-foods.ts` accetta anche `USDA_API_KEY` e legge da solo il file `.env`.

### Dove si impostano

- **In locale**: copia `.env.example` in `.env` e compila i valori. `.env` e `.env.*` (tranne `.env.example`) sono nel `.gitignore`. **Non committare mai `.env` né file di service account** (anche `*-service-account*.json` e `serviceAccount*.json` sono ignorati).
- **Per GitHub Pages**: repository → **Settings → Secrets and variables → Actions → New repository secret**, con gli stessi nomi (7 di Firebase + `VITE_USDA_API_KEY`). `deploy.yml` li passa al passo `npm run build`.
- I valori Firebase sono in **Firebase Console → Impostazioni progetto → Generali → Le tue app → app web → Configurazione SDK**.
- La chiave USDA è gratuita: https://fdc.nal.usda.gov/api-key-signup.

## GitHub Actions

| Workflow | Quando | Cosa fa |
|---|---|---|
| `.github/workflows/ci.yml` | ogni Pull Request, o a mano | job `check`: `npm ci`, `npm run lint`, `npm test`, `npm run build` (senza credenziali). Job `rules`: Java 21, cache degli emulatori, `npm run test:rules` |
| `.github/workflows/deploy.yml` | push su `main`, o a mano | `npm ci`, `npm test`, `npm run build` con i Secrets, upload su GitHub Pages e deploy |
| `.github/workflows/generic-foods.yml` | solo a mano | `npm run build:foods` con `VITE_USDA_API_KEY`, poi `npm test`. **Su `main`**: committa `src/data/genericFoods.it.json` e avvia `deploy.yml`. **Su un altro branch**: solo prova, con riepilogo e senza commit |

## GitHub Pages

1. **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Indirizzo: `https://<utente>.github.io/contacalorie/`. `vite.config.ts` ha `base: '/contacalorie/'`. Se il repository cambia nome, va cambiato anche lì.
3. Navigazione con l'hash (`#/diario`…): nessuna riscrittura lato server necessaria.

## Firebase

### Authentication
- Provider **Google** attivo.
- **Domini autorizzati** (Authentication → Impostazioni → Domini autorizzati): aggiungere `<utente>.github.io`, senza `https://` e senza `/contacalorie`. `localhost` c'è già. Per Firebase Hosting aggiungere anche `<progetto>.web.app` se manca. Senza il dominio l'accesso fallisce con `auth/unauthorized-domain`.
- `VITE_FIREBASE_AUTH_DOMAIN` deve essere `<progetto>.firebaseapp.com`, senza `https://` e senza `/` finale.

### Regole di Firestore (da pubblicare a mano)
Le regole **non** vengono pubblicate da nessun workflow. Ogni volta che `firestore.rules` cambia:

- **Console**: Firestore Database → Regole → incolla tutto `firestore.rules` → **Pubblica**; oppure
- **CLI**: `firebase deploy --only firestore:rules` (usa `.firebaserc`).

Prima di pubblicarle si provano con `npm run test:rules` (emulatore, serve Java). Senza le regole aggiornate l'app riceve "Permesso negato" (`errorMessage` in `src/lib/format.ts`).

### Indici
Nessun indice composito necessario. `firestore.indexes.json` disattiva solo l'indicizzazione di `per100` e `ingredients`; si applica, se si vuole, con `firebase deploy --only firestore:indexes`.

## Restrizioni della API key (Google Cloud Console)

La API key Firebase è nel JavaScript pubblico: va limitata.

1. Google Cloud Console → **API e servizi → Credenziali**, progetto Firebase.
2. Apri la chiave usata dall'app (di solito "Browser key (auto created by Firebase)").
3. **Restrizioni delle applicazioni → Siti web**, con questi referrer:
   ```
   http://localhost:5173/*
   http://localhost:4173/*
   https://<utente>.github.io/*
   https://<progetto>.firebaseapp.com/*
   ```
   `firebaseapp.com` serve perché la finestra di accesso Google gira lì. Con Firebase Hosting aggiungi anche `https://<progetto>.web.app/*`.
4. (Consigliato) **Restrizioni API → Limita chiave**: Identity Toolkit API, Token Service API, Cloud Firestore API.

## Sviluppo in locale

Requisiti: Node.js 20.19 o superiore (CI usa 22). Per `npm run test:rules` serve Java 11 o superiore.

| Comando | Cosa fa |
|---|---|
| `npm install` | dipendenze |
| `npm run dev` | server di sviluppo su `http://localhost:5173/contacalorie/` |
| `npm run build` | `tsc -b` + build di produzione in `dist/` |
| `npm run preview` | serve la build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc -b` |
| `npm test` | Vitest (unit test, escluse le regole) |
| `npm run test:rules` | `npx firebase-tools@15.33.0 emulators:exec --only firestore` con `vitest.rules.config.ts` |
| `npm run build:foods` | rigenera il dataset dei generici da USDA |
| `npm run build:firebase` | build con base `/` per Firebase Hosting |
| `npm run docs:functions` | rigenera `docs/FUNCTIONS.md` dal codice |
| `npm run docs:check` | controlla percorsi citati, Mermaid e allineamento di `FUNCTIONS.md` |

Emulatori: `npx firebase-tools emulators:start --only auth,firestore`, poi `VITE_USE_EMULATORS=true npm run dev`. Le porte sono in `firebase.json`.

## Deploy alternativo su Firebase Hosting

`firebase.json` prevede `hosting.public: dist`, `predeploy: npm run build:firebase` e una riscrittura di tutte le rotte su `/index.html`. Comando: `firebase deploy --only hosting` (serve un `.env` locale con i valori reali).

## Checklist di configurazione

- [ ] App web registrata in Firebase, provider Google attivo
- [ ] Database Firestore creato
- [ ] 8 Secrets su GitHub (7 Firebase + `VITE_USDA_API_KEY`)
- [ ] GitHub Pages con sorgente "GitHub Actions"
- [ ] `<utente>.github.io` tra i domini autorizzati di Firebase Auth
- [ ] `VITE_FIREBASE_AUTH_DOMAIN` uguale a `<progetto>.firebaseapp.com`
- [ ] `firestore.rules` pubblicate (e ripubblicate dopo ogni modifica)
- [ ] API key limitata per referrer (e per API)
- [ ] Dataset dei generici generato (workflow "Genera alimenti generici (USDA)")
- [ ] Prova: accesso con Google da browser e da iPhone (Safari), aggiunta di una voce, modalità offline
