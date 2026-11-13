/** Lecture de fichiers CSV (séparateur `;`, `,` ou tabulation détecté automatiquement). Aucune dépendance. */

const DELIMITERS = [';', ',', '\t']

/** Décode un fichier : UTF-8 si possible, sinon Windows-1252 (export « CSV » d'Excel en français). */
export function decodeCsv(buffer: ArrayBuffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer)
  } catch {
    return new TextDecoder('windows-1252').decode(buffer)
  }
}

function detectDelimiter(text: string): string {
  const first = text.split(/\r?\n/, 1)[0] ?? ''
  let best = ';'
  let max = 0
  for (const d of DELIMITERS) {
    const n = first.split(d).length - 1
    if (n > max) {
      max = n
      best = d
    }
  }
  return best
}

export interface CsvRow {
  /** Numéro de la ligne du fichier où commence cette ligne (la première ligne est la 1). */
  line: number
  cells: string[]
}

/**
 * Découpe le texte en lignes de cellules (guillemets, `""` échappés et retours à la ligne dans les cellules gérés).
 * Les lignes vides sont ignorées, mais comptées dans la numérotation.
 */
export function parseCsv(input: string): CsvRow[] {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input
  const delimiter = detectDelimiter(text)

  const rows: CsvRow[] = []
  let cells: string[] = []
  let cell = ''
  let quoted = false
  let line = 1 // ligne physique courante
  let rowLine = 1 // ligne où commence la ligne CSV en cours

  const endCell = () => {
    cells.push(cell)
    cell = ''
  }
  const endRow = () => {
    endCell()
    if (cells.some((c) => c.trim() !== '')) rows.push({ line: rowLine, cells })
    cells = []
    line++
    rowLine = line
  }

  for (let i = 0; i < text.length; i++) {
    const c = text[i]

    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"'
          i++
        } else {
          quoted = false
        }
      } else {
        if (c === '\n') line++
        cell += c
      }
    } else if (c === '"') {
      quoted = true
    } else if (c === delimiter) {
      endCell()
    } else if (c === '\n') {
      endRow()
    } else if (c === '\r') {
      if (text[i + 1] === '\n') i++
      endRow()
    } else {
      cell += c
    }
  }

  if (cell !== '' || cells.length > 0) endRow()
  return rows
}

export const normalizeText = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()

export interface CsvRecord {
  /** Numéro de ligne dans le fichier (l'en-tête est la ligne 1). */
  line: number
  /** Valeurs indexées par en-tête normalisé (minuscules, sans accents). */
  values: Record<string, string>
}

/** La première ligne est l'en-tête ; chaque ligne suivante devient un enregistrement. */
export function toRecords(rows: CsvRow[]): CsvRecord[] {
  if (rows.length < 2) return []
  const header = rows[0].cells.map(normalizeText)

  return rows.slice(1).map((row) => ({
    line: row.line,
    values: Object.fromEntries(header.map((h, j) => [h, (row.cells[j] ?? '').trim()])),
  }))
}
