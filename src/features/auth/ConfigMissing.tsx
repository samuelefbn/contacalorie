import { missingFirebaseKeys } from '../../lib/firebase'

/** Mostrata se mancano le variabili d'ambiente Firebase (es. `.env` assente o GitHub Secrets non impostati). */
export function ConfigMissing() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-6">
      <h1 className="text-2xl font-bold">Configurazione Firebase mancante</h1>
      <p className="text-slate-600 dark:text-slate-400">
        L’app non trova le variabili d’ambiente di Firebase. In locale crea il file <code>.env</code> partendo da{' '}
        <code>.env.example</code>; per GitHub Pages aggiungi i GitHub Secrets (vedi README).
      </p>
      <ul className="list-inside list-disc rounded-xl bg-slate-100 p-4 font-mono text-sm dark:bg-slate-900">
        {missingFirebaseKeys.map((k) => (
          <li key={k}>{k}</li>
        ))}
      </ul>
    </main>
  )
}
