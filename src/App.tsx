import { lazy, Suspense, useState } from 'react'
import { isFirebaseConfigured } from './lib/firebase'
import { todayKey } from './lib/dates'
import { AuthProvider, useAuth, useUid } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { ToastProvider } from './contexts/ToastContext'
import { useProfile } from './hooks/data'
import { useHashTab, type Tab } from './hooks/useHashTab'
import { ErrorBoundary } from './components/layout/ErrorBoundary'
import { BottomNav } from './components/layout/BottomNav'
import { OfflineBanner } from './components/layout/OfflineBanner'
import { ErrorNotice } from './components/ui/Feedback'
import { LoadingBlock } from './components/ui/Spinner'
import { ConfigMissing } from './features/auth/ConfigMissing'
import { LoginPage } from './features/auth/LoginPage'
import { DiaryPage } from './features/diary/DiaryPage'
import { FoodsPage } from './features/foods/FoodsPage'
import { ProfilePage } from './features/profile/ProfilePage'

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
  const [tab, setTab] = useHashTab()
  const [date, setDate] = useState(todayKey)
  const { data: profile, loading, error } = useProfile(uid)

  return (
    <div className="min-h-dvh pb-[calc(5rem+env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50/90 pt-[env(safe-area-inset-top)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <OfflineBanner />
        <h1 className="mx-auto max-w-2xl px-4 py-3 text-xl font-bold">{TITLES[tab]}</h1>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-4">
        {error ? (
          <ErrorNotice error={error} title="Impossibile caricare il profilo" />
        ) : loading ? (
          <LoadingBlock />
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
      <BottomNav tab={tab} onChange={setTab} />
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
  return user ? <AuthenticatedApp key={user.uid} /> : <LoginPage />
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
