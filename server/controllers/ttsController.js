const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ttsService = require('../services/ttsService');
const { pool } = require('../config/database');
const { ValidationError } = require('../utils/errors');

const MAX_TEXT_LENGTH = 5000;
const AUDIO_DIR = path.join(__dirname, '..', 'audio');

// Make sure the audio directory exists at boot.
fs.mkdirSync(AUDIO_DIR, { recursive: true });

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
    let { text, language, voice, speed = 1.0, pitch = 0 } = req.body || {};

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

    const characterCount = text.length;
    const wordCount = text.split(/\s+/).filter(Boolean).length;

    const result = await ttsService.generateSpeech(
      text,
      voiceRow ? voiceRow.provider_voice_id : null,
      {
        languageCode: languageRow.code,
        speed: Number(speed),
        pitch: Number(pitch),
      }
    );

    // Persist the audio so it can be replayed from History and downloaded.
    const filename = `${crypto.randomUUID()}.${result.format}`;
    await fs.promises.writeFile(path.join(AUDIO_DIR, filename), result.audio);

    const relativeUrl = `/audio/${filename}`;
    const absoluteUrl = `${req.protocol}://${req.get('host')}${relativeUrl}`;

    let generationId = null;

    if (req.user) {
      try {
        const insert = await pool.query(
          `INSERT INTO speech_generations
             (user_id, language_id, voice_id, text_content, character_count,
              word_count, audio_url, audio_format, status, created_at, completed_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'completed', NOW(), NOW())
           RETURNING id`,
          [
            req.user.id,
            languageRow.id,
            voiceRow ? voiceRow.id : null,
            text,
            characterCount,
            wordCount,
            relativeUrl,
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
