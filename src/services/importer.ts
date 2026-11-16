import { decodeCsv, normalizeText, parseCsv, toRecords } from './csv'
import { MAX_IMPORT_ROWS, planImport, type ImportType } from './importPlan'
import { canCreate } from './permissions'
import { addMany, visible } from './store'

export type { ImportType } from './importPlan'

export interface ImportSummary {
  type: ImportType
  created: number
  skipped: number
  createdMarques: number
  createdFournisseurs: number
  errors: string[]
  warnings: string[]
}

export const IMPORT_COLUMNS: Record<ImportType, string> = {
  marques: 'nom ; description ; logo (adresse http)',
  fournisseurs: 'nom ; description ; logo (adresse http)',
  articles: 'nom ; prix ; description ; marque ; fournisseur ; images (adresses http séparées par |)',
}

export const MAX_FILE_BYTES = 2 * 1024 * 1024

/** Lignes décodées d'un fichier CSV, sans rien importer (pour afficher un aperçu). */
export function countRecords(buffer: ArrayBuffer) {
  return toRecords(parseCsv(decodeCsv(buffer))).length
}

/**
 * Importe un fichier CSV dans le stockage local (il part ensuite au serveur à la synchronisation).
 * Les lignes déjà présentes sont ignorées ; les marques et fournisseurs inconnus cités par des articles sont créés.
 */
export async function importCsv(type: ImportType, buffer: ArrayBuffer): Promise<ImportSummary> {
  if (!canCreate(type)) throw new Error('Votre rôle (lecteur) ne permet pas d\'ajouter des données communes.')
  if (buffer.byteLength > MAX_FILE_BYTES) throw new Error('Fichier trop volumineux (2 Mo maximum).')

  const records = toRecords(parseCsv(decodeCsv(buffer)))
  if (!records.length) {
    throw new Error('Le fichier est vide ou ne contient que la ligne d\'en-tête.')
  }
  if (records.length > MAX_IMPORT_ROWS) {
    throw new Error(`Trop de lignes (${records.length}). Limite : ${MAX_IMPORT_ROWS} par import.`)
  }

  const parNom = (key: 'marques' | 'fournisseurs') =>
    visible(key).map((r) => ({ uuid: r.uuid, nom: String(r.nom ?? '') }))

  const plan = planImport(type, records, {
    marques: parNom('marques'),
    fournisseurs: parNom('fournisseurs'),
    articles: visible('articles').map((r) => ({
      nom: String(r.nom ?? ''),
      marque_uuid: (r.marque_uuid as string | null | undefined) ?? null,
      fournisseur_uuid: (r.fournisseur_uuid as string | null | undefined) ?? null,
    })),
  })

  const summary: ImportSummary = {
    type,
    created: 0,
    skipped: plan.skipped,
    createdMarques: 0,
    createdFournisseurs: 0,
    errors: plan.errors,
    warnings: plan.warnings,
  }

  if (type === 'articles') {
    if (plan.newMarques.length) {
      await addMany('marques', plan.newMarques.map((nom) => ({ nom, description: null, logo: null })))
      summary.createdMarques = plan.newMarques.length
    }
    if (plan.newFournisseurs.length) {
      await addMany('fournisseurs', plan.newFournisseurs.map((nom) => ({ nom, description: null, logo: null })))
      summary.createdFournisseurs = plan.newFournisseurs.length
    }

    const uuidParNom = (key: 'marques' | 'fournisseurs') =>
      new Map(visible(key).map((r) => [normalizeText(String(r.nom)), r.uuid]))
    const marques = uuidParNom('marques')
    const fournisseurs = uuidParNom('fournisseurs')

    await addMany(
      'articles',
      plan.rows.map(({ marque, fournisseur, ...article }) => ({
        ...article,
        marque_uuid: marque ? (marques.get(normalizeText(marque)) ?? null) : null,
        fournisseur_uuid: fournisseur ? (fournisseurs.get(normalizeText(fournisseur)) ?? null) : null,
      })),
    )
  } else {
    await addMany(type, plan.rows)
  }

  summary.created = plan.rows.length
  return summary
}
