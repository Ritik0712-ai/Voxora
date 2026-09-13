import api from '../api'

export const preferencesService = {
  async getPreferences() {
    const response = await api.get('/preferences')
    return response.data.data
  },

  async updatePreferences(data) {
    const response = await api.put('/preferences', data)
    return response.data.data
  },
}
