import type { Profile } from '../../types'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme, type ThemePref } from '../../contexts/ThemeContext'
import { useInstallPrompt } from '../../hooks/useInstallPrompt'
import { DEFAULT_PROFILE } from '../../services/mappers'
import { Card, SectionTitle } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Segmented } from '../../components/ui/Fields'
import { ExportSection } from './ExportSection'
import { ProfileForm } from './ProfileForm'

export function ProfilePage({ profile }: { profile: Profile | null }) {
  const { user, signOut } = useAuth()
  const { theme, setTheme } = useTheme()
  const install = useInstallPrompt()

  return (
    <div className="space-y-4">
      <Card className="flex items-center gap-3">
        {user?.photoURL ? (
          <img src={user.photoURL} alt="" className="h-12 w-12 rounded-full" referrerPolicy="no-referrer" />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-xl dark:bg-emerald-900">👤</div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{user?.displayName ?? 'Utente'}</p>
          <p className="truncate text-sm text-slate-500 dark:text-slate-400">{user?.email}</p>
        </div>
        <Button size="sm" variant="secondary" onClick={() => void signOut()}>
          Esci
        </Button>
      </Card>

      <ProfileForm
        key={profile ? JSON.stringify(profile) : 'new'}
        profile={profile ?? DEFAULT_PROFILE}
        isNew={!profile}
        displayName={user?.displayName ?? null}
      />

      <Card className="space-y-3">
        <SectionTitle>Aspetto</SectionTitle>
        <Segmented<ThemePref>
          label="Tema"
          value={theme}
          onChange={setTheme}
          options={[
            { value: 'system', label: 'Sistema' },
            { value: 'light', label: '☀️ Chiaro' },
            { value: 'dark', label: '🌙 Scuro' },
          ]}
        />
        {install && (
          <Button variant="secondary" className="w-full" onClick={() => void install()}>
            📲 Installa l’app sul dispositivo
          </Button>
        )}
      </Card>

      <ExportSection />

      <p className="pb-4 text-center text-xs text-slate-400">
        Dati nutrizionali da{' '}
        <a href="https://world.openfoodfacts.org" target="_blank" rel="noreferrer" className="underline">
          Open Food Facts
        </a>{' '}
        (licenza ODbL).
      </p>
    </div>
  )
}
