import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Sheet } from '../../components/ui/Sheet'
import { Button } from '../../components/ui/Button'
import { TextField } from '../../components/ui/Fields'
import { Spinner } from '../../components/ui/Spinner'

interface Props {
  onDetected: (code: string) => void
  onClose: () => void
}

type CameraState = 'starting' | 'scanning' | 'error'

/** Scansione del codice a barre con la fotocamera posteriore, con inserimento manuale di riserva. */
export function BarcodeScanner({ onDetected, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [state, setState] = useState<CameraState>('starting')
  const [cameraError, setCameraError] = useState('')
  const [manual, setManual] = useState('')
  const onDetectedRef = useRef(onDetected)
  useEffect(() => {
    onDetectedRef.current = onDetected
  })

  useEffect(() => {
    let stopped = false
    let stop: (() => void) | undefined

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Questo browser non consente l’accesso alla fotocamera (serve HTTPS).')
      }
      // Libreria caricata solo quando serve, per non appesantire l'avvio dell'app.
      const { BrowserMultiFormatReader } = await import('@zxing/browser')
      if (stopped || !videoRef.current) return
      const reader = new BrowserMultiFormatReader()
      const controls = await reader.decodeFromConstraints(
        { video: { facingMode: { ideal: 'environment' } }, audio: false },
        videoRef.current,
        (result) => {
          if (result && !stopped) {
            stopped = true
            controls.stop()
            navigator.vibrate?.(60)
            onDetectedRef.current(result.getText())
          }
        },
      )
      stop = () => controls.stop()
      if (stopped) stop()
      else setState('scanning')
    }

    start().catch((err: Error) => {
      if (stopped) return
      setState('error')
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Permesso fotocamera negato. Abilitalo dalle impostazioni del browser o inserisci il codice a mano.'
          : err.name === 'NotFoundError'
            ? 'Nessuna fotocamera disponibile.'
            : err.message,
      )
    })

    return () => {
      stopped = true
      stop?.()
    }
  }, [])

  const submitManual = (e: FormEvent) => {
    e.preventDefault()
    const code = manual.replace(/\D/g, '')
    if (code.length >= 6) onDetected(code)
  }

  return (
    <Sheet title="Scansiona codice a barre" onClose={onClose}>
      <div className="space-y-4">
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-black">
          <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
          {state === 'starting' && (
            <div className="absolute inset-0 flex items-center justify-center gap-2 text-white">
              <Spinner /> Avvio fotocamera…
            </div>
          )}
          {state === 'scanning' && (
            <div className="pointer-events-none absolute inset-x-8 top-1/2 h-0.5 -translate-y-1/2 bg-red-500 shadow-[0_0_8px_2px_rgba(239,68,68,0.7)]" />
          )}
          {state === 'error' && (
            <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-white">
              {cameraError}
            </div>
          )}
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">Inquadra il codice a barre della confezione.</p>
        <form onSubmit={submitManual} className="flex items-end gap-2">
          <TextField
            label="Oppure inserisci il codice"
            inputMode="numeric"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" variant="secondary">
            Cerca
          </Button>
        </form>
      </div>
    </Sheet>
  )
}
