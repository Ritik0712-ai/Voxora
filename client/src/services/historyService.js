import api from '../api'

export const historyService = {
  // Server responds { status, history: [...], pagination: {...}, hasMore }
  getHistory: async (page = 1, limit = 10) => {
    const { data } = await api.get('/history', { params: { page, limit } })
    return {
      history: data.history || [],
      pagination: data.pagination,
      hasMore: Boolean(data.hasMore),
    }
  },

  getHistoryById: async (id) => {
    const { data } = await api.get(`/history/${id}`)
    return data.generation
  },

  deleteHistory: async (id) => {
    await api.delete(`/history/${id}`)
  },
}
