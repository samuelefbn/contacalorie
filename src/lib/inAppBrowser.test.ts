import { describe, expect, it } from 'vitest'
import { classifySignInError, detectInAppBrowser } from './inAppBrowser'

// User agent reali (copiati da dispositivi e da raccolte pubbliche di user agent).
const UA = {
  safariIos:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  chromeIos:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.6478.54 Mobile/15E148 Safari/604.1',
  chromeAndroid:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.6478.71 Mobile Safari/537.36',
  samsungAndroid:
    'Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36',
  desktopChrome:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  whatsappAndroid:
    'Mozilla/5.0 (Linux; Android 13; SM-A536B Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.6099.230 Mobile Safari/537.36 WhatsApp/2.24.1.6',
  whatsappIos:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 WhatsApp/24.1.75',
  instagramIos:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 326.0.3.30.91 (iPhone15,2; iOS 17_4_1; it_IT; it; scale=3.00; 1179x2556; 584349296)',
  instagramAndroid:
    'Mozilla/5.0 (Linux; Android 14; Pixel 7 Build/AP2A.240605.024; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0.6478.71 Mobile Safari/537.36 Instagram 337.0.0.35.102 Android (34/14; 420dpi; 1080x2400; Google/google; Pixel 7; panther; panther; it_IT; 614183393)',
  facebookIos:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/468.0.0.46.104;FBBV/602108767;FBDV/iPhone15,3;FBMD/iPhone;FBSN/iOS;FBSV/17.5;FBSS/3;FBID/phone;FBLC/it_IT;FBOP/5;FBRV/604205012]',
  messengerAndroid:
    'Mozilla/5.0 (Linux; Android 13; SM-G991B Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.6099.193 Mobile Safari/537.36 [FB_IAB/Orca-Android;FBAV/440.0.0.31.105;]',
  tiktokAndroid:
    'Mozilla/5.0 (Linux; Android 12; M2101K6G Build/SKQ1.210908.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/109.0.5414.118 Mobile Safari/537.36 trill_310503 JsSdk/1.0 NetType/WIFI Channel/googleplay AppName/trill app_version/31.5.3 ByteLocale/it BytedanceWebview/d8a21c6',
  lineIos:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Safari Line/13.16.0',
  linkedinIos:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [LinkedInApp]/9.29.8433',
  genericAndroidWebView:
    'Mozilla/5.0 (Linux; Android 13; Pixel 6 Build/TQ3A.230805.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/115.0.5790.166 Mobile Safari/537.36',
  iosWebViewOrPwa:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
}

describe('rilevamento dei browser in-app', () => {
  it.each([
    ['Safari iOS', UA.safariIos],
    ['Chrome iOS', UA.chromeIos],
    ['Chrome Android', UA.chromeAndroid],
    ['Samsung Internet', UA.samsungAndroid],
    ['Chrome desktop', UA.desktopChrome],
  ])('%s è un browser normale: login consentito', (_name, ua) => {
    expect(detectInAppBrowser(ua)).toEqual({ inApp: false, app: null })
  })

  it.each([
    ['WhatsApp', UA.whatsappAndroid],
    ['WhatsApp', UA.whatsappIos],
    ['Instagram', UA.instagramIos],
    ['Instagram', UA.instagramAndroid],
    ['Facebook', UA.facebookIos],
    ['Messenger', UA.messengerAndroid],
    ['TikTok', UA.tiktokAndroid],
    ['LINE', UA.lineIos],
    ['LinkedIn', UA.linkedinIos],
    ['WebView', UA.genericAndroidWebView],
    ['WebView', UA.iosWebViewOrPwa],
  ])('%s viene riconosciuto come browser in-app', (app, ua) => {
    expect(detectInAppBrowser(ua)).toEqual({ inApp: true, app })
  })

  it('l’app installata sulla schermata Home di iPhone non è una WebView', () => {
    expect(detectInAppBrowser(UA.iosWebViewOrPwa, true)).toEqual({ inApp: false, app: null })
  })
})

describe('errori del popup di Google', () => {
  it.each([
    ['auth/popup-closed-by-user', 'ignore'],
    ['auth/cancelled-popup-request', 'ignore'],
    ['auth/popup-blocked', 'popup-unavailable'],
    ['auth/operation-not-supported-in-this-environment', 'popup-unavailable'],
    ['auth/network-request-failed', 'error'],
    ['auth/unauthorized-domain', 'error'],
  ])('%s → %s', (code, expected) => {
    expect(classifySignInError({ code })).toBe(expected)
  })
})
