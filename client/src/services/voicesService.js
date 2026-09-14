import api from '../api'

export const voicesService = {
  // Server responds { success, languages: [{ id, code, name }] }
  getLanguages: async () => {
    const { data } = await api.get('/voices/languages')
    return data.languages || []
  },

  // Server responds { success, voices: [{ id, providerVoiceId, name, gender, accent, style, language }] }
  getVoices: async (languageCode) => {
    const { data } = await api.get('/voices', {
      params: languageCode ? { language: languageCode } : {},
    })
    return data.voices || []
  },
}
