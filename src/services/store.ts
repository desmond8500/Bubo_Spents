import { reactive } from 'vue'
import { Preferences } from '@capacitor/preferences'
import { api } from './api'
import { entities, entityByKey, type EntityKey, type Lookup, type Row } from './entities'
import { session, setSession } from './session'
import { settings } from './settings'

type State = Record<EntityKey, Row[]> & {
  syncing: boolean
  lastSync: string | null
  error: string | null
}

export const state = reactive<State>({
  budgets: [],
  categories: [],
  depenses: [],
  depenses_personnelles: [],
  revenus: [],
  emprunts: [],
  articles: [],
  marques: [],
  fournisseurs: [],
  syncing: false,
  lastSync: null,
  error: null,
})

export const lookup: Lookup = (key, uuid) =>
  uuid ? state[key].find((r) => r.uuid === uuid && !r.deleted) : undefined

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

/** crypto.randomUUID n'existe pas hors contexte sécurisé (ex. http://192.168.x.x en dev) : repli sur Math.random. */
const newUuid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
      })

/** Ajoute plusieurs lignes d'un coup (une seule écriture dans le stockage local). Renvoie les lignes créées. */
export async function addMany(key: EntityKey, items: Array<Record<string, any>>) {
  // Donnée commune : on garde son auteur dès la création (le serveur confirmera à la synchro).
  const auteur =
    entityByKey(key).shared && session.user
      ? { user_id: session.user.id, auteur: { id: session.user.id, name: session.user.name } }
      : {}

  const now = new Date().toISOString()
  const created = items.map((data) => ({
    ...data,
    ...auteur,
    uuid: newUuid(),
    synced: false,
    updated_at: now,
  }))

  state[key] = [...created, ...state[key]]
  await persist(key)
  return created
}

export async function add(key: EntityKey, data: Record<string, any>) {
  const [created] = await addMany(key, [data])
  return state[key].find((r) => r.uuid === created.uuid)!
}

/** Copie une ligne (nouvel uuid, nom suivi de « (copie) ») et renvoie la copie. */
export async function duplicate(key: EntityKey, uuid: string) {
  const source = state[key].find((r) => r.uuid === uuid)
  if (!source) return null

  const data: Record<string, any> = {}
  for (const f of entityByKey(key).fields) {
    data[f.key] = JSON.parse(JSON.stringify(source[f.key] ?? null))
  }
  if (typeof data.nom === 'string' && data.nom) data.nom = `${data.nom} (copie)`

  return add(key, data)
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

/** Efface toutes les données locales (celles déjà synchronisées pourront être récupérées depuis le serveur). */
export async function clearLocal() {
  for (const e of entities) {
    state[e.key] = []
    await Preferences.remove({ key: storageKey(e.key) })
  }
  state.lastSync = null
  state.error = null
  await Preferences.remove({ key: 'bubo_spents_last_sync' })
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
        .map(({ synced, server, auteur, ...row }) => row)
    }
    const { data } = await api.post('/sync', payload)
    for (const e of entities) {
      const rows = data[e.key] as Row[] | undefined
      if (!rows) continue // le serveur ne connaît pas encore cette table : on garde les lignes locales
      state[e.key] = rows.map((r) => ({ ...r, synced: true, server: true }))
      await persist(e.key)
    }
    // Le serveur renvoie le rôle à jour et le nombre d'écritures refusées faute de droits.
    if (data.moi && session.token) await setSession(session.token, data.moi)
    const refuses = Object.values(data.refuses ?? {}).reduce((n: number, v) => n + Number(v), 0)
    if (refuses > 0) {
      state.error = `${refuses} modification(s) refusée(s) : droits insuffisants sur des données communes.`
    }

    state.lastSync = new Date().toISOString()
    await Preferences.set({ key: 'bubo_spents_last_sync', value: state.lastSync })
  } catch (err: any) {
    state.error = err?.response?.data?.message ?? err?.message ?? 'Synchronisation impossible'
  } finally {
    state.syncing = false
  }
}

const AUTO_SYNC_EVERY = 8 * 60 * 60 * 1000 // 8 heures
const AUTO_SYNC_CHECK = 15 * 60 * 1000 // l'échéance est vérifiée toutes les 15 minutes
let autoSyncStarted = false

const autoSyncDue = () =>
  settings.autoSync &&
  !!session.token &&
  !state.syncing &&
  navigator.onLine !== false &&
  (!state.lastSync || Date.now() - Date.parse(state.lastSync) >= AUTO_SYNC_EVERY)

/**
 * Synchronisation automatique : toutes les 8 heures, tant que l'application est ouverte.
 * Elle se déclenche aussi quand l'application revient au premier plan ou que le réseau revient.
 * (Une application fermée ne peut pas se synchroniser : l'échéance est rattrapée à la prochaine ouverture.)
 */
export function startAutoSync() {
  if (autoSyncStarted) return
  autoSyncStarted = true

  const tick = () => {
    if (autoSyncDue()) sync()
  }

  tick()
  setInterval(tick, AUTO_SYNC_CHECK)
  window.addEventListener('online', tick)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') tick()
  })
}
