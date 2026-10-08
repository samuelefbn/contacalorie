/**
 * Contenuti del tutorial di benvenuto, separati dal componente. Descrivono solo funzioni presenti
 * nell'app: se cambia un'etichetta dell'interfaccia, va aggiornata anche qui. Cambiando i contenuti
 * in modo sostanziale si può aumentare TUTORIAL_VERSION (src/lib/tutorial.ts) per mostrarli di nuovo.
 */

export type TutorialArt = 'welcome' | 'profile' | 'diary' | 'search' | 'scan' | 'history' | 'offline'

/** Scheda della barra in basso a cui il passo rimanda (si mostra l'icona, non la posizione). */
export type TutorialTab = 'diario' | 'alimenti' | 'storico' | 'profilo'

export interface TutorialStep {
  title: string
  /** 1-3 frasi brevi. */
  body: string[]
  art: TutorialArt
  /** Dove trovarlo: icona della barra in basso con la sua etichetta. */
  where?: { tab: TutorialTab; text: string }
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: 'Benvenuto in ContaCalorie',
    body: [
      'Annota quello che mangi e confrontalo ogni giorno con il tuo obiettivo di calorie e macronutrienti.',
      'I tuoi dati sono privati: sono legati al tuo account Google e solo tu puoi vederli.',
    ],
    art: 'welcome',
  },
  {
    title: 'Profilo e obiettivi',
    body: [
      'Con sesso, età, altezza, peso, attività e obiettivo calcolo il tuo fabbisogno calorico e i macro consigliati.',
      'Preferisci un altro valore? Attiva “Imposta l’obiettivo a mano”.',
    ],
    art: 'profile',
    where: { tab: 'profilo', text: 'Lo trovi in Profilo' },
  },
  {
    title: 'Il diario di ogni giorno',
    body: [
      'Il diario è diviso in colazione, pranzo, cena e spuntini: tocca + accanto a un pasto per aggiungere un alimento.',
      'Tocca una voce per cambiarne i grammi o eliminarla. Con le frecce in alto passi da un giorno all’altro.',
    ],
    art: 'diary',
    where: { tab: 'diario', text: 'Lo trovi in Diario' },
  },
  {
    title: 'Cerca un alimento',
    body: [
      'Aggiungendo un alimento scegli tra Cerca, Miei, Recenti e Manuale.',
      'La ricerca trova alimenti generici, come “Frutta - Mela”, e prodotti confezionati con la loro marca.',
      'Indica i grammi: calorie e macro si ricalcolano da soli.',
    ],
    art: 'search',
  },
  {
    title: 'Scanner e alimenti salvati',
    body: [
      'Tocca l’icona del codice a barre accanto a Cerca: i prodotti scansionati restano tra “I miei alimenti”.',
      'Lì segni i preferiti con la stella e crei alimenti personali e ricette.',
    ],
    art: 'scan',
    where: { tab: 'alimenti', text: 'Li trovi in Alimenti' },
  },
  {
    title: 'Riepilogo e storico',
    body: [
      'In cima al diario vedi le calorie del giorno rispetto all’obiettivo e i macronutrienti.',
      'Nello Storico trovi i grafici degli ultimi 7 o 30 giorni e puoi registrare il tuo peso.',
    ],
    art: 'history',
    where: { tab: 'storico', text: 'Lo trovi in Storico' },
  },
  {
    title: 'Offline e account',
    body: [
      'L’app funziona anche senza connessione e sincronizza da sola: l’indicatore in alto ti dice a che punto è.',
      'Puoi installarla sul telefono come un’app.',
      'In Profilo trovi l’uscita, l’esportazione dei dati, l’eliminazione dell’account e “Rivedi il tutorial”.',
    ],
    art: 'offline',
    where: { tab: 'profilo', text: 'Account e dati sono in Profilo' },
  },
]
