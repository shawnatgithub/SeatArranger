import type { MeetingRole, Person, PersonSide } from '@/domain/models'

export type CsvImportError = {
  row: number
  message: string
}

export type CsvImportResult = {
  people: Person[]
  errors: CsvImportError[]
}

const uuid = () => {
  const v = globalThis.crypto?.randomUUID?.()
  if (v) return v
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`
}

const parseCsvLine = (line: string) => {
  const out: string[] = []
  let cur = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      const next = line[i + 1]
      if (inQuotes && next === '"') {
        cur += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (ch === ',' && !inQuotes) {
      out.push(cur)
      cur = ''
      continue
    }
    cur += ch
  }
  out.push(cur)
  return out.map((s) => s.trim())
}

const toSide = (raw: string): PersonSide | undefined => {
  if (raw === 'guest' || raw === '主宾方') return 'guest'
  if (raw === 'host' || raw === '主人方') return 'host'
  return undefined
}

const toRoles = (raw: string): MeetingRole[] => {
  if (!raw) return []
  const allowed: MeetingRole[] = ['vip', 'leader', 'hoster', 'presenter', 'assistant']
  const parts = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const roles = parts.filter((p): p is MeetingRole => (allowed as string[]).includes(p))
  return [...new Set(roles)]
}

export const importPeopleFromCsv = (csvText: string): CsvImportResult => {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  if (lines.length === 0) return { people: [], errors: [{ row: 0, message: 'CSV 为空。' }] }

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase())
  const idx = (key: string) => headers.indexOf(key)

  const nameIdx = idx('name')
  const sideIdx = idx('side')
  const rankIdx = idx('rank')
  const rolesIdx = idx('roles')
  const noteIdx = idx('note')

  const errors: CsvImportError[] = []
  const people: Person[] = []

  for (let i = 1; i < lines.length; i++) {
    const rowNo = i + 1
    const cols = parseCsvLine(lines[i])

    const name = (cols[nameIdx] ?? '').trim()
    const sideRaw = (cols[sideIdx] ?? '').trim()
    const rankRaw = (cols[rankIdx] ?? '').trim()

    if (!name) {
      errors.push({ row: rowNo, message: 'name 为空。' })
      continue
    }

    const side = toSide(sideRaw)
    if (!side) {
      errors.push({ row: rowNo, message: `side 非法：${sideRaw}` })
      continue
    }

    const rank = Number.parseInt(rankRaw, 10)
    if (!Number.isFinite(rank)) {
      errors.push({ row: rowNo, message: `rank 非法：${rankRaw}` })
      continue
    }

    const roles = toRoles((cols[rolesIdx] ?? '').trim())
    const note = (cols[noteIdx] ?? '').trim()

    people.push({
      id: uuid(),
      name,
      side,
      rank,
      roles,
      note: note || undefined,
    })
  }

  return { people, errors }
}

