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

/** Lignes affichées : les suppressions en attente de synchro sont masquées. */
export const visible = (key: EntityKey) => state[key].filter((r) => !r.deleted)

export async function update(key: EntityKey, uuid: string, data: Record<string, any>) {
  const row = state[key].find((r) => r.uuid === uuid)
  if (!row) return
  Object.assign(row, data, { synced: false, updated_at: new Date().toISOString() })
  await persist(key)
}

/** Supprime localement. Une ligne déjà connue du serveur est gardée comme "tombstone" jusqu'à la synchro. */
export async function remove(key: EntityKey, uuid: string) {
  const row = state[key].find((r) => r.uuid === uuid)
  if (!row) return
  if (row.server) {
    row.deleted = true
    row.synced = false
    row.updated_at = new Date().toISOString()
  } else {
    state[key] = state[key].filter((r) => r.uuid !== uuid)
  }
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
        .map(({ synced, server, ...row }) => row)
    }
    const { data } = await api.post('/sync', payload)
    for (const e of entities) {
      state[e.key] = (data[e.key] as Row[]).map((r) => ({ ...r, synced: true, server: true }))
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
