require('dotenv').config();
const { pool } = require('./config/database');

// Microsoft Edge neural voices, one male + one female per seeded language.
const VOICES = {
  'en-US': [['en-US-AriaNeural','Aria','Female','American'],['en-US-GuyNeural','Guy','Male','American']],
  'en-GB': [['en-GB-SoniaNeural','Sonia','Female','British'],['en-GB-RyanNeural','Ryan','Male','British']],
  'hi-IN': [['hi-IN-SwaraNeural','Swara','Female','Indian'],['hi-IN-MadhurNeural','Madhur','Male','Indian']],
  'gu-IN': [['gu-IN-DhwaniNeural','Dhwani','Female','Indian'],['gu-IN-NiranjanNeural','Niranjan','Male','Indian']],
  'mr-IN': [['mr-IN-AarohiNeural','Aarohi','Female','Indian'],['mr-IN-ManoharNeural','Manohar','Male','Indian']],
  'ta-IN': [['ta-IN-PallaviNeural','Pallavi','Female','Indian'],['ta-IN-ValluvarNeural','Valluvar','Male','Indian']],
  'te-IN': [['te-IN-ShrutiNeural','Shruti','Female','Indian'],['te-IN-MohanNeural','Mohan','Male','Indian']],
  'bn-IN': [['bn-IN-TanishaaNeural','Tanishaa','Female','Indian'],['bn-IN-BashkarNeural','Bashkar','Male','Indian']],
  'es-ES': [['es-ES-ElviraNeural','Elvira','Female','European'],['es-ES-AlvaroNeural','Alvaro','Male','European']],
  'fr-FR': [['fr-FR-DeniseNeural','Denise','Female','European'],['fr-FR-HenriNeural','Henri','Male','European']],
  'de-DE': [['de-DE-KatjaNeural','Katja','Female','Standard'],['de-DE-ConradNeural','Conrad','Male','Standard']],
  'ja-JP': [['ja-JP-NanamiNeural','Nanami','Female','Standard'],['ja-JP-KeitaNeural','Keita','Male','Standard']],
  'ko-KR': [['ko-KR-SunHiNeural','Sun-Hi','Female','Standard'],['ko-KR-InJoonNeural','In-Joon','Male','Standard']],
  'zh-CN': [['zh-CN-XiaoxiaoNeural','Xiaoxiao','Female','Mandarin'],['zh-CN-YunxiNeural','Yunxi','Male','Mandarin']],
  'ar-SA': [['ar-SA-ZariyahNeural','Zariyah','Female','Gulf'],['ar-SA-HamedNeural','Hamed','Male','Gulf']],
  'pt-BR': [['pt-BR-FranciscaNeural','Francisca','Female','Brazilian'],['pt-BR-AntonioNeural','Antonio','Male','Brazilian']],
  'ru-RU': [['ru-RU-SvetlanaNeural','Svetlana','Female','Standard'],['ru-RU-DmitryNeural','Dmitry','Male','Standard']],
  'it-IT': [['it-IT-ElsaNeural','Elsa','Female','Standard'],['it-IT-DiegoNeural','Diego','Male','Standard']],
};

(async () => {
  const langs = await pool.query('SELECT id, code FROM languages');
  const byCode = Object.fromEntries(langs.rows.map(r => [r.code, r.id]));

  // Existing voices, so we can update in place and keep foreign keys intact
  // rather than deleting rows that speech_generations may reference.
  const existing = await pool.query(
    `SELECT v.id, v.provider_voice_id, v.gender, l.code
     FROM voices v JOIN languages l ON v.language_id = l.id`
  );

  let updated = 0, inserted = 0, disabled = 0;

  for (const [code, voices] of Object.entries(VOICES)) {
    const languageId = byCode[code];
    if (!languageId) {
      console.log(`  skip ${code} (language not in DB)`);
      continue;
    }

    for (const [providerId, name, gender, accent] of voices) {
      // Reuse a row of the same language + gender if one exists.
      const reusable = existing.rows.find(
        r => r.code === code && r.gender === gender && !r.claimed
      );

      if (reusable) {
        reusable.claimed = true;
        await pool.query(
          `UPDATE voices
              SET provider_voice_id = $1, name = $2, gender = $3,
                  accent = $4, style = 'Neural', enabled = true
            WHERE id = $5`,
          [providerId, name, gender, accent, reusable.id]
        );
        updated++;
      } else {
        await pool.query(
          `INSERT INTO voices (provider_voice_id, language_id, name, gender, accent, style, enabled)
           VALUES ($1, $2, $3, $4, $5, 'Neural', true)`,
          [providerId, languageId, name, gender, accent]
        );
        inserted++;
      }
    }
  }

  // Anything left over is a stale Google/ElevenLabs voice: disable rather than
  // delete, so old history rows still resolve a voice name.
  const stale = existing.rows.filter(r => !r.claimed);
  for (const row of stale) {
    await pool.query('UPDATE voices SET enabled = false WHERE id = $1', [row.id]);
    disabled++;
  }

  console.log(`updated ${updated}, inserted ${inserted}, disabled ${disabled} stale`);

  const check = await pool.query(
    `SELECT l.code, count(*)::int c FROM voices v
     JOIN languages l ON v.language_id = l.id
     WHERE v.enabled = true GROUP BY l.code ORDER BY l.code`
  );
  console.log(check.rows.map(r => `${r.code}:${r.c}`).join('  '));
  process.exit(0);
})().catch(e => { console.error('SEED ERROR', e.message); process.exit(1); });
