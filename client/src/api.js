import axios from 'axios'

// In dev, Vite proxies /api -> http://localhost:5000 (see vite.config.js),
// so a relative base works locally and in production behind the same origin.
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Surface the server's message instead of axios's generic
    // "Request failed with status code 400".
    const serverMessage =
      error.response?.data?.message ||
      error.response?.data?.error ||
      null

    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    }

    if (serverMessage) {
      error.message = serverMessage
    } else if (!error.response) {
      error.message = 'Cannot reach the server. Is it running on port 5000?'
    }

    return Promise.reject(error)
  }
)

export const setAuth = (token, user) => {
  localStorage.setItem('token', token)
  localStorage.setItem('user', JSON.stringify(user))
}

export const clearAuth = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
}

export const getStoredUser = () => {
  const user = localStorage.getItem('user')
  try {
    return user ? JSON.parse(user) : null
  } catch {
    return null
  }
}

export const isAuthenticated = () => Boolean(localStorage.getItem('token'))

export default api
