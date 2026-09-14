const ttsService = require('../services/ttsService');
const translationService = require('../services/translationService');
const storageService = require('../services/storageService');
const { pool } = require('../config/database');
const { ValidationError } = require('../utils/errors');

const MAX_TEXT_LENGTH = 5000;

/**
 * Resolve the client's voice selection to a DB row.
 * Accepts either the voices.id UUID or the provider_voice_id string,
 * so the endpoint stays usable from curl as well as the UI.
 */
const resolveVoice = async (voice) => {
  if (!voice) return null;

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(voice);

  const result = await pool.query(
    `SELECT v.id, v.provider_voice_id, v.name, v.language_id, l.code AS language_code
     FROM voices v
     JOIN languages l ON v.language_id = l.id
     WHERE v.enabled = true AND ${isUuid ? 'v.id = $1' : 'v.provider_voice_id = $1'}
     LIMIT 1`,
    [voice]
  );

  return result.rows[0] || null;
};

const resolveLanguage = async (code) => {
  if (!code) return null;
  const result = await pool.query(
    'SELECT id, code FROM languages WHERE code = $1 AND enabled = true LIMIT 1',
    [code]
  );
  return result.rows[0] || null;
};

const generateSpeech = async (req, res, next) => {
  try {
    let { text, language, voice, speed = 1.0, pitch = 0, translate = true } = req.body || {};

    if (typeof text !== 'string' || text.trim().length === 0) {
      throw new ValidationError('Text is required.');
    }

    text = text.trim();
    language = typeof language === 'string' ? language.trim() : null;
    voice = typeof voice === 'string' ? voice.trim() : null;

    if (text.length > MAX_TEXT_LENGTH) {
      throw new ValidationError(
        `Text exceeds the maximum length of ${MAX_TEXT_LENGTH} characters.`
      );
    }

    const voiceRow = await resolveVoice(voice);
    if (voice && !voiceRow) {
      throw new ValidationError('The selected voice is not available.');
    }

    // Language comes from the voice when we have one; otherwise from the request.
    const languageRow = voiceRow
      ? { id: voiceRow.language_id, code: voiceRow.language_code }
      : await resolveLanguage(language);

    if (!languageRow) {
      throw new ValidationError('A valid language or voice must be selected.');
    }

    // Speech synthesis reads text aloud, it never rewrites it. So to actually
    // hear the target language rather than the typed language in a local
    // accent, the text has to be translated first.
    const sourceText = text;
    let spokenText = text;
    let translation = { translated: false, detectedLanguage: null, skippedReason: null };

    if (translate) {
      const outcome = await translationService.translate(sourceText, languageRow.code);
      spokenText = outcome.text;
      translation = {
        translated: outcome.translated,
        detectedLanguage: outcome.detectedLanguage,
        skippedReason: outcome.skippedReason || null,
      };
    }

    const characterCount = spokenText.length;
    const wordCount = spokenText.split(/\s+/).filter(Boolean).length;

    const result = await ttsService.generateSpeech(
      spokenText,
      voiceRow ? voiceRow.provider_voice_id : null,
      {
        languageCode: languageRow.code,
        speed: Number(speed),
        pitch: Number(pitch),
      }
    );

    // Persist the audio so it can be replayed from History and downloaded.
    // Goes to object storage when configured, local disk otherwise.
    const stored = await storageService.saveAudio(result.audio, result.format);
    const absoluteUrl = storageService.toAbsoluteUrl(stored.url, req);

    let generationId = null;

    if (req.user) {
      try {
        const insert = await pool.query(
          `INSERT INTO speech_generations
             (user_id, language_id, voice_id, text_content, source_text,
              source_language, was_translated, character_count, word_count,
              audio_url, audio_format, status, created_at, completed_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'completed', NOW(), NOW())
           RETURNING id`,
          [
            req.user.id,
            languageRow.id,
            voiceRow ? voiceRow.id : null,
            spokenText,
            sourceText,
            translation.detectedLanguage,
            translation.translated,
            characterCount,
            wordCount,
            stored.url,
            result.format,
          ]
        );
        generationId = insert.rows[0].id;
      } catch (dbError) {
        // A history write failing must not cost the user their audio.
        console.error('Failed to save generation to history:', dbError.message);
      }
    }

    res.status(200).json({
      status: 'success',
      generationId,
      audioUrl: absoluteUrl,
      format: result.format,
      provider: result.provider,
      characterCount,
      wordCount,
      sourceText,
      spokenText,
      translated: translation.translated,
      detectedLanguage: translation.detectedLanguage,
      translationNote: translation.skippedReason,
      voice: voiceRow
        ? { id: voiceRow.id, name: voiceRow.name, providerVoiceId: voiceRow.provider_voice_id }
        : null,
      language: { id: languageRow.id, code: languageRow.code },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { generateSpeech };
