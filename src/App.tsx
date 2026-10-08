import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { isFirebaseConfigured } from './lib/firebase'
import { todayKey } from './lib/dates'
import { AuthProvider, useAuth, useUid } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { ToastProvider, useToast } from './contexts/ToastContext'
import { SyncProvider } from './contexts/SyncContext'
import { useProfile } from './hooks/data'
import { usePendingScanCompletion } from './hooks/usePendingScanCompletion'
import { createUserDoc } from './services/profile'
import { DEFAULT_PROFILE } from './services/mappers'
import { useHashTab, type Tab } from './hooks/useHashTab'
import { ErrorBoundary } from './components/layout/ErrorBoundary'
import { BottomNav } from './components/layout/BottomNav'
import { SyncIndicator } from './components/layout/SyncIndicator'
import { ErrorNotice } from './components/ui/Feedback'
import { LoadingBlock } from './components/ui/Spinner'
import { ConfigMissing } from './features/auth/ConfigMissing'
import { LoginPage } from './features/auth/LoginPage'
import { DiaryPage } from './features/diary/DiaryPage'
import { FoodsPage } from './features/foods/FoodsPage'
import { ProfilePage } from './features/profile/ProfilePage'
import { OnboardingPage } from './features/account/OnboardingPage'

// I grafici (recharts) sono pesanti: vengono caricati solo aprendo lo Storico.
const HistoryPage = lazy(() => import('./features/history/HistoryPage'))

const TITLES: Record<Tab, string> = {
  diario: 'Diario',
  alimenti: 'I miei alimenti',
  storico: 'Storico',
  profilo: 'Profilo e obiettivi',
}

function AuthenticatedApp() {
  const uid = useUid()
  const { user } = useAuth()
  const { reportError } = useToast()
  const [tab, setTab] = useHashTab()
  const [date, setDate] = useState(todayKey)
  const { data: profile, loading, error, fromCache } = useProfile(uid)
  usePendingScanCompletion(uid)

  // Primo accesso: il server conferma che users/{uid} non esiste → si crea il profilo base.
  // (Un documento assente nella sola copia locale non basta: potrebbe esistere sul server.)
  const missingOnServer = !loading && !error && !profile && !fromCache
  const created = useRef(false)
  useEffect(() => {
    if (!missingOnServer || created.current) return
    created.current = true
    createUserDoc(uid, user?.displayName ?? null).catch(reportError)
  }, [missingOnServer, uid, user, reportError])
  const onboarding = profile ? !profile.onboarded : missingOnServer

  return (
    <div className="min-h-dvh pb-[calc(5rem+env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50/90 pt-[env(safe-area-inset-top)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
          <h1 className="text-xl font-bold">{onboarding ? 'Benvenuto' : TITLES[tab]}</h1>
          <SyncIndicator />
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-4">
        {error ? (
          <ErrorNotice error={error} title="Impossibile caricare il profilo" />
        ) : loading ? (
          <LoadingBlock />
        ) : onboarding ? (
          <OnboardingPage profile={profile ?? DEFAULT_PROFILE} />
        ) : (
          <>
            {tab === 'diario' && (
              <DiaryPage date={date} onDateChange={setDate} profile={profile} onOpenProfile={() => setTab('profilo')} />
            )}
            {tab === 'alimenti' && <FoodsPage />}
            {tab === 'storico' && (
              <Suspense fallback={<LoadingBlock />}>
                <HistoryPage profile={profile} />
              </Suspense>
            )}
            {tab === 'profilo' && <ProfilePage profile={profile} />}
          </>
        )}
      </main>
      {!onboarding && <BottomNav tab={tab} onChange={setTab} />}
    </div>
  )
}

function Gate() {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <LoadingBlock label="Avvio…" />
      </div>
    )
  }
  return user ? (
    <SyncProvider key={user.uid} uid={user.uid}>
      <AuthenticatedApp />
    </SyncProvider>
  ) : (
    <LoginPage />
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        {isFirebaseConfigured ? (
          <AuthProvider>
            <ToastProvider>
              <Gate />
            </ToastProvider>
          </AuthProvider>
        ) : (
          <ConfigMissing />
        )}
      </ThemeProvider>
    </ErrorBoundary>
  )
}
