import type { Profile } from '../../types'
import { useAuth, useUid } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { saveProfile } from '../../services/profile'
import { ProfileForm } from '../profile/ProfileForm'

/** Onboarding breve del nuovo utente: peso, altezza, età, sesso, attività e obiettivo. */
export function OnboardingPage({ profile }: { profile: Profile }) {
  const uid = useUid()
  const { user } = useAuth()
  const { reportError } = useToast()
  const name = user?.displayName?.split(' ')[0]

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Benvenuto{name ? `, ${name}` : ''}! 👋</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Due dati su di te e il tuo obiettivo: calcolo le calorie giornaliere consigliate. Potrai cambiarli quando vuoi dal Profilo.
        </p>
      </div>
      <ProfileForm profile={profile} isNew displayName={user?.displayName ?? null} />
      <button
        type="button"
        className="w-full text-center text-sm text-slate-500 underline dark:text-slate-400"
        onClick={() => saveProfile(uid, { ...profile, onboarded: true }).catch(reportError)}
      >
        Salta per ora (userò i valori predefiniti)
      </button>
    </div>
  )
}
