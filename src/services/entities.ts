export type EntityKey = 'marques' | 'fournisseurs' | 'articles'

export interface Field {
  key: string
  label: string
  type: 'text' | 'number' | 'date' | 'ref'
  ref?: EntityKey
  required?: boolean
}

export interface EntityDef {
  key: EntityKey
  title: string
  fields: Field[]
}

export interface Row {
  uuid: string
  synced: boolean
  updated_at: string
  [field: string]: any
}

export const entities: EntityDef[] = [
  {
    key: 'articles',
    title: 'Articles',
    fields: [
      { key: 'nom', label: 'Nom', type: 'text', required: true },
      { key: 'prix', label: 'Prix', type: 'number', required: true },
      { key: 'depense_le', label: 'Date', type: 'date', required: true },
      { key: 'marque_uuid', label: 'Marque', type: 'ref', ref: 'marques' },
      { key: 'fournisseur_uuid', label: 'Fournisseur', type: 'ref', ref: 'fournisseurs' },
    ],
  },
  {
    key: 'marques',
    title: 'Marques',
    fields: [{ key: 'nom', label: 'Nom', type: 'text', required: true }],
  },
  {
    key: 'fournisseurs',
    title: 'Fournisseurs',
    fields: [
      { key: 'nom', label: 'Nom', type: 'text', required: true },
      { key: 'contact', label: 'Contact', type: 'text' },
    ],
  },
]

export const entityByKey = (key: EntityKey) => entities.find((e) => e.key === key)!
