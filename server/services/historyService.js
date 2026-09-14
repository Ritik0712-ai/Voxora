const { pool } = require('../config/database');

const createHistory = async (userId, text, languageCode, voiceId, characterCount, wordCount, audioUrl, audioFormat, status, errorCode = null) => {
  const result = await pool.query(
    `INSERT INTO speech_generations
      (user_id, text_content, language_code, voice_id, character_count, word_count, audio_url, audio_format, status, error_code, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
     RETURNING *`,
    [userId, text, languageCode, voiceId, characterCount, wordCount, audioUrl, audioFormat, status, errorCode]
  );

  const row = result.rows[0];
  return {
    id: row.id,
    userId: row.user_id,
    textContent: row.text_content,
    languageCode: row.language_code,
    voiceId: row.voice_id,
    characterCount: row.character_count,
    wordCount: row.word_count,
    audioUrl: row.audio_url,
    audioFormat: row.audio_format,
    status: row.status,
    errorCode: row.error_code,
    createdAt: row.created_at,
  };
};

const getUserHistory = async (userId, page = 1, limit = 20) => {
  const offset = (page - 1) * limit;

  const countResult = await pool.query(
    'SELECT COUNT(*) FROM speech_generations WHERE user_id = $1',
    [userId]
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const result = await pool.query(
    `SELECT id, user_id, text_content, language_code, voice_id,
            character_count, word_count, audio_url, audio_format, status, error_code, created_at
     FROM speech_generations
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  const history = result.rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    textContent: row.text_content,
    languageCode: row.language_code,
    voiceId: row.voice_id,
    characterCount: row.character_count,
    wordCount: row.word_count,
    audioUrl: row.audio_url,
    audioFormat: row.audio_format,
    status: row.status,
    errorCode: row.error_code,
    createdAt: row.created_at,
  }));

  return {
    history,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getHistoryById = async (id, userId) => {
  const result = await pool.query(
    `SELECT id, user_id, text_content, language_code, voice_id,
            character_count, word_count, audio_url, audio_format, status, error_code, created_at
     FROM speech_generations
     WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    id: row.id,
    userId: row.user_id,
    textContent: row.text_content,
    languageCode: row.language_code,
    voiceId: row.voice_id,
    characterCount: row.character_count,
    wordCount: row.word_count,
    audioUrl: row.audio_url,
    audioFormat: row.audio_format,
    status: row.status,
    errorCode: row.error_code,
    createdAt: row.created_at,
  };
};

const deleteHistory = async (id, userId) => {
  const result = await pool.query(
    'DELETE FROM speech_generations WHERE id = $1 AND user_id = $2 RETURNING id',
    [id, userId]
  );
  return result.rows.length > 0;
};

module.exports = { createHistory, getUserHistory, getHistoryById, deleteHistory };
