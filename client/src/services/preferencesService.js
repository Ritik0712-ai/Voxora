import api from '../api'

export const preferencesService = {
  // Server responds { status, preferences: { defaultLanguageId, defaultVoiceId, defaultSpeed, defaultPitch } }
  getPreferences: async () => {
    const { data } = await api.get('/preferences')
    return data.preferences
  },

  updatePreferences: async (payload) => {
    const { data } = await api.put('/preferences', payload)
    return data.preferences
  },
}
