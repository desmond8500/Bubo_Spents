import { reactive, watch } from 'vue'
import { Preferences } from '@capacitor/preferences'

export const DEFAULT_API_URL: string = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

const KEY = 'bubo_spents_settings'

export const settings = reactive({
  /** Vide = adresse par défaut (VITE_API_URL). */
  apiUrl: '',
  currency: 'FCFA',
})

let loaded = false

export async function loadSettings() {
  try {
    const { value } = await Preferences.get({ key: KEY })
    if (value) Object.assign(settings, JSON.parse(value))
  } catch {
    // réglages illisibles : on garde les valeurs par défaut
  }
  loaded = true
}

watch(
  settings,
  () => {
    if (loaded) Preferences.set({ key: KEY, value: JSON.stringify(settings) })
  },
  { deep: true },
)

export const apiBaseUrl = () => (settings.apiUrl.trim() || DEFAULT_API_URL).replace(/\/+$/, '')
