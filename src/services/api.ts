import axios from 'axios'
import router from '../router'
import { apiBaseUrl } from './settings'
import { clearSession, session } from './session'

export const api = axios.create({
  timeout: 15000,
  headers: { Accept: 'application/json' },
})

// L'adresse du serveur est modifiable dans les paramètres et le token change à la connexion : on les relit à chaque requête.
api.interceptors.request.use((config) => {
  config.baseURL = apiBaseUrl()
  if (session.token) config.headers.Authorization = `Bearer ${session.token}`
  return config
})

// Token expiré ou révoqué : retour à l'écran de connexion (les données locales sont conservées).
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const url = String(error.config?.url ?? '')
    if (error.response?.status === 401 && session.token && !/^\/(login|register)/.test(url)) {
      await clearSession()
      router.replace('/login')
    }
    return Promise.reject(error)
  },
)
