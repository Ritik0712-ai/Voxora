import api from '../api'

export const voicesService = {
  getVoices: async () => {
    const response = await api.get('/voices')
    return response.data
  },

  getLanguages: async () => {
    const response = await api.get('/voices/languages')
    return response.data
  },
}
