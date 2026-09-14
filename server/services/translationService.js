const crypto = require('crypto');

const { pool } = require('../config/database');
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

// Several endpoints for the same underlying service. Rate limits are applied
// per IP and per endpoint, so a datacenter IP that is throttled on one may
// still be served by another. Ordered cheapest-first.
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// A 200 is not proof of a translation: some mirrors return an empty body with
// a success code, so every parser must reject empty output.
const ENDPOINTS = [
  {
    name: 'clients5-dict',
    url: (text, target) =>
      `https://clients5.google.com/translate_a/t?client=dict-chrome-ex` +
      `&sl=auto&tl=${encodeURIComponent(target)}&q=${encodeURIComponent(text)}`,
    parse: (body) => {
      if (Array.isArray(body) && Array.isArray(body[0])) {
        return { text: body[0][0], detected: body[0][1] || null };
      }
      if (Array.isArray(body) && typeof body[0] === 'string') {
        return { text: body[0], detected: null };
      }
      return null;
    },
  },
  {
    name: 'clients5-gtx',
    url: (text, target) =>
      `https://clients5.google.com/translate_a/single?client=gtx` +
      `&sl=auto&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(text)}`,
    parse: (body) => {
      if (!Array.isArray(body) || !Array.isArray(body[0])) return null;
      return {
        text: body[0].map((seg) => seg[0]).join(''),
        detected: body[2] || null,
      };
    },
  },
  {
    name: 'googleapis-gtx',
    url: (text, target) =>
      `https://translate.googleapis.com/translate_a/single?client=gtx` +
      `&sl=auto&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(text)}`,
    parse: (body) => {
      if (!Array.isArray(body) || !Array.isArray(body[0])) return null;
      return {
        text: body[0].map((seg) => seg[0]).join(''),
        detected: body[2] || null,
      };
    },
  },
  {
    name: 'lingva',
    url: (text, target) =>
      `https://lingva.ml/api/v1/auto/${encodeURIComponent(target)}/${encodeURIComponent(text)}`,
    parse: (body) =>
      body && body.translation ? { text: body.translation, detected: null } : null,
  },
];

const MAX_ATTEMPTS = 3;

// Rate limits usually clear within seconds, so back off meaningfully rather
// than retrying three times inside half a second. Jittered so concurrent
// requests do not retry in lockstep.
const backoffMs = (attempt) => (1000 * Math.pow(2.5, attempt)) + Math.random() * 500;

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
    if (!parsed || !parsed.text || !parsed.text.trim()) {
      // Some mirrors answer 200 with an empty translation.
      throw new Error('empty or unrecognised response');
    }
    return parsed;
  } finally {
    clearTimeout(timeout);
  }
};

const cacheKey = (text, target) =>
  crypto.createHash('sha256').update(`${target}\u0000${text}`).digest('hex');

const readCache = async (text, target) => {
  try {
    const result = await pool.query(
      `UPDATE translation_cache
          SET hit_count = hit_count + 1, last_used_at = NOW()
        WHERE cache_key = $1
        RETURNING translated_text, detected_language`,
      [cacheKey(text, target)]
    );
    return result.rows[0] || null;
  } catch (err) {
    // A cache miss must never break translation.
    console.error('Translation cache read failed:', err.message);
    return null;
  }
};

const writeCache = async (text, target, translated, detected) => {
  try {
    await pool.query(
      `INSERT INTO translation_cache
         (cache_key, source_text, target_language, translated_text, detected_language, hit_count)
       VALUES ($1, $2, $3, $4, $5, 0)
       ON CONFLICT (cache_key) DO NOTHING`,
      [cacheKey(text, target), text, target, translated, detected]
    );
  } catch (err) {
    console.error('Translation cache write failed:', err.message);
  }
};

/**
 * @param {string} text
 * @param {string} targetLocale  e.g. "bn-IN"
 * @returns {{ text, detectedLanguage, translated: boolean, cached?: boolean, skippedReason?: string }}
 */
const translate = async (text, targetLocale) => {
  const target = toTranslationCode(targetLocale);

  if (!target) {
    return { text, detectedLanguage: null, translated: false, skippedReason: 'no target language' };
  }

  const cached = await readCache(text, target);
  if (cached) {
    const unchanged = cached.translated_text.trim() === text.trim();
    return {
      text: cached.translated_text,
      detectedLanguage: cached.detected_language,
      translated: !unchanged,
      cached: true,
      skippedReason: unchanged ? 'text is already in the target language' : undefined,
    };
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

        await writeCache(text, target, result.text, result.detected || null);

        return {
          text: result.text,
          detectedLanguage: result.detected || null,
          translated: !unchanged,
          cached: false,
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
    if (attempt < MAX_ATTEMPTS - 1) await sleep(backoffMs(attempt));
  }

  throw new AppError(
    `Translation failed: ${lastError ? lastError.message : 'unknown error'}. ` +
      `You can turn translation off to speak the text exactly as written.`,
    502
  );
};

module.exports = { translate, toTranslationCode };
