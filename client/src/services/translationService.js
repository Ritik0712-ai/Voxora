/**
 * Browser-side translation.
 *
 * These endpoints rate-limit and then block by IP. A deployed server has one
 * shared address, so it gets blocked quickly (Render hit 429 then 403). Running
 * the request from the browser uses each visitor's own connection instead, so
 * the load is spread across users and no single address gets hot.
 *
 * All of these send Access-Control-Allow-Origin: *, so the browser can call
 * them directly. If they all fail, the caller falls back to asking the server.
 */

const ENDPOINTS = [
  {
    name: 'clients5-dict',
    url: (text, target) =>
      `https://clients5.google.com/translate_a/t?client=dict-chrome-ex` +
      `&sl=auto&tl=${encodeURIComponent(target)}&q=${encodeURIComponent(text)}`,
    parse: (body) => {
      if (Array.isArray(body) && Array.isArray(body[0])) {
        return { text: body[0][0], detected: body[0][1] || null }
      }
      if (Array.isArray(body) && typeof body[0] === 'string') {
        return { text: body[0], detected: null }
      }
      return null
    },
  },
  {
    name: 'clients5-gtx',
    url: (text, target) =>
      `https://clients5.google.com/translate_a/single?client=gtx` +
      `&sl=auto&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(text)}`,
    parse: (body) => {
      if (!Array.isArray(body) || !Array.isArray(body[0])) return null
      return { text: body[0].map((s) => s[0]).join(''), detected: body[2] || null }
    },
  },
  {
    name: 'googleapis-gtx',
    url: (text, target) =>
      `https://translate.googleapis.com/translate_a/single?client=gtx` +
      `&sl=auto&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(text)}`,
    parse: (body) => {
      if (!Array.isArray(body) || !Array.isArray(body[0])) return null
      return { text: body[0].map((s) => s[0]).join(''), detected: body[2] || null }
    },
  },
]

// Locale codes from the voices table (bn-IN) map to base language codes (bn).
const LOCALE_OVERRIDES = {
  'zh-CN': 'zh-CN',
  'zh-TW': 'zh-TW',
  'pt-BR': 'pt',
  'pt-PT': 'pt',
}

export const toTranslationCode = (locale) => {
  if (!locale) return null
  return LOCALE_OVERRIDES[locale] || locale.split('-')[0].toLowerCase()
}

const withTimeout = async (url, ms = 12000) => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  try {
    return await fetch(url, { signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

/**
 * @returns {{ text, detectedLanguage, translated, source: 'browser' }}
 * @throws when every endpoint fails, so the caller can fall back to the server.
 */
export const translateInBrowser = async (text, targetLocale) => {
  const target = toTranslationCode(targetLocale)
  if (!target) throw new Error('No target language')

  let lastError = null

  for (const endpoint of ENDPOINTS) {
    try {
      const response = await withTimeout(endpoint.url(text, target))
      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const parsed = endpoint.parse(await response.json())
      // A 200 is not proof of a translation; some mirrors return empty bodies.
      if (!parsed || !parsed.text || !parsed.text.trim()) {
        throw new Error('empty response')
      }

      return {
        text: parsed.text,
        detectedLanguage: parsed.detected || null,
        translated: parsed.text.trim() !== text.trim(),
        source: 'browser',
      }
    } catch (err) {
      lastError = err
    }
  }

  throw new Error(lastError ? lastError.message : 'All translation endpoints failed')
}

export const translationService = { translateInBrowser, toTranslationCode }
