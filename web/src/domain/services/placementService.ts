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

const dist2 = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  (a.x - b.x) ** 2 + (a.y - b.y) ** 2

const stablePersonSort = (people: Person[]) =>
  people
    .map((p, index) => ({ p, index }))
    .sort((a, b) => b.p.rank - a.p.rank || a.index - b.index || a.p.id.localeCompare(b.p.id))
    .map(({ p }) => p)

const stableSeatSort = (seats: Seat[]) =>
  [...seats].sort((a, b) => a.y - b.y || a.x - b.x || a.id.localeCompare(b.id))

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

const pickBestSeatId = (args: {
  seats: Seat[]
  person: Person
  mainSeat: Seat
  screen?: { x: number; y: number }
  canvasCenterX: number
}) => {
  const { seats, person, mainSeat, screen, canvasCenterX } = args

  const zoneBonus =
    person.side === 'host'
      ? (s: Seat) => (s.zone === 'host' ? 1_000_000 : s.zone === 'neutral' ? 100_000 : 0)
      : (s: Seat) => (s.zone === 'guest' ? 1_000_000 : s.zone === 'neutral' ? 100_000 : 0)

  const roleBonus = (s: Seat) => {
    if (!screen) return 0
    const hasPresenterOrHoster = person.roles.includes('presenter') || person.roles.includes('hoster')
    if (!hasPresenterOrHoster) return 0
    const d = dist2(s, screen)
    return Math.max(0, 500_000 - d)
  }

  const symmetryBonus = (s: Seat) => -Math.abs(s.x - canvasCenterX) * 200

  const score = (s: Seat) => {
    const dMain = dist2(s, mainSeat)
    const mainProximity = Math.max(0, 800_000 - dMain)
    return zoneBonus(s) + roleBonus(s) + mainProximity + symmetryBonus(s)
  }

  return seats
    .map((s) => ({ s, score: score(s) }))
    .sort((a, b) => b.score - a.score || a.s.y - b.s.y || a.s.x - b.s.x || a.s.id.localeCompare(b.s.id))[0]?.s.id
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

  const screenEl = template.elements.find((e) => e.type === 'screen')
  const screen = screenEl ? { x: screenEl.x + screenEl.width / 2, y: screenEl.y + screenEl.height / 2 } : undefined

  const usedPeople = new Set(locked.map((a) => a.personId))
  const usedSeats = new Set(locked.map((a) => a.seatId))

  const freeSeats = stableSeatSort(template.seats.filter((s) => !usedSeats.has(s.id)))
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

  if (vipPrimary && mainSeat && !usedPeople.has(vipPrimary.id) && !usedSeats.has(mainSeat.id)) {
    takeSeat(vipPrimary, mainSeat.id)
    addExplain(vipPrimary.id, [`${strategyName}：主宾/上级优先落在主位。`])
  }

  const hostLeader = findHostLeader(people)
  if (hostLeader && mainSeat && !usedPeople.has(hostLeader.id)) {
    const hostFreeSeats = freeSeats.filter((s) => !usedSeats.has(s.id))
    const best = pickBestSeatId({
      seats: hostFreeSeats.filter((s) => s.id !== mainSeat.id),
      person: hostLeader,
      mainSeat,
      screen,
      canvasCenterX: template.canvasWidth / 2,
    })
    if (best) {
      takeSeat(hostLeader, best)
      addExplain(hostLeader.id, [`${strategyName}：主人方最高职级优先靠近主位便于陪同与沟通。`])
    }
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

    const available = freeSeats.filter((s) => !usedSeats.has(s.id))
    const best = pickBestSeatId({
      seats: available,
      person,
      mainSeat,
      screen,
      canvasCenterX: template.canvasWidth / 2,
    })
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

