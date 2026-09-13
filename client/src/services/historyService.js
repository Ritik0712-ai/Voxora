import api from '../api'

export const historyService = {
  getHistory: async (page = 1, limit = 10) => {
    const response = await api.get('/history', { params: { page, limit } })
    return response.data
  },

  getHistoryById: async (id) => {
    const response = await api.get(`/history/${id}`)
    return response.data
  },

  deleteHistory: async (id) => {
    const response = await api.delete(`/history/${id}`)
    return response.data
  },
}
