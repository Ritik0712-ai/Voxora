import api from '../api'

export const ttsService = {
  /**
   * @returns {{ generationId, audioUrl, format, provider, characterCount, wordCount }}
   */
  generateSpeech: async ({ text, language, voice, speed = 1.0, pitch = 0 }) => {
    const { data } = await api.post('/tts', { text, language, voice, speed, pitch })
    return data
  },
}
