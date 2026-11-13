import { reactive } from 'vue'
import { Preferences } from '@capacitor/preferences'

export type Role = 'admin' | 'membre' | 'lecteur'

export const roleLabel: Record<Role, string> = {
  admin: 'Administrateur',
  membre: 'Membre',
  lecteur: 'Lecteur',
}

export interface User {
  id: number
  name: string
  email: string
  role: Role
}

const KEY = 'bubo_spents_session'

export const session = reactive<{ token: string | null; user: User | null }>({
  token: null,
  user: null,
})

/** Résolue une fois la session relue du stockage local (le routeur l'attend avant de décider de la page). */
export const sessionReady: Promise<void> = (async () => {
  try {
    const { value } = await Preferences.get({ key: KEY })
    if (value) Object.assign(session, JSON.parse(value))
  } catch {
    // session illisible : l'utilisateur devra se reconnecter
  }
})()

export async function setSession(token: string, user: User) {
  session.token = token
  session.user = user
  await Preferences.set({ key: KEY, value: JSON.stringify({ token, user }) })
}

export async function clearSession() {
  session.token = null
  session.user = null
  await Preferences.remove({ key: KEY })
}
