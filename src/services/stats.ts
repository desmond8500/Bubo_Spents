/** Statistiques de dépenses d'un mois ou d'une année, sans dépendance au stockage (testable seul). */

export type StatMode = 'month' | 'year'

export interface StatInput {
  date: string
  montant: number | string
  categorie_uuid?: string | null
  label: string
}

export interface StatResult {
  total: number
  count: number
  /** Moyenne par dépense. */
  average: number
  /** Catégories triées par total décroissant ; `uuid` vide = sans catégorie. `part` en % du total. */
  byCategory: Array<{ uuid: string; total: number; part: number }>
  /** Total de chaque mois de l'année (12 valeurs), vide en mode mensuel. */
  byMonth: number[]
  /** Les 5 libellés les plus dépensés. */
  top: Array<{ label: string; total: number }>
}

const num = (v: unknown) => Number(v) || 0
const round = (n: number) => Math.round(n * 100) / 100

/** « 2026-11-18 » → « 2026-11 » (mois) ou « 2026 » (année). */
export const periodOf = (date: string, mode: StatMode) => String(date ?? '').slice(0, mode === 'month' ? 7 : 4)

/** Période voisine : delta de ±1 mois ou ±1 an, sans effet de bord sur les dates. */
export function shiftPeriod(period: string, mode: StatMode, delta: number) {
  if (mode === 'year') return String(Number(period) + delta)
  const [y, m] = period.split('-').map(Number)
  const index = y * 12 + (m - 1) + delta
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`
}

export function computeStats(rows: StatInput[], mode: StatMode, period: string): StatResult {
  const inPeriod = rows.filter((r) => periodOf(r.date, mode) === period)
  const total = inPeriod.reduce((s, r) => s + num(r.montant), 0)

  const categories = new Map<string, number>()
  const articles = new Map<string, number>()
  const months = Array<number>(12).fill(0)

  for (const r of inPeriod) {
    const montant = num(r.montant)
    const cat = r.categorie_uuid ?? ''
    categories.set(cat, (categories.get(cat) ?? 0) + montant)
    articles.set(r.label, (articles.get(r.label) ?? 0) + montant)
    if (mode === 'year') {
      const m = Number(String(r.date).slice(5, 7)) - 1
      if (m >= 0 && m < 12) months[m] += montant
    }
  }

  return {
    total: round(total),
    count: inPeriod.length,
    average: inPeriod.length ? round(total / inPeriod.length) : 0,
    byCategory: [...categories]
      .map(([uuid, t]) => ({ uuid, total: round(t), part: total > 0 ? Math.round((t / total) * 100) : 0 }))
      .sort((a, b) => b.total - a.total),
    byMonth: mode === 'year' ? months.map(round) : [],
    top: [...articles]
      .map(([label, t]) => ({ label, total: round(t) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5),
  }
}
