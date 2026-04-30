import axios from 'axios'
import { API_URL } from '../constants/api'
import { storage } from './storage'

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use(async (config) => {
  const token = await storage.getAccessToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  const lang = await storage.getLanguage()
  if (lang) config.headers['Accept-Language'] = lang
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const refresh = await storage.getRefreshToken()
        const { data } = await axios.post(`${API_URL}/users/token/refresh/`, { refresh })
        await storage.setTokens(data.access, data.refresh || refresh)
        original.headers.Authorization = `Bearer ${data.access}`
        return api(original)
      } catch {
        await storage.clearTokens()
        // навигация на логин обрабатывается в компонентах через проверку токена
      }
    }
    return Promise.reject(error)
  }
)

export default api
