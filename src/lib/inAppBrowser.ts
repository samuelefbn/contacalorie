/**
 * Browser integrati nelle app (WhatsApp, Instagram, Facebook…) e WebView: Google blocca l'accesso
 * OAuth al loro interno (errore "disallowed_useragent"), quindi l'app chiede di aprire il link
 * in Safari o Chrome invece di provare il login.
 */

const IN_APP: [RegExp, string][] = [
  [/WhatsApp/i, 'WhatsApp'],
  [/Instagram/i, 'Instagram'],
  // Messenger prima di Facebook: le due app condividono FBAN/FBAV.
  [/FB_IAB\/MESSENGER|FBAN\/Messenger|MessengerForiOS|\bOrca-Android\b/i, 'Messenger'],
  [/FBAN|FBAV|FB_IAB|FBIOS|\[FB/i, 'Facebook'],
  [/musical_ly|Bytedance|BytedanceWebview|TikTok|trill_/i, 'TikTok'],
  [/\bLine\/\d/i, 'LINE'],
  [/LinkedInApp/i, 'LinkedIn'],
]

export interface InAppBrowser {
  inApp: boolean
  /** Nome dell'app riconosciuta, "WebView" se generica, null se è un browser normale. */
  app: string | null
}

/**
 * @param ua user agent
 * @param standalone true se l'app è installata sulla schermata Home (PWA): su iOS il suo user agent
 *   assomiglia a quello di una WebView ma il login funziona, quindi non va bloccata.
 */
export function detectInAppBrowser(ua: string, standalone = false): InAppBrowser {
  for (const [re, app] of IN_APP) if (re.test(ua)) return { inApp: true, app }
  if (standalone) return { inApp: false, app: null }
  // WebView Android: "; wv)" nel user agent.
  if (/Android/i.test(ua) && /;\s*wv\)/i.test(ua)) return { inApp: true, app: 'WebView' }
  // WebView iOS (WKWebView): WebKit su iPhone/iPad senza "Safari/" e senza i browser veri (Chrome, Firefox, Edge…).
  const ios = /iPhone|iPad|iPod/i.test(ua)
  const realIosBrowser = /Safari\/|CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo|GSA\//i.test(ua)
  if (ios && /AppleWebKit/i.test(ua) && !realIosBrowser) return { inApp: true, app: 'WebView' }
  return { inApp: false, app: null }
}

/** Rilevamento nel browser corrente. */
export function currentInAppBrowser(): InAppBrowser {
  if (typeof navigator === 'undefined') return { inApp: false, app: null }
  const standalone =
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    (typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches === true)
  return detectInAppBrowser(navigator.userAgent, standalone)
}

/** Esito di un errore del popup di Google: da ignorare, popup non utilizzabile, o errore vero. */
export type SignInFailure = 'ignore' | 'popup-unavailable' | 'error'

export function classifySignInError(err: unknown): SignInFailure {
  const code = (err as { code?: string } | null)?.code ?? ''
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return 'ignore'
  if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') return 'popup-unavailable'
  return 'error'
}
