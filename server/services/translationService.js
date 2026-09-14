const { AppError } = require('../utils/errors');

/**
 * Text-to-speech reads text aloud; it never changes the words. So speaking
 * English text with a Bengali voice produces English in a Bengali accent.
 * To actually hear Bengali, the text has to be translated first — that is what
 * this module does, as a step before synthesis.
 */

// The voices table uses full locale codes (bn-IN); translation wants the
// base language (bn). A few need an explicit mapping rather than a split.
const LOCALE_TO_LANG = {
  'zh-CN': 'zh-CN',
  'zh-TW': 'zh-TW',
  'pt-BR': 'pt',
  'pt-PT': 'pt',
  'nb-NO': 'no',
};

const toTranslationCode = (locale) => {
  if (!locale) return null;
  return LOCALE_TO_LANG[locale] || locale.split('-')[0].toLowerCase();
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Two endpoints for the same service. The first is more heavily rate-limited
// from shared IPs, so it is the fallback rather than the primary.
const ENDPOINTS = [
  {
    name: 'clients5',
    url: (text, target) =>
      `https://clients5.google.com/translate_a/t?client=dict-chrome-ex` +
      `&sl=auto&tl=${encodeURIComponent(target)}&q=${encodeURIComponent(text)}`,
    parse: (body) => {
      // Either ["translated"] or [["translated","detectedLang"]]
      if (Array.isArray(body) && Array.isArray(body[0])) {
        return { text: body[0][0], detected: body[0][1] || null };
      }
      if (Array.isArray(body)) return { text: body[0], detected: null };
      return null;
    },
  },
  {
    name: 'googleapis',
    url: (text, target) =>
      `https://translate.googleapis.com/translate_a/single?client=gtx` +
      `&sl=auto&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(text)}`,
    parse: (body) => {
      if (!Array.isArray(body) || !Array.isArray(body[0])) return null;
      return {
        text: body[0].map((segment) => segment[0]).join(''),
        detected: body[2] || null,
      };
    },
  },
];

const MAX_ATTEMPTS = 3;

const callEndpoint = async (endpoint, text, target) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(endpoint.url(text, target), {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: controller.signal,
    });

    if (!response.ok) {
      const err = new Error(`HTTP ${response.status}`);
      err.status = response.status;
      throw err;
    }

    const parsed = endpoint.parse(await response.json());
    if (!parsed || !parsed.text) {
      throw new Error('unexpected response shape');
    }
    return parsed;
  } finally {
    clearTimeout(timeout);
  }
};

/**
 * @param {string} text
 * @param {string} targetLocale  e.g. "bn-IN"
 * @returns {{ text, detectedLanguage, translated: boolean, skippedReason?: string }}
 */
const translate = async (text, targetLocale) => {
  const target = toTranslationCode(targetLocale);

  if (!target) {
    return { text, detectedLanguage: null, translated: false, skippedReason: 'no target language' };
  }

  let lastError = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    for (const endpoint of ENDPOINTS) {
      try {
        const result = await callEndpoint(endpoint, text, target);

        // If the source is already the target language the service echoes the
        // input back. Report that honestly rather than claiming a translation.
        const detected = (result.detected || '').toLowerCase();
        const unchanged = result.text.trim() === text.trim();

        return {
          text: result.text,
          detectedLanguage: result.detected || null,
          translated: !unchanged,
          skippedReason: unchanged
            ? detected === target
              ? 'text is already in the target language'
              : 'translation returned the input unchanged'
            : undefined,
        };
      } catch (err) {
        // Try the next endpoint before giving up on this round.
        lastError = err;
      }
    }
    // Back off before the next round; rate limits clear quickly.
    if (attempt < MAX_ATTEMPTS - 1) await sleep(500 * (attempt + 1));
  }

  throw new AppError(
    `Translation failed: ${lastError ? lastError.message : 'unknown error'}. ` +
      `You can turn translation off to speak the text exactly as written.`,
    502
  );
};

module.exports = { translate, toTranslationCode };
