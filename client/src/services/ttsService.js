import api from '../api'

export const ttsService = {
  /**
   * @returns {{ generationId, audioUrl, format, provider, characterCount,
   *             wordCount, sourceText, spokenText, translated,
   *             detectedLanguage, translationNote }}
   */
  generateSpeech: async ({ text, language, voice, speed = 1.0, pitch = 0, translate = true }) => {
    const { data } = await api.post('/tts', { text, language, voice, speed, pitch, translate })
    return data
  },
}
