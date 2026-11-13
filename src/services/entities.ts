import { peopleOutline, personOutline } from 'ionicons/icons'
import { settings } from './settings'

export type EntityKey =
  | 'depenses'
  | 'depenses_personnelles'
  | 'revenus'
  | 'emprunts'
  | 'articles'
  | 'marques'
  | 'fournisseurs'

export interface Field {
  key: string
  label: string
  type: 'text' | 'textarea' | 'number' | 'date' | 'ref' | 'image' | 'images'
  ref?: EntityKey
  required?: boolean
  default?: any
}

export interface Row {
  uuid: string
  synced: boolean
  updated_at: string
  [field: string]: any
}

export type Lookup = (key: EntityKey, uuid: string | null | undefined) => Row | undefined

export type Tone = 'success' | 'danger' | 'secondary' | 'medium'

export interface EntityDef {
  key: EntityKey
  title: string
  /** Donnée commune : visible par tous les utilisateurs (sinon privée). */
  shared?: boolean
  /** Distingue visuellement le type de dépense (icône colorée + libellé). */
  kind?: { label: string; icon: string; tone: 'primary' | 'secondary' }
  fields: Field[]
  label: (row: Row, lookup: Lookup) => string
  subtitle?: (row: Row, lookup: Lookup) => string
  image?: (row: Row) => string | null
  /** Montant affiché à droite de la ligne, coloré selon `tone`. */
  amount?: (row: Row) => number
  tone?: Tone
}

export const fmt = (n: unknown) => {
  const s = new Intl.NumberFormat('fr-FR').format(Number(n) || 0)
  return settings.currency.trim() ? `${s} ${settings.currency.trim()}` : s
}

const join = (...parts: Array<string | null | undefined | false>) => parts.filter(Boolean).join(' · ')

export const entities: EntityDef[] = [
  {
    key: 'depenses',
    title: 'Dépenses générales',
    shared: true,
    kind: { label: 'Générale', icon: peopleOutline, tone: 'primary' },
    fields: [
      { key: 'article_uuid', label: 'Article', type: 'ref', ref: 'articles', required: true },
      { key: 'quantite', label: 'Quantité', type: 'number', required: true, default: 1 },
      { key: 'montant', label: 'Montant', type: 'number', required: true },
      { key: 'date', label: 'Date', type: 'date', required: true },
    ],
    label: (r, lookup) => lookup('articles', r.article_uuid)?.nom ?? 'Article supprimé',
    subtitle: (r) => join(r.date, Number(r.quantite) !== 1 && `x${r.quantite}`),
    amount: (r) => Number(r.montant),
    tone: 'danger',
  },
  {
    key: 'depenses_personnelles',
    title: 'Dépenses perso',
    kind: { label: 'Perso', icon: personOutline, tone: 'secondary' },
    fields: [
      { key: 'designation', label: 'Désignation', type: 'text', required: true },
      { key: 'quantite', label: 'Quantité', type: 'number', required: true, default: 1 },
      { key: 'montant', label: 'Montant', type: 'number', required: true },
      { key: 'date', label: 'Date', type: 'date', required: true },
    ],
    label: (r) => r.designation,
    subtitle: (r) => join(r.date, Number(r.quantite) !== 1 && `x${r.quantite}`),
    amount: (r) => Number(r.montant),
    tone: 'danger',
  },
  {
    key: 'revenus',
    title: 'Revenus',
    fields: [
      { key: 'description', label: 'Description', type: 'text', required: true },
      { key: 'montant', label: 'Montant', type: 'number', required: true },
      { key: 'date', label: 'Date', type: 'date', required: true },
    ],
    label: (r) => r.description,
    subtitle: (r) => r.date ?? '',
    amount: (r) => Number(r.montant),
    tone: 'success',
  },
  {
    key: 'emprunts',
    title: 'Emprunts',
    fields: [
      { key: 'description', label: 'Description', type: 'text', required: true },
      { key: 'montant', label: 'Montant', type: 'number', required: true },
      { key: 'date', label: 'Date', type: 'date', required: true },
    ],
    label: (r) => r.description,
    subtitle: (r) => r.date ?? '',
    amount: (r) => Number(r.montant),
    tone: 'secondary',
  },
  {
    key: 'articles',
    title: 'Articles',
    shared: true,
    fields: [
      { key: 'nom', label: 'Nom', type: 'text', required: true },
      { key: 'prix', label: 'Prix', type: 'number', required: true },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'images', label: 'Images', type: 'images' },
      { key: 'marque_uuid', label: 'Marque', type: 'ref', ref: 'marques' },
      { key: 'fournisseur_uuid', label: 'Fournisseur', type: 'ref', ref: 'fournisseurs' },
    ],
    label: (r) => r.nom,
    subtitle: (r, lookup) =>
      join(lookup('marques', r.marque_uuid)?.nom, lookup('fournisseurs', r.fournisseur_uuid)?.nom),
    image: (r) => r.images?.[0] ?? null,
    amount: (r) => Number(r.prix),
    tone: 'medium',
  },
  {
    key: 'marques',
    title: 'Marques',
    shared: true,
    fields: [
      { key: 'nom', label: 'Nom', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'logo', label: 'Logo', type: 'image' },
    ],
    label: (r) => r.nom,
    subtitle: (r) => r.description ?? '',
    image: (r) => r.logo ?? null,
  },
  {
    key: 'fournisseurs',
    title: 'Fournisseurs',
    shared: true,
    fields: [
      { key: 'nom', label: 'Nom', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'logo', label: 'Logo', type: 'image' },
    ],
    label: (r) => r.nom,
    subtitle: (r) => r.description ?? '',
    image: (r) => r.logo ?? null,
  },
]

export const entityByKey = (key: EntityKey) => entities.find((e) => e.key === key)!
