import { reactive } from 'vue'
import { Preferences } from '@capacitor/preferences'
import { api } from './api'
import { entities, type EntityKey, type Row } from './entities'

interface State {
  marques: Row[]
  fournisseurs: Row[]
  articles: Row[]
  syncing: boolean
  lastSync: string | null
  error: string | null
}

export const state = reactive<State>({
  marques: [],
  fournisseurs: [],
  articles: [],
  syncing: false,
  lastSync: null,
  error: null,
})

const storageKey = (k: EntityKey) => `bubo_spents_${k}`

async function persist(key: EntityKey) {
  await Preferences.set({ key: storageKey(key), value: JSON.stringify(state[key]) })
}

export async function init() {
  for (const e of entities) {
    const { value } = await Preferences.get({ key: storageKey(e.key) })
    state[e.key] = value ? JSON.parse(value) : []
  }
  const { value } = await Preferences.get({ key: 'bubo_spents_last_sync' })
  state.lastSync = value
}

export async function add(key: EntityKey, data: Record<string, any>) {
  state[key].unshift({
    ...data,
    uuid: crypto.randomUUID(),
    synced: false,
    updated_at: new Date().toISOString(),
  })
  await persist(key)
}

export const pendingCount = () =>
  entities.reduce((n, e) => n + state[e.key].filter((r) => !r.synced).length, 0)

/** Envoie les lignes non synchronisées puis remplace les données locales par celles du serveur. */
export async function sync() {
  if (state.syncing) return
  state.syncing = true
  state.error = null
  try {
    const payload: Record<string, any[]> = {}
    for (const e of entities) {
      payload[e.key] = state[e.key]
        .filter((r) => !r.synced)
        .map(({ synced, ...row }) => row)
    }
    const { data } = await api.post('/sync', payload)
    for (const e of entities) {
      state[e.key] = (data[e.key] as Row[]).map((r) => ({ ...r, synced: true }))
      await persist(e.key)
    }
    state.lastSync = new Date().toISOString()
    await Preferences.set({ key: 'bubo_spents_last_sync', value: state.lastSync })
  } catch (err: any) {
    state.error = err?.response?.data?.message ?? err?.message ?? 'Synchronisation impossible'
  } finally {
    state.syncing = false
  }
}
