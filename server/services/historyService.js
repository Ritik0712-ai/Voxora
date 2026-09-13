const { pool } = require('../config/database');
const { NotFoundError, AuthorizationError } = require('../utils/errors');

const createHistory = async (userId, data) => {
  const {
    text, languageCode, voiceId, characterCount, wordCount,
    audioUrl, audioFormat, status, errorCode
  } = data;

  const result = await pool.query(
    `INSERT INTO speech_generations
     (user_id, text_content, language_code, voice_id, character_count,
      word_count, audio_url, audio_format, status, error_code, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
     RETURNING *`,
    [
      userId, text, languageCode, voiceId, characterCount, wordCount,
      audioUrl, audioFormat || 'mp3', status || 'completed', errorCode || null
    ]
  );

  return formatHistoryItem(result.rows[0]);
};

const getUserHistory = async (userId, limit = 50, offset = 0) => {
  const result = await pool.query(
    `SELECT sg.*, v.name as voice_name, v.gender as voice_gender, l.name as language_name
     FROM speech_generations sg
     LEFT JOIN voices v ON sg.voice_id = v.provider_voice_id
     LEFT JOIN languages l ON sg.language_code = l.code
     WHERE sg.user_id = $1
     ORDER BY sg.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  const countResult = await pool.query(
    'SELECT COUNT(*) FROM speech_generations WHERE user_id = $1',
    [userId]
  );

  return {
    items: result.rows.map(formatHistoryItem),
    total: parseInt(countResult.rows[0].count, 10),
    limit,
    offset
  };
};

const getHistoryById = async (historyId, userId) => {
  const result = await pool.query(
    `SELECT sg.*, v.name as voice_name, v.gender as voice_gender, l.name as language_name
     FROM speech_generations sg
     LEFT JOIN voices v ON sg.voice_id = v.provider_voice_id
     LEFT JOIN languages l ON sg.language_code = l.code
     WHERE sg.id = $1`,
    [historyId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Speech generation not found');
  }

  const item = result.rows[0];

  if (item.user_id !== userId) {
    throw new AuthorizationError('Access denied');
  }

  return formatHistoryItem(item);
};

const deleteHistory = async (historyId, userId) => {
  const result = await pool.query(
    `DELETE FROM speech_generations
     WHERE id = $1 AND user_id = $2
     RETURNING id`,
    [historyId, userId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Speech generation not found or access denied');
  }

  return { deleted: true };
};

const formatHistoryItem = (row) => ({
  id: row.id,
  text: row.text_content,
  languageCode: row.language_code,
  voiceId: row.voice_id,
  voiceName: row.voice_name || null,
  voiceGender: row.voice_gender || null,
  languageName: row.language_name || null,
  characterCount: row.character_count,
  wordCount: row.word_count,
  audioUrl: row.audio_url,
  audioFormat: row.audio_format,
  status: row.status,
  errorCode: row.error_code,
  createdAt: row.created_at,
  completedAt: row.completed_at
});

module.exports = { createHistory, getUserHistory, getHistoryById, deleteHistory };
