import { normalizeText, type CsvRecord } from './csv'

export type ImportType = 'marques' | 'fournisseurs' | 'articles'

export interface ExistingData {
  marques: Array<{ uuid: string; nom: string }>
  fournisseurs: Array<{ uuid: string; nom: string }>
  categories?: Array<{ uuid: string; nom: string }>
  articles: Array<{ nom: string; marque_uuid?: string | null; fournisseur_uuid?: string | null }>
}

/** Ce que l'import va créer, calculé sans toucher aux données. */
export interface ImportPlan {
  type: ImportType
  /** Lignes à créer. Pour un article : `marque` et `fournisseur` sont des noms, résolus à l'application. */
  rows: Array<Record<string, any>>
  /** Marques et fournisseurs cités par des articles mais inconnus : ils seront créés. */
  newMarques: string[]
  newFournisseurs: string[]
  newCategories: string[]
  /** Lignes ignorées car déjà présentes (ou répétées dans le fichier). */
  skipped: number
  /** Lignes refusées, avec la raison. */
  errors: string[]
  /** Valeurs ignorées dans une ligne par ailleurs importée (image ou logo invalide). */
  warnings: string[]
}

export const MAX_IMPORT_ROWS = 2000

const UNITES = ['piece', 'kg', 'g', 'l', 'ml', 'm', 'paquet', 'carton', 'sac', 'boite']

/** Noms de colonnes acceptés (comparés sans accents ni casse). */
const COLUMNS = {
  nom: ['nom', 'name'],
  description: ['description'],
  logo: ['logo'],
  prix: ['prix', 'price'],
  marque: ['marque', 'brand'],
  fournisseur: ['fournisseur', 'supplier'],
  categorie: ['categorie', 'category'],
  reference: ['reference', 'ref'],
  unite: ['unite', 'unit'],
  poids: ['poids', 'weight'],
  caracteristiques: ['caracteristiques', 'characteristics'],
  images: ['images', 'image'],
}

const pick = (values: Record<string, string>, names: string[]) => {
  for (const n of names) if (values[n]) return values[n]
  return ''
}

const isUrl = (s: string) => /^https?:\/\/\S+$/i.test(s)

/** « 1 500 », « 1500,50 », « 1500 FCFA » → nombre ; null si illisible. */
export function parsePrice(raw: string): number | null {
  const cleaned = raw
    .replace(/[\s  ]/g, '')
    .replace(/[a-z€$]+$/i, '')
    .replace(',', '.')

  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

export function planImport(type: ImportType, records: CsvRecord[], existing: ExistingData): ImportPlan {
  const plan: ImportPlan = { type, rows: [], newMarques: [], newFournisseurs: [], newCategories: [], skipped: 0, errors: [], warnings: [] }

  const nomMarque = new Map(existing.marques.map((m) => [m.uuid, m.nom]))
  const nomFournisseur = new Map(existing.fournisseurs.map((f) => [f.uuid, f.nom]))
  const marquesConnues = new Set(existing.marques.map((m) => normalizeText(m.nom)))
  const fournisseursConnus = new Set(existing.fournisseurs.map((f) => normalizeText(f.nom)))
  const nouvellesMarques = new Set<string>()
  const nouveauxFournisseurs = new Set<string>()
  const categoriesConnues = new Set((existing.categories ?? []).map((c) => normalizeText(c.nom)))
  const nouvellesCategories = new Set<string>()

  // Clés de détection des doublons : le nom pour une marque ou un fournisseur ; nom + marque + fournisseur pour un article.
  const cleArticle = (nom: string, marque: string, fournisseur: string) =>
    [nom, marque, fournisseur].map(normalizeText).join('|')

  const vus = new Set<string>(
    type === 'marques'
      ? existing.marques.map((m) => normalizeText(m.nom))
      : type === 'fournisseurs'
        ? existing.fournisseurs.map((f) => normalizeText(f.nom))
        : existing.articles.map((a) =>
            cleArticle(a.nom, nomMarque.get(a.marque_uuid ?? '') ?? '', nomFournisseur.get(a.fournisseur_uuid ?? '') ?? ''),
          ),
  )

  for (const { line, values } of records) {
    const nom = pick(values, COLUMNS.nom)
    if (!nom) {
      plan.errors.push(`Ligne ${line} : nom manquant`)
      continue
    }
    if (nom.length > 255) {
      plan.errors.push(`Ligne ${line} : nom trop long (255 caractères maximum)`)
      continue
    }

    if (type === 'articles') {
      const prixBrut = pick(values, COLUMNS.prix)
      const prix = parsePrice(prixBrut)
      if (prix === null) {
        plan.errors.push(`Ligne ${line} : prix ${prixBrut ? `« ${prixBrut} » invalide` : 'manquant'}`)
        continue
      }

      const poidsBrut = pick(values, COLUMNS.poids)
      const poids = poidsBrut ? parsePrice(poidsBrut) : null
      if (poidsBrut && poids === null) {
        plan.errors.push(`Ligne ${line} : poids « ${poidsBrut} » invalide`)
        continue
      }

      const uniteBrute = normalizeText(pick(values, COLUMNS.unite))
      const unite = UNITES.includes(uniteBrute) ? uniteBrute : null
      if (uniteBrute && !unite) plan.warnings.push(`Ligne ${line} : unité « ${uniteBrute} » ignorée`)

      const categorie = pick(values, COLUMNS.categorie)
      if (categorie && !categoriesConnues.has(normalizeText(categorie)) && !nouvellesCategories.has(normalizeText(categorie))) {
        nouvellesCategories.add(normalizeText(categorie))
        plan.newCategories.push(categorie)
      }

      const marque = pick(values, COLUMNS.marque)
      const fournisseur = pick(values, COLUMNS.fournisseur)

      const cle = cleArticle(nom, marque, fournisseur)
      if (vus.has(cle)) {
        plan.skipped++
        continue
      }
      vus.add(cle)

      const urls = pick(values, COLUMNS.images)
        .split('|')
        .map((u) => u.trim())
        .filter(Boolean)
      const images = urls.filter(isUrl)
      if (images.length < urls.length) plan.warnings.push(`Ligne ${line} : image ignorée (adresse http(s) attendue)`)
      if (images.length > 5) plan.warnings.push(`Ligne ${line} : 5 images maximum, les suivantes sont ignorées`)

      if (marque && !marquesConnues.has(normalizeText(marque)) && !nouvellesMarques.has(normalizeText(marque))) {
        nouvellesMarques.add(normalizeText(marque))
        plan.newMarques.push(marque)
      }
      if (
        fournisseur &&
        !fournisseursConnus.has(normalizeText(fournisseur)) &&
        !nouveauxFournisseurs.has(normalizeText(fournisseur))
      ) {
        nouveauxFournisseurs.add(normalizeText(fournisseur))
        plan.newFournisseurs.push(fournisseur)
      }

      plan.rows.push({
        nom,
        prix,
        description: pick(values, COLUMNS.description) || null,
        images: images.slice(0, 5),
        reference: pick(values, COLUMNS.reference) || null,
        unite,
        poids,
        caracteristiques: pick(values, COLUMNS.caracteristiques) || null,
        categorie,
        marque,
        fournisseur,
      })
      continue
    }

    // Marques et fournisseurs
    const cle = normalizeText(nom)
    if (vus.has(cle)) {
      plan.skipped++
      continue
    }
    vus.add(cle)

    const logo = pick(values, COLUMNS.logo)
    if (logo && !isUrl(logo)) plan.warnings.push(`Ligne ${line} : logo ignoré (adresse http(s) attendue)`)

    plan.rows.push({
      nom,
      description: pick(values, COLUMNS.description) || null,
      logo: logo && isUrl(logo) ? logo : null,
    })
  }

  return plan
}
