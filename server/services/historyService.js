const { pool } = require('../config/database');
const { NotFoundError } = require('../utils/errors');

// speech_generations stores language_id / voice_id as UUID foreign keys,
// so every read joins out to languages and voices for display values.
const SELECT_HISTORY = `
  SELECT sg.id,
         sg.user_id,
         sg.text_content,
         sg.character_count,
         sg.word_count,
         sg.audio_url,
         sg.audio_format,
         sg.status,
         sg.error_code,
         sg.created_at,
         sg.completed_at,
         sg.language_id,
         sg.voice_id,
         l.code AS language_code,
         l.name AS language_name,
         v.name AS voice_name,
         v.provider_voice_id
  FROM speech_generations sg
  LEFT JOIN languages l ON sg.language_id = l.id
  LEFT JOIN voices v ON sg.voice_id = v.id
`;

const mapRow = (row) => ({
  id: row.id,
  userId: row.user_id,
  textContent: row.text_content,
  characterCount: row.character_count,
  wordCount: row.word_count,
  audioUrl: row.audio_url,
  audioFormat: row.audio_format,
  status: row.status,
  errorCode: row.error_code,
  createdAt: row.created_at,
  completedAt: row.completed_at,
  languageId: row.language_id,
  languageCode: row.language_code,
  languageName: row.language_name,
  voiceId: row.voice_id,
  voiceName: row.voice_name,
  providerVoiceId: row.provider_voice_id,
});

const createHistory = async ({
  userId,
  text,
  languageId,
  voiceId,
  characterCount,
  wordCount,
  audioUrl,
  audioFormat,
  status = 'completed',
  errorCode = null,
}) => {
  const result = await pool.query(
    `INSERT INTO speech_generations
       (user_id, language_id, voice_id, text_content, character_count, word_count,
        audio_url, audio_format, status, error_code, created_at, completed_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
     RETURNING id`,
    [
      userId,
      languageId || null,
      voiceId || null,
      text,
      characterCount,
      wordCount,
      audioUrl || null,
      audioFormat || null,
      status,
      errorCode,
    ]
  );
  return result.rows[0].id;
};

const getUserHistory = async (userId, page = 1, limit = 20) => {
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const offset = (safePage - 1) * safeLimit;

  const countResult = await pool.query(
    'SELECT COUNT(*)::int AS count FROM speech_generations WHERE user_id = $1',
    [userId]
  );
  const total = countResult.rows[0].count;

  const result = await pool.query(
    `${SELECT_HISTORY}
     WHERE sg.user_id = $1
     ORDER BY sg.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, safeLimit, offset]
  );

  const totalPages = Math.ceil(total / safeLimit) || 1;

  return {
    history: result.rows.map(mapRow),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages,
    },
    hasMore: safePage < totalPages,
  };
};

const getHistoryById = async (id, userId) => {
  const result = await pool.query(
    `${SELECT_HISTORY} WHERE sg.id = $1 AND sg.user_id = $2`,
    [id, userId]
  );
  if (result.rows.length === 0) {
    throw new NotFoundError('Generation not found');
  }
  return mapRow(result.rows[0]);
};

const deleteHistory = async (id, userId) => {
  const result = await pool.query(
    'DELETE FROM speech_generations WHERE id = $1 AND user_id = $2 RETURNING id',
    [id, userId]
  );
  if (result.rows.length === 0) {
    throw new NotFoundError('Generation not found');
  }
  return true;
};

module.exports = { createHistory, getUserHistory, getHistoryById, deleteHistory };
