import { entityByKey, type EntityKey, type Row } from './entities'
import { session } from './session'

/** Un compte ouvert avant l'arrivée des rôles est traité comme « membre » jusqu'à la prochaine synchro. */
export const role = () => session.user?.role ?? 'membre'
export const isAdmin = () => role() === 'admin'

/** Une ligne sans auteur connu (créée hors ligne avant la synchro) est la vôtre. */
export const isMine = (row: Row) => row.user_id == null || row.user_id === session.user?.id

/** Données communes : les lecteurs n'écrivent pas. Données privées : toujours permis. */
export const canCreate = (key: EntityKey) => !entityByKey(key).shared || role() !== 'lecteur'

/** Données communes : un administrateur corrige tout, un membre uniquement ses lignes. */
export const canEdit = (key: EntityKey, row: Row) => {
  if (!entityByKey(key).shared) return true
  if (isAdmin()) return true
  return role() !== 'lecteur' && isMine(row)
}
