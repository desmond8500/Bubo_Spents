import axios from 'axios'
import { apiBaseUrl } from './settings'

export const api = axios.create({
  timeout: 15000,
  headers: { Accept: 'application/json' },
})

// L'adresse du serveur est modifiable dans les paramètres : on la relit à chaque requête.
api.interceptors.request.use((config) => {
  config.baseURL = apiBaseUrl()
  return config
})
