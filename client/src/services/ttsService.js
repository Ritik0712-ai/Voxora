import api from '../api'

export const ttsService = {
  generateSpeech: async ({ text, language, voice, speed, pitch }) => {
    const response = await api.post('/tts', { text, language, voice, speed, pitch })
    return response.data
  },

  getVoices: async () => {
    const response = await api.get('/voices')
    return response.data
  },

  getLanguages: async () => {
    const response = await api.get('/voices/languages')
    return response.data
  },
}
