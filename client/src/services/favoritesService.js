import api from '../api'

export const favoritesService = {
  async getFavorites() {
    const response = await api.get('/favorites')
    return response.data.data
  },

  async addFavorite(data) {
    const response = await api.post('/favorites', data)
    return response.data.data
  },

  async removeFavorite(id) {
    await api.delete(`/favorites/${id}`)
  },

  async checkFavorite(generationId, voiceId) {
    const response = await api.get('/favorites')
    const favorites = response.data.data || []
    return favorites.some(
      f => f.generation_id === generationId || f.voice_id === voiceId
    )
  },
}
