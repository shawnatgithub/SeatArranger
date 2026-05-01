import type {
  ArrangeInput,
  ArrangeOutput,
  Assignment,
  Person,
  Seat,
  VenueTemplate,
} from '@/domain/models'
import { STRATEGY_NAME, findHostLeader, findVipPeople, isVipRole } from '@/domain/rules/meetingStrategies'
import { resolveMainSeatId } from '@/domain/rules/mainSeatResolver'
import { buildLayoutScene } from '@/domain/services/layoutEngine'

const stablePersonSort = (people: Person[]) =>
  people
    .map((p, index) => ({ p, index }))
    .sort((a, b) => b.p.rank - a.p.rank || a.index - b.index || a.p.id.localeCompare(b.p.id))
    .map(({ p }) => p)

const seatById = (template: VenueTemplate) => new Map(template.seats.map((s) => [s.id, s]))

const normalizeLockedAssignments = (
  template: VenueTemplate,
  people: Person[],
  lockedAssignments: Assignment[],
) => {
  const warnings: string[] = []
  const seats = seatById(template)
  const peopleById = new Map(people.map((p) => [p.id, p]))

  const seenSeat = new Set<string>()
  const seenPerson = new Set<string>()

  const normalized: Assignment[] = []

  for (const a of lockedAssignments) {
    if (!seats.has(a.seatId)) {
      warnings.push(`锁定座位 ${a.seatId} 不存在于当前模板，已忽略。`)
      continue
    }
    if (!peopleById.has(a.personId)) {
      warnings.push(`锁定人员 ${a.personId} 不存在于当前人员列表，已忽略。`)
      continue
    }
    if (seenSeat.has(a.seatId)) {
      warnings.push(`座位 ${a.seatId} 被重复锁定，已保留第一次锁定。`)
      continue
    }
    if (seenPerson.has(a.personId)) {
      warnings.push(`人员 ${peopleById.get(a.personId)?.name ?? a.personId} 被重复锁定，已保留第一次锁定。`)
      continue
    }
    seenSeat.add(a.seatId)
    seenPerson.add(a.personId)
    normalized.push({ seatId: a.seatId, personId: a.personId, locked: true })
  }

  return { normalized, warnings }
}

type TableEdge = 'left' | 'right' | 'top' | 'bottom'

const oppositeEdge = (e: TableEdge): TableEdge => (e === 'top' ? 'bottom' : e === 'bottom' ? 'top' : e === 'left' ? 'right' : 'left')

const leftRightEdgesFromFacing = (facing: { x: number; y: number }): { leftEdge: TableEdge; rightEdge: TableEdge } => {
  const len2 = facing.x * facing.x + facing.y * facing.y
  const fx = len2 < 1e-6 ? -1 : facing.x
  const fy = len2 < 1e-6 ? 0 : facing.y
  const leftNormal = { x: -fy, y: fx }
  const dots = [
    { edge: 'left' as const, d: -leftNormal.x },
    { edge: 'right' as const, d: leftNormal.x },
    { edge: 'top' as const, d: -leftNormal.y },
    { edge: 'bottom' as const, d: leftNormal.y },
  ]
  const leftEdge = [...dots].sort((a, b) => b.d - a.d)[0]!.edge
  const rightEdge = [...dots].sort((a, b) => a.d - b.d)[0]!.edge
  return { leftEdge, rightEdge }
}

const edgeKeyForSeat = (table: { x: number; y: number; width: number; height: number }, s: { x: number; y: number }): TableEdge => {
  const dxL = Math.abs(s.x - table.x)
  const dxR = Math.abs(s.x - (table.x + table.width))
  const dyT = Math.abs(s.y - table.y)
  const dyB = Math.abs(s.y - (table.y + table.height))
  return [
    { e: 'left' as const, d: dxL },
    { e: 'right' as const, d: dxR },
    { e: 'top' as const, d: dyT },
    { e: 'bottom' as const, d: dyB },
  ].sort((a, b) => a.d - b.d)[0]!.e
}

const alternationOrder = (count: number, centerIndex: number) => {
  if (count <= 0) return []
  const out: number[] = []
  out.push(centerIndex)
  for (let d = 1; out.length < count; d++) {
    const a = centerIndex + d
    const b = centerIndex - d
    if (a < count) out.push(a)
    if (out.length >= count) break
    if (b >= 0) out.push(b)
  }
  return out
}

const buildCeremonySeatOrder = (args: {
  seats: Seat[]
  tables: { id: string; x: number; y: number; width: number; height: number }[]
  screen?: { x: number; y: number }
  mainSeatId: string
}) => {
  const { seats, tables, screen, mainSeatId } = args
  const mainSeat = seats.find((s) => s.id === mainSeatId)
  if (!mainSeat || tables.length === 0) return seats.map((s) => s.id).sort()

  const distToRect2 = (s: { x: number; y: number }, t: { x: number; y: number; width: number; height: number }) => {
    const dx = s.x < t.x ? t.x - s.x : s.x > t.x + t.width ? s.x - (t.x + t.width) : 0
    const dy = s.y < t.y ? t.y - s.y : s.y > t.y + t.height ? s.y - (t.y + t.height) : 0
    return dx * dx + dy * dy
  }

  const mainTable =
    [...tables].sort((a, b) => distToRect2(mainSeat, a) - distToRect2(mainSeat, b) || b.width * b.height - a.width * a.height || a.id.localeCompare(b.id))[0]!

  const startEdge = edgeKeyForSeat(mainTable, mainSeat)
  const tc = { x: mainTable.x + mainTable.width / 2, y: mainTable.y + mainTable.height / 2 }
  const sc = screen ?? { x: tc.x, y: tc.y - 1 }
  const facing = { x: sc.x - tc.x, y: sc.y - tc.y }
  const { leftEdge, rightEdge } = leftRightEdgesFromFacing(facing)
  const edgeSeq: TableEdge[] = [startEdge, oppositeEdge(startEdge), leftEdge, rightEdge].filter((v, i, arr) => arr.indexOf(v) === i)

  const seatsOnEdge = (edge: TableEdge) => {
    const list = seats.filter((s) => edgeKeyForSeat(mainTable, s) === edge)
    const t = (s: Seat) => (edge === 'top' || edge === 'bottom' ? s.x : s.y)
    return list.map((s) => ({ s, t: t(s) })).sort((a, b) => a.t - b.t || a.s.id.localeCompare(b.s.id))
  }

  const orderForEdge = (edge: TableEdge, prefer: { x: number; y: number }) => {
    const list = seatsOnEdge(edge)
    if (list.length === 0) return []
    const target = edge === 'top' || edge === 'bottom' ? prefer.x : prefer.y
    let centerIndex = 0
    for (let i = 1; i < list.length; i++) {
      const d0 = Math.abs(list[centerIndex]!.t - target)
      const d1 = Math.abs(list[i]!.t - target)
      if (d1 < d0) centerIndex = i
    }
    const idx = alternationOrder(list.length, centerIndex)
    return idx.map((i) => list[i]!.s.id)
  }

  const prefer0 = { x: mainSeat.x, y: mainSeat.y }
  const out: string[] = []
  for (const e of edgeSeq) out.push(...orderForEdge(e, prefer0))
  const uniq: string[] = []
  const seen = new Set<string>()
  for (const id of out) {
    if (seen.has(id)) continue
    seen.add(id)
    uniq.push(id)
  }
  for (const s of seats) if (!seen.has(s.id)) uniq.push(s.id)
  return uniq
}

const pickNextSeatId = (args: {
  seatOrder: string[]
  seatById: Map<string, Seat>
  usedSeats: Set<string>
  person: Person
}) => {
  const { seatOrder, seatById, usedSeats, person } = args
  const seats = seatOrder.map((id) => seatById.get(id)).filter(Boolean) as Seat[]

  const byZone = (zone: Seat['zone']) => seats.filter((s) => s.zone === zone && !usedSeats.has(s.id)).map((s) => s.id)
  const neutral = seats.filter((s) => s.zone === 'neutral' && !usedSeats.has(s.id)).map((s) => s.id)
  const any = seats.filter((s) => !usedSeats.has(s.id)).map((s) => s.id)

  if (person.roles.some(isVipRole)) return any[0]

  if (person.side === 'host') return byZone('host')[0] ?? neutral[0] ?? any[0]
  return byZone('guest')[0] ?? neutral[0] ?? any[0]
}

export const arrangeSeats = (input: ArrangeInput): ArrangeOutput => {
  const { template, people, strategyId, lockedAssignments, userMainSeatId } = input

  const warnings: string[] = []
  const errors: string[] = []
  const explain: ArrangeOutput['explain'] = []

  const { normalized: locked, warnings: lockWarnings } = normalizeLockedAssignments(template, people, lockedAssignments)
  warnings.push(...lockWarnings)

  const vipPeople = stablePersonSort(findVipPeople(people))
  if (vipPeople.length === 0) {
    errors.push('请先指定主宾/上级（roles 包含 vip 或 leader）。')
  }

  const resolution = resolveMainSeatId(template, userMainSeatId)
  warnings.push(...resolution.warnings)

  let mainSeatId = resolution.mainSeatId

  const vipPrimary = vipPeople[0]
  const lockedVipSeatId = vipPrimary
    ? locked.find((a) => a.personId === vipPrimary.id)?.seatId
    : undefined
  if (lockedVipSeatId) {
    mainSeatId = lockedVipSeatId
  }

  const seats = seatById(template)
  const mainSeat = mainSeatId ? seats.get(mainSeatId) : undefined
  if (!mainSeat) {
    errors.push('无法确定主位，请检查模板是否包含座位。')
  }

  const scene = buildLayoutScene({ template })
  const screenEl = scene.elements.find((e) => e.type === 'screen')
  const screen = screenEl ? { x: screenEl.x + screenEl.width / 2, y: screenEl.y + screenEl.height / 2 } : undefined
  const tables = scene.elements.filter((e) => e.type === 'table')

  const usedPeople = new Set(locked.map((a) => a.personId))
  const usedSeats = new Set(locked.map((a) => a.seatId))

  const sceneSeatById = new Map(scene.seats.map((s) => [s.id, s]))
  const assignments: Assignment[] = [...locked]

  const addExplain = (personId: string, reasons: string[]) => {
    const existing = explain.find((e) => e.personId === personId)
    if (existing) existing.reasons = [...existing.reasons, ...reasons]
    else explain.push({ personId, reasons })
  }

  const takeSeat = (person: Person, seatId: string, lockedFlag?: boolean) => {
    assignments.push({ seatId, personId: person.id, locked: lockedFlag })
    usedPeople.add(person.id)
    usedSeats.add(seatId)
  }

  const strategyName = STRATEGY_NAME[strategyId]

  const seatOrder =
    mainSeatId && sceneSeatById.has(mainSeatId)
      ? buildCeremonySeatOrder({ seats: scene.seats, tables, screen, mainSeatId })
      : scene.seats.map((s) => s.id).sort()

  if (vipPrimary && mainSeat && !usedPeople.has(vipPrimary.id) && !usedSeats.has(mainSeat.id)) {
    takeSeat(vipPrimary, mainSeat.id)
    addExplain(vipPrimary.id, [`${strategyName}：主宾/上级优先落在主位。`])
  }

  const hostLeader = findHostLeader(people)
  if (hostLeader && mainSeat && !usedPeople.has(hostLeader.id)) {
    const best = pickNextSeatId({ seatOrder: seatOrder.filter((id) => id !== mainSeat.id), seatById: sceneSeatById, usedSeats, person: hostLeader })
    if (best) takeSeat(hostLeader, best)
    addExplain(hostLeader.id, [`${strategyName}：主人方最高职级优先靠近主位便于陪同与沟通。`])
  }

  const remaining = stablePersonSort(
    people.filter((p) => !usedPeople.has(p.id)).sort((a, b) => {
      const aVip = a.roles.some(isVipRole) ? 1 : 0
      const bVip = b.roles.some(isVipRole) ? 1 : 0
      if (aVip !== bVip) return bVip - aVip
      const aKey = a.roles.includes('presenter') || a.roles.includes('hoster') ? 1 : 0
      const bKey = b.roles.includes('presenter') || b.roles.includes('hoster') ? 1 : 0
      if (aKey !== bKey) return bKey - aKey
      return b.rank - a.rank
    }),
  )

  for (const person of remaining) {
    if (!mainSeat) break

    const best = pickNextSeatId({ seatOrder, seatById: sceneSeatById, usedSeats, person })
    if (!best) break

    takeSeat(person, best)

    if (person.roles.some(isVipRole)) {
      addExplain(person.id, [`${strategyName}：按职级优先靠近主位安排。`])
    } else if (person.roles.includes('presenter')) {
      addExplain(person.id, [`${strategyName}：汇报人优先靠近主屏与主位，便于展示与沟通。`])
    } else if (person.roles.includes('hoster')) {
      addExplain(person.id, [`${strategyName}：主持人优先靠近主位，便于控场。`])
    } else {
      addExplain(person.id, [`${strategyName}：按阵营与职级从主位向外安排。`])
    }
  }

  const assignedSeatIds = new Set(assignments.map((a) => a.seatId))
  const unassignedSeats = template.seats.filter((s) => !assignedSeatIds.has(s.id))
  if (unassignedSeats.length > 0 && people.length > assignments.length) {
    warnings.push('座位数量不足，部分人员未能安排入座。')
  }

  if (!screen && people.some((p) => p.roles.includes('presenter'))) {
    warnings.push('当前模板未配置主屏（screen），汇报人“靠近主屏”偏好已自动降级。')
  }

  return {
    assignments: assignments.sort((a, b) => (seats.get(a.seatId)?.y ?? 0) - (seats.get(b.seatId)?.y ?? 0) || (seats.get(a.seatId)?.x ?? 0) - (seats.get(b.seatId)?.x ?? 0) || a.seatId.localeCompare(b.seatId)),
    explain,
    warnings,
    errors,
    mainSeatId,
  }
}
