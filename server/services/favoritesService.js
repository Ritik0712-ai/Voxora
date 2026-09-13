const { pool } = require('../config/database');
const { NotFoundError, AuthorizationError, AppError } = require('../utils/errors');

const addFavorite = async (userId, speechGenerationId = null, voiceId = null) => {
  if (!speechGenerationId && !voiceId) {
    throw new AppError('Either speechGenerationId or voiceId must be provided', 400);
  }

  const params = [userId];
  let query = '';
  let paramIndex = 2;

  if (speechGenerationId) {
    const existing = await pool.query(
      'SELECT id FROM speech_generations WHERE id = $1 AND user_id = $2',
      [speechGenerationId, userId]
    );
    if (existing.rows.length === 0) {
      throw new NotFoundError('Speech generation not found');
    }
    params.push(speechGenerationId);
    query += ` speech_generation_id = $${paramIndex}`;
    paramIndex++;
  }

  if (voiceId) {
    params.push(voiceId);
    if (query) query += ', ';
    query += ` voice_id = $${paramIndex}`;
  }

  params.push(userId);

  const result = await pool.query(
    `INSERT INTO favorites (user_id, speech_generation_id, voice_id, created_at)
     VALUES ($${paramIndex}, ${speechGenerationId ? '$2' : 'NULL'}, ${voiceId ? `$${speechGenerationId ? '3' : '2'}` : 'NULL'}, NOW())
     ON CONFLICT DO NOTHING
     RETURNING *`,
    params
  );

  if (result.rows.length === 0) {
    throw new AppError('Already in favorites', 409);
  }

  return formatFavorite(result.rows[0]);
};

const getUserFavorites = async (userId) => {
  const result = await pool.query(
    `SELECT f.*,
            sg.text_content, sg.language_code, sg.character_count, sg.audio_url, sg.created_at as sg_created_at,
            v.name as voice_name, v.gender as voice_gender, v.language_code as voice_language
     FROM favorites f
     LEFT JOIN speech_generations sg ON f.speech_generation_id = sg.id
     LEFT JOIN voices v ON f.voice_id = v.provider_voice_id
     WHERE f.user_id = $1
     ORDER BY f.created_at DESC`,
    [userId]
  );

  return result.rows.map(formatFavorite);
};

const removeFavorite = async (favoriteId, userId) => {
  const result = await pool.query(
    'DELETE FROM favorites WHERE id = $1 AND user_id = $2 RETURNING id',
    [favoriteId, userId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Favorite not found');
  }

  return { deleted: true };
};

const formatFavorite = (row) => {
  const favorite = {
    id: row.id,
    createdAt: row.created_at,
    type: row.speech_generation_id ? 'speech' : 'voice'
  };

  if (row.speech_generation_id) {
    favorite.speechGeneration = {
      id: row.speech_generation_id,
      text: row.text_content,
      languageCode: row.language_code,
      characterCount: row.character_count,
      audioUrl: row.audio_url,
      createdAt: row.sg_created_at
    };
  }

  if (row.voice_id) {
    favorite.voice = {
      id: row.voice_id,
      name: row.voice_name,
      gender: row.voice_gender,
      languageCode: row.voice_language
    };
  }

  return favorite;
};

module.exports = { addFavorite, getUserFavorites, removeFavorite };
