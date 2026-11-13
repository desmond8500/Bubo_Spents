import { Preferences } from '@capacitor/preferences'
import { api } from './api'
import { clearSession, setSession, type User } from './session'
import { clearLocal } from './store'

const OWNER_KEY = 'bubo_spents_owner'

interface AuthResponse {
  token: string
  user: User
}

async function finish({ token, user }: AuthResponse) {
  // Les données locales appartiennent au dernier utilisateur connecté : on les efface si c'est quelqu'un d'autre.
  const { value: owner } = await Preferences.get({ key: OWNER_KEY })
  if (owner && Number(owner) !== user.id) await clearLocal()
  await Preferences.set({ key: OWNER_KEY, value: String(user.id) })
  await setSession(token, user)
}

export async function login(email: string, password: string) {
  const { data } = await api.post<AuthResponse>('/login', { email, password })
  await finish(data)
}

export async function register(name: string, email: string, password: string) {
  const { data } = await api.post<AuthResponse>('/register', { name, email, password })
  await finish(data)
}

export async function logout() {
  try {
    await api.post('/logout')
  } catch {
    // hors ligne ou token déjà invalide : on ferme la session localement dans tous les cas
  }
  await clearSession()
}

/** Message lisible à partir d'une erreur axios (validation Laravel, erreur serveur ou réseau). */
export function errorMessage(e: any): string {
  const errors = e?.response?.data?.errors
  if (errors) return String(Object.values(errors).flat()[0])
  if (e?.response) return e.response.data?.message ?? `Erreur ${e.response.status}`
  return "Serveur injoignable. Vérifiez l'adresse du serveur."
}
