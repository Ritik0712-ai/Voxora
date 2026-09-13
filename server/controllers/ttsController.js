const { validationResult } = require('express-validator');
const ttsService = require('../services/ttsService');
const { TTSError } = require('../utils/errors');
const { pool } = require('../config/database');

// Text limits
const MAX_TEXT_LENGTH = 5000;
const MIN_TEXT_LENGTH = 1;

// Generate speech
exports.generateSpeech = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    let { text, language, voice, speed = 1.0, pitch = 0 } = req.body;

    // Normalize text
    text = text.trim();
    language = language?.trim();
    voice = voice?.trim();

    // Validate text length
    if (text.length < MIN_TEXT_LENGTH) {
      return res.status(400).json({ error: 'Text cannot be empty.' });
    }

    if (text.length > MAX_TEXT_LENGTH) {
      return res.status(400).json({
        error: `Text exceeds maximum length of ${MAX_TEXT_LENGTH} characters.`
      });
    }

    // Validate speed
    if (speed < 0.5 || speed > 2.0) {
      speed = 1.0;
    }

    // Validate pitch
    if (pitch < -20 || pitch > 20) {
      pitch = 0;
    }

    // Generate speech
    const audioBuffer = await ttsService.generateSpeech(text, voice, {
      language,
      speed,
      pitch
    });

    // Save to history if user is authenticated
    let generationId = null;
    if (req.user) {
      try {
        const result = await pool.query(
          `INSERT INTO speech_generations
           (user_id, text_content, character_count, word_count, voice_name,
            language_code, audio_format, status, completed_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'completed', NOW())
           RETURNING id`,
          [
            req.user.id,
            text.substring(0, 500), // Store preview
            text.length,
            text.split(/\s+/).filter(w => w.length > 0).length,
            voice,
            language,
            'mp3'
          ]
        );
        generationId = result.rows[0].id;
      } catch (dbError) {
        console.error('Failed to save to history:', dbError);
      }
    }

    // Send audio as response
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Disposition': 'inline; filename="speech.mp3"',
      'Content-Length': audioBuffer.length,
      'X-Generation-Id': generationId || ''
    });
    res.send(audioBuffer);

  } catch (error) {
    next(error);
  }
};
