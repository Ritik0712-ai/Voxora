const { pool } = require('../config/database');
const { NotFoundError, AppError } = require('../utils/errors');

const getUserFavorites = async (userId) => {
  const result = await pool.query(
    `SELECT f.id,
            f.user_id,
            f.speech_generation_id,
            f.voice_id,
            f.created_at,
            sg.text_content,
            sg.audio_url,
            sg.audio_format,
            sg.status        AS generation_status,
            sg.created_at    AS generation_created_at,
            sgl.code         AS generation_language_code,
            v.name           AS voice_name,
            v.gender         AS voice_gender,
            v.accent         AS voice_accent,
            v.provider_voice_id,
            vl.code          AS voice_language_code,
            vl.name          AS voice_language_name
     FROM favorites f
     LEFT JOIN speech_generations sg ON f.speech_generation_id = sg.id
     LEFT JOIN languages sgl ON sg.language_id = sgl.id
     LEFT JOIN voices v ON f.voice_id = v.id
     LEFT JOIN languages vl ON v.language_id = vl.id
     WHERE f.user_id = $1
     ORDER BY f.created_at DESC`,
    [userId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    speechGenerationId: row.speech_generation_id,
    voiceId: row.voice_id,
    createdAt: row.created_at,
    speechGeneration: row.speech_generation_id
      ? {
          id: row.speech_generation_id,
          textContent: row.text_content,
          audioUrl: row.audio_url,
          audioFormat: row.audio_format,
          status: row.generation_status,
          languageCode: row.generation_language_code,
          createdAt: row.generation_created_at,
        }
      : null,
    voice: row.voice_id
      ? {
          id: row.voice_id,
          name: row.voice_name,
          gender: row.voice_gender,
          accent: row.voice_accent,
          providerVoiceId: row.provider_voice_id,
          languageCode: row.voice_language_code,
          languageName: row.voice_language_name,
        }
      : null,
  }));
};

const addFavorite = async (userId, speechGenerationId, voiceId) => {
  if (!speechGenerationId && !voiceId) {
    throw new AppError('Either speechGenerationId or voiceId must be provided', 400);
  }

  // Only favourite generations the user actually owns.
  if (speechGenerationId) {
    const owned = await pool.query(
      'SELECT id FROM speech_generations WHERE id = $1 AND user_id = $2',
      [speechGenerationId, userId]
    );
    if (owned.rows.length === 0) {
      throw new NotFoundError('Generation not found');
    }
  }

  if (voiceId) {
    const exists = await pool.query(
      'SELECT id FROM voices WHERE id = $1 AND enabled = true',
      [voiceId]
    );
    if (exists.rows.length === 0) {
      throw new NotFoundError('Voice not found');
    }
  }

  // The table has two partial-style unique constraints
  // (user_id, speech_generation_id) and (user_id, voice_id), so target
  // whichever one applies to this insert.
  const conflictTarget = speechGenerationId
    ? '(user_id, speech_generation_id)'
    : '(user_id, voice_id)';

  const result = await pool.query(
    `INSERT INTO favorites (user_id, speech_generation_id, voice_id, created_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT ${conflictTarget} DO NOTHING
     RETURNING id, created_at`,
    [userId, speechGenerationId || null, voiceId || null]
  );

  if (result.rows.length === 0) {
    throw new AppError('Already in favorites', 409);
  }

  return {
    id: result.rows[0].id,
    userId,
    speechGenerationId: speechGenerationId || null,
    voiceId: voiceId || null,
    createdAt: result.rows[0].created_at,
  };
};

const removeFavorite = async (id, userId) => {
  const result = await pool.query(
    'DELETE FROM favorites WHERE id = $1 AND user_id = $2 RETURNING id',
    [id, userId]
  );
  if (result.rows.length === 0) {
    throw new NotFoundError('Favorite not found');
  }
  return true;
};

const checkFavorite = async (userId, speechGenerationId, voiceId) => {
  if (!speechGenerationId && !voiceId) return false;

  const clauses = ['user_id = $1'];
  const params = [userId];

  if (speechGenerationId) {
    params.push(speechGenerationId);
    clauses.push(`speech_generation_id = $${params.length}`);
  }
  if (voiceId) {
    params.push(voiceId);
    clauses.push(`voice_id = $${params.length}`);
  }

  const result = await pool.query(
    `SELECT id FROM favorites WHERE ${clauses.join(' AND ')} LIMIT 1`,
    params
  );
  return result.rows.length > 0;
};

module.exports = { getUserFavorites, addFavorite, removeFavorite, checkFavorite };
