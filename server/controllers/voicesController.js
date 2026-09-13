const { pool } = require('../config/database');

const getVoices = async (req, res, next) => {
  try {
    const languageFilter = req.query.language;

    let query = `
      SELECT
        v.id,
        v.provider_voice_id as "providerVoiceId",
        v.name,
        v.gender,
        v.accent,
        v.style,
        v.enabled,
        l.id as "languageId",
        l.code as "languageCode",
        l.name as "languageName"
      FROM voices v
      JOIN languages l ON v.language_id = l.id
      WHERE v.enabled = true
    `;

    const params = [];

    if (languageFilter) {
      params.push(languageFilter);
      query += ` AND l.code = $${params.length}`;
    }

    query += ` ORDER BY l.name, v.name`;

    const result = await pool.query(query, params);

    const voices = result.rows.map(voice => ({
      id: voice.id,
      providerVoiceId: voice.providerVoiceId,
      name: voice.name,
      gender: voice.gender,
      accent: voice.accent,
      style: voice.style,
      enabled: voice.enabled,
      language: {
        id: voice.languageId,
        code: voice.languageCode,
        name: voice.languageName
      }
    }));

    res.json({
      success: true,
      voices,
      count: voices.length
    });
  } catch (error) {
    console.error('Error fetching voices:', error);
    next(error);
  }
};

const getLanguages = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        code,
        name,
        enabled
      FROM languages
      WHERE enabled = true
      ORDER BY name
    `);

    const languages = result.rows.map(lang => ({
      id: lang.id,
      code: lang.code,
      name: lang.name
    }));

    res.json({
      success: true,
      languages,
      count: languages.length
    });
  } catch (error) {
    console.error('Error fetching languages:', error);
    next(error);
  }
};

module.exports = {
  getVoices,
  getLanguages
};
