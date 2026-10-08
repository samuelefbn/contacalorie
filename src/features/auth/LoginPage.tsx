import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { currentInAppBrowser } from '../../lib/inAppBrowser'
import { Button } from '../../components/ui/Button'
import { ErrorNotice } from '../../components/ui/Feedback'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'

export function LoginPage() {
  const { signIn, error, popupUnavailable } = useAuth()
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const online = useOnlineStatus()
  // Nei browser delle app (WhatsApp, Instagram…) Google blocca l'accesso: lo si dice prima di provarci.
  const [inApp] = useState(currentInAppBrowser)

  // Il popup va aperto direttamente nel click: signIn() lo avvia prima di qualsiasi await.
  const handleSignIn = () => {
    setBusy(true)
    void signIn().finally(() => setBusy(false))
  }

  const copyLink = async () => {
    const url = window.location.href.split('#')[0]
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      window.prompt('Copia questo link e aprilo in Safari o Chrome:', url)
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-8 px-6 text-center">
      <img src={`${import.meta.env.BASE_URL}pwa-192x192.png`} alt="" width={96} height={96} className="rounded-3xl shadow-lg" />
      <div>
        <h1 className="text-3xl font-bold">ContaCalorie</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Il tuo diario alimentare personale: registra i pasti e tieni d’occhio calorie e macronutrienti.
        </p>
      </div>
      {!online && (
        <p role="alert" className="rounded-xl bg-amber-100 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          Sei offline. Per accedere serve una connessione a internet; dopo il primo accesso l’app funziona anche senza rete.
        </p>
      )}
      {inApp.inApp && (
        <div role="alert" className="w-full space-y-3 rounded-xl bg-amber-100 px-4 py-3 text-left text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <p className="font-semibold">Per accedere apri questo link in Safari o Chrome</p>
          <p>
            Stai usando il browser interno di {inApp.app === 'WebView' ? 'un’app' : inApp.app}: qui Google non permette
            l’accesso. Copia il link e incollalo in Safari (iPhone) o Chrome (Android), oppure usa il menu “⋯” e scegli
            “Apri nel browser”.
          </p>
          <Button size="sm" variant="secondary" onClick={() => void copyLink()}>
            {copied ? 'Link copiato ✓' : 'Copia link'}
          </Button>
        </div>
      )}
      <Button onClick={handleSignIn} loading={busy} disabled={!online || inApp.inApp} className="w-full">
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
        </svg>
        Accedi con Google
      </Button>
      {popupUnavailable && !inApp.inApp && (
        <div role="alert" className="w-full space-y-3 rounded-xl bg-amber-100 px-4 py-3 text-left text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <p className="font-semibold">La finestra di accesso di Google non si è aperta</p>
          <p>
            Il browser ha bloccato il popup. Premi “Riprova”; se non funziona, consenti i popup per questo sito (su iPhone:
            Impostazioni → Safari → disattiva “Blocca finestre a comparsa”) oppure apri il sito direttamente in Safari o
            Chrome.
          </p>
          <Button size="sm" variant="secondary" onClick={handleSignIn}>
            Riprova
          </Button>
        </div>
      )}
      {error != null && <ErrorNotice error={error} title="Accesso non riuscito" />}
      <p className="text-xs text-slate-500">
        Ogni account vede solo i propri dati: diario, alimenti e peso sono privati e protetti dalle regole di sicurezza.
      </p>
    </main>
  )
}
