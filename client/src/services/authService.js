import api from '../api'

export const authService = {
  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    return { token: data.token, user: data.user }
  },

  register: async (name, email, password) => {
    const { data } = await api.post('/auth/register', { name, email, password })
    return { token: data.token, user: data.user }
  },

  getProfile: async () => {
    const { data } = await api.get('/auth/me')
    return data.user
  },
}
