import api from '../api'

export const favoritesService = {
  // Server responds { status, favorites: [...] }
  getFavorites: async () => {
    const { data } = await api.get('/favorites')
    return data.favorites || []
  },

  addFavorite: async ({ speechGenerationId, voiceId }) => {
    const { data } = await api.post('/favorites', { speechGenerationId, voiceId })
    return data.favorite
  },

  removeFavorite: async (id) => {
    await api.delete(`/favorites/${id}`)
  },

  checkFavorite: async ({ speechGenerationId, voiceId }) => {
    const { data } = await api.get('/favorites/check', {
      params: { speechGenerationId, voiceId },
    })
    return Boolean(data.isFavorite)
  },
}
