const { pool } = require('../config/database');

const getUserFavorites = async (userId) => {
  const result = await pool.query(
    `SELECT f.id, f.user_id, f.speech_generation_id, f.voice_id, f.created_at,
            sg.text_content, sg.language_code, sg.audio_url, sg.status,
            v.name AS voice_name, v.language_code AS voice_language_code,
            l.name AS language_name
     FROM favorites f
     LEFT JOIN speech_generations sg ON f.speech_generation_id = sg.id
     LEFT JOIN voices v ON f.voice_id = v.id
     LEFT JOIN languages l ON v.language_id = l.id
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
          textContent: row.text_content,
          languageCode: row.language_code,
          audioUrl: row.audio_url,
          status: row.status,
        }
      : null,
    voice: row.voice_id
      ? {
          name: row.voice_name,
          languageCode: row.voice_language_code,
          languageName: row.language_name,
        }
      : null,
  }));
};

const addFavorite = async (userId, speechGenerationId, voiceId) => {
  if (!speechGenerationId && !voiceId) {
    throw new Error('Either speechGenerationId or voiceId must be provided');
  }

  const result = await pool.query(
    `INSERT INTO favorites (user_id, speech_generation_id, voice_id, created_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT DO NOTHING
     RETURNING id`,
    [userId, speechGenerationId || null, voiceId || null]
  );

  if (result.rows.length === 0) {
    throw new Error('Favorite already exists');
  }

  return { id: result.rows[0].id, userId, speechGenerationId, voiceId };
};

const removeFavorite = async (id, userId) => {
  const result = await pool.query(
    'DELETE FROM favorites WHERE id = $1 AND user_id = $2 RETURNING id',
    [id, userId]
  );
  return result.rows.length > 0;
};

const checkFavorite = async (userId, speechGenerationId, voiceId) => {
  const result = await pool.query(
    'SELECT id FROM favorites WHERE user_id = $1 AND speech_generation_id = $2 AND voice_id = $3',
    [userId, speechGenerationId || null, voiceId || null]
  );
  return result.rows.length > 0;
};

module.exports = { getUserFavorites, addFavorite, removeFavorite, checkFavorite };
