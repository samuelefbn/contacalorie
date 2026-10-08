/** Piccolo segno sulle voci salvate sul dispositivo ma non ancora inviate al server. */
export function PendingMark() {
  return (
    <span
      title="Non ancora sincronizzato: verrà inviato appena c’è connessione"
      aria-label="Non ancora sincronizzato"
      role="img"
      className="inline-block h-2 w-2 shrink-0 rounded-full bg-amber-500"
    />
  )
}
