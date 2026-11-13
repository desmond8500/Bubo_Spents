import type { Row } from './entities'
import { visible } from './store'

export interface BudgetMonth {
  /** Aucun crédit enregistré, ou mois antérieur au solde de départ. */
  active: boolean
  /** Mois du premier crédit (« AAAA-MM »), début du budget. */
  start: string | null
  /** Solde reporté des mois précédents. */
  report: number
  /** Crédits ajoutés ce mois-ci. */
  credits: number
  /** Dépenses générales de tous les utilisateurs ce mois-ci. */
  depenses: number
  /** Report + crédits. */
  disponible: number
  /** Disponible − dépenses : sera reporté sur le mois suivant. */
  reste: number
}

const monthOf = (date: unknown) => String(date ?? '').slice(0, 7)
const total = (rows: Row[]) => rows.reduce((s, r) => s + (Number(r.montant) || 0), 0)

/**
 * Budget commun d'un mois (« AAAA-MM »).
 * Le budget commence au mois du premier crédit (le solde de départ). Chaque mois reçoit le solde du mois précédent
 * (report), ses propres crédits, et on en retire les dépenses générales de tous les utilisateurs.
 * Les dépenses personnelles ne touchent pas au budget.
 */
export function budgetFor(month: string): BudgetMonth {
  const credits = visible('budgets')
  const depenses = visible('depenses')

  const start = credits.map((c) => monthOf(c.date)).filter(Boolean).sort()[0] ?? null
  const empty: BudgetMonth = { active: false, start, report: 0, credits: 0, depenses: 0, disponible: 0, reste: 0 }

  if (!start || month < start) return empty

  const report =
    total(credits.filter((c) => monthOf(c.date) < month)) -
    total(depenses.filter((d) => monthOf(d.date) >= start && monthOf(d.date) < month))
  const creditsDuMois = total(credits.filter((c) => monthOf(c.date) === month))
  const depensesDuMois = total(depenses.filter((d) => monthOf(d.date) === month))
  const disponible = report + creditsDuMois

  return {
    active: true,
    start,
    report,
    credits: creditsDuMois,
    depenses: depensesDuMois,
    disponible,
    reste: disponible - depensesDuMois,
  }
}
