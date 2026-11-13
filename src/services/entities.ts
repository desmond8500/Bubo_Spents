import { peopleOutline, personOutline } from 'ionicons/icons'
import { settings } from './settings'

export type EntityKey =
  | 'budgets'
  | 'categories'
  | 'depenses'
  | 'depenses_personnelles'
  | 'revenus'
  | 'emprunts'
  | 'articles'
  | 'marques'
  | 'fournisseurs'

export interface SelectOption {
  value: string
  label: string
}

export interface Field {
  key: string
  label: string
  type: 'text' | 'textarea' | 'number' | 'date' | 'ref' | 'select' | 'toggle' | 'image' | 'images'
  ref?: EntityKey
  /** Liste fixe de choix (type "select"). */
  options?: SelectOption[]
  required?: boolean
  default?: any
  /** Type "ref" : propose un bouton pour créer l'élément lié sans quitter le formulaire. */
  quickAdd?: boolean
  /** Champ affiché seulement quand la condition est vraie (ex. date de remboursement). */
  showIf?: (form: Record<string, any>) => boolean
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
  /** Ligne « soldée » (ex. emprunt remboursé) : montant barré et atténué. */
  done?: (row: Row) => boolean
  /** Page vers laquelle revient la flèche de retour (pages hors onglets). */
  back?: string
  /** Affiche un champ de recherche au-dessus de la liste. */
  searchable?: boolean
  /** Permet de dupliquer une ligne (glisser la ligne). */
  duplicable?: boolean
}

export const fmt = (n: unknown) => {
  const s = new Intl.NumberFormat('fr-FR').format(Number(n) || 0)
  return settings.currency.trim() ? `${s} ${settings.currency.trim()}` : s
}

const join = (...parts: Array<string | null | undefined | false>) => parts.filter(Boolean).join(' · ')

/** Modes de paiement (mêmes valeurs que sur le serveur). */
export const MODES_PAIEMENT: SelectOption[] = [
  { value: 'orange_money', label: 'Orange Money' },
  { value: 'wave', label: 'Wave' },
  { value: 'espece', label: 'Espèces' },
  { value: 'virement', label: 'Transfert bancaire' },
  { value: 'cheque', label: 'Chèque' },
]

export const modeLabel = (value: unknown) => MODES_PAIEMENT.find((m) => m.value === value)?.label ?? ''

const modeField: Field = { key: 'mode_paiement', label: 'Mode de paiement', type: 'select', options: MODES_PAIEMENT }

export const entities: EntityDef[] = [
  {
    key: 'budgets',
    title: 'Budget',
    shared: true,
    back: '/tabs/resume',
    fields: [
      { key: 'description', label: 'Description', type: 'text' },
      { key: 'montant', label: 'Montant du crédit', type: 'number', required: true },
      { key: 'date', label: 'Date', type: 'date', required: true },
    ],
    label: (r) => r.description || 'Crédit du budget',
    subtitle: (r) => r.date ?? '',
    amount: (r) => Number(r.montant),
    tone: 'success',
  },
  {
    key: 'categories',
    title: 'Catégories',
    shared: true,
    back: '/tabs/catalogue',
    searchable: true,
    fields: [
      { key: 'nom', label: 'Nom', type: 'text', required: true },
      { key: 'description', label: 'Description', type: 'textarea' },
    ],
    label: (r) => r.nom,
    subtitle: (r) => r.description ?? '',
  },
  {
    key: 'depenses',
    title: 'Dépenses générales',
    shared: true,
    kind: { label: 'Générale', icon: peopleOutline, tone: 'primary' },
    fields: [
      { key: 'article_uuid', label: 'Article', type: 'ref', ref: 'articles', required: true, quickAdd: true },
      { key: 'categorie_uuid', label: 'Catégorie', type: 'ref', ref: 'categories', quickAdd: true },
      { key: 'quantite', label: 'Quantité', type: 'number', required: true, default: 1 },
      { key: 'montant', label: 'Montant', type: 'number', required: true },
      modeField,
      { key: 'date', label: 'Date', type: 'date', required: true },
    ],
    label: (r, lookup) => lookup('articles', r.article_uuid)?.nom ?? 'Article supprimé',
    subtitle: (r, lookup) =>
      join(
        r.date,
        Number(r.quantite) !== 1 && `x${r.quantite}`,
        lookup('categories', r.categorie_uuid)?.nom,
        modeLabel(r.mode_paiement),
      ),
    amount: (r) => Number(r.montant),
    tone: 'danger',
  },
  {
    key: 'depenses_personnelles',
    title: 'Dépenses perso',
    kind: { label: 'Perso', icon: personOutline, tone: 'secondary' },
    fields: [
      { key: 'designation', label: 'Désignation', type: 'text', required: true },
      { key: 'categorie_uuid', label: 'Catégorie', type: 'ref', ref: 'categories', quickAdd: true },
      { key: 'quantite', label: 'Quantité', type: 'number', required: true, default: 1 },
      { key: 'montant', label: 'Montant', type: 'number', required: true },
      modeField,
      { key: 'date', label: 'Date', type: 'date', required: true },
    ],
    label: (r) => r.designation,
    subtitle: (r, lookup) =>
      join(
        r.date,
        Number(r.quantite) !== 1 && `x${r.quantite}`,
        lookup('categories', r.categorie_uuid)?.nom,
        modeLabel(r.mode_paiement),
      ),
    amount: (r) => Number(r.montant),
    tone: 'danger',
  },
  {
    key: 'revenus',
    title: 'Revenus',
    fields: [
      { key: 'description', label: 'Description', type: 'text', required: true },
      { key: 'montant', label: 'Montant', type: 'number', required: true },
      modeField,
      { key: 'date', label: 'Date', type: 'date', required: true },
    ],
    label: (r) => r.description,
    subtitle: (r) => join(r.date, modeLabel(r.mode_paiement)),
    amount: (r) => Number(r.montant),
    tone: 'success',
  },
  {
    key: 'emprunts',
    title: 'Emprunts',
    fields: [
      { key: 'description', label: 'Description', type: 'text', required: true },
      { key: 'montant', label: 'Montant', type: 'number', required: true },
      modeField,
      { key: 'date', label: 'Date', type: 'date', required: true },
      { key: 'rembourse', label: 'Remboursé', type: 'toggle' },
      {
        key: 'date_remboursement',
        label: 'Date de remboursement',
        type: 'date',
        default: '',
        showIf: (form) => !!form.rembourse,
      },
    ],
    label: (r) => r.description,
    subtitle: (r) =>
      join(
        r.date,
        modeLabel(r.mode_paiement),
        r.rembourse ? `Remboursé${r.date_remboursement ? ` le ${r.date_remboursement}` : ''}` : 'À rembourser',
      ),
    amount: (r) => Number(r.montant),
    tone: 'secondary',
    done: (r) => !!r.rembourse,
  },
  {
    key: 'articles',
    title: 'Articles',
    shared: true,
    back: '/tabs/catalogue',
    searchable: true,
    duplicable: true,
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
    back: '/tabs/catalogue',
    searchable: true,
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
    back: '/tabs/catalogue',
    searchable: true,
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
