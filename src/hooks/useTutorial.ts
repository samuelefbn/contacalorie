import { useCallback, useEffect, useState } from 'react'
import { useToast } from '../contexts/ToastContext'
import { saveTutorialDone } from '../services/tutorial'
import {
  TUTORIAL_VERSION,
  browserStore,
  clearOtherTutorialCaches,
  readCachedVersion,
  shouldShowTutorial,
  writeCachedVersion,
} from '../lib/tutorial'
import { useTutorialState } from './data'

export const SKIP_HINT = 'Puoi rivederlo da Account'

export interface TutorialControl {
  open: boolean
  /** 'first': primo accesso, alla chiusura si salva lo stato. 'replay': "Rivedi il tutorial", nessuna scrittura. */
  mode: 'first' | 'replay'
  /** Chiusura: completed = true con "Inizia" all'ultimo passo, false con "Salta" o Esc. */
  finish: (completed: boolean) => void
  replay: () => void
}

/**
 * Tutorial di benvenuto: compare da solo al primo accesso, dopo l'onboarding del profilo (`blocked`
 * finché il profilo è in caricamento o da completare), e si riapre a richiesta da Account.
 */
export function useTutorial(uid: string, blocked: boolean): TutorialControl {
  const { notify, reportError } = useToast()
  const { data: state, loading, error, fromCache } = useTutorialState(uid)
  // Letta una volta per utente: AuthenticatedApp viene rimontata a ogni cambio di uid.
  const [cachedVersion, setCachedVersion] = useState(() => readCachedVersion(browserStore(), uid))
  const [replaying, setReplaying] = useState(false)

  useEffect(() => clearOtherTutorialCaches(browserStore(), uid), [uid])

  // Completato su un altro dispositivo: lo si ricorda anche qui, per i prossimi avvii.
  const doneVersion = state?.completed ? state.version : null
  useEffect(() => {
    if (doneVersion !== null && doneVersion >= TUTORIAL_VERSION) writeCachedVersion(browserStore(), uid, doneVersion)
  }, [doneVersion, uid])

  const auto = shouldShowTutorial({
    blocked: blocked || loading,
    error: error !== null,
    fromCache,
    state,
    cachedVersion,
  })

  const finish = useCallback(
    (completed: boolean) => {
      if (replaying) return setReplaying(false)
      // Prima la cache locale (si chiude subito e non ricompare), poi Firestore senza attendere (offline).
      writeCachedVersion(browserStore(), uid, TUTORIAL_VERSION)
      setCachedVersion(TUTORIAL_VERSION)
      saveTutorialDone(uid, !completed).catch(reportError)
      if (!completed) notify(SKIP_HINT)
    },
    [replaying, uid, notify, reportError],
  )

  const replay = useCallback(() => setReplaying(true), [])

  return { open: replaying || auto, mode: replaying ? 'replay' : 'first', finish, replay }
}
