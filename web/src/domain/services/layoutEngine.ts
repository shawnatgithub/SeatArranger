import type { Seat, VenueElement, VenueTemplate } from '@/domain/models'
import { defaultVenueRules, metersToPx, snapPx } from '@/domain/config/venueRules'

export type Room = { x: number; y: number; width: number; height: number }

export type LayoutScene = {
  room: Room
  elements: VenueElement[]
  seats: Seat[]
}

export const DEFAULT_GRID_SIZE = 20
export const DEFAULT_ROOM_PADDING = 60
const DEFAULT_SEAT_DIAMETER = metersToPx(defaultVenueRules.seat.diameterM)
export const DEFAULT_SEAT_RADIUS = DEFAULT_SEAT_DIAMETER / 2
const SNAP_STEP_PX = Math.max(1, Math.round(metersToPx(defaultVenueRules.snapStepM)))

const snap = (v: number, grid: number) => Math.round(v / grid) * grid
const dist2 = (a: { x: number; y: number }, b: { x: number; y: number }) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2
const snapStep = (v: number) => snapPx(v, SNAP_STEP_PX)
const seatSnap = (v: number, gridSize: number) => snapPx(v, Math.max(1, Math.round(gridSize / 2)))

type TableEdge = 'left' | 'right' | 'top' | 'bottom'
type SeatSlot = { tableId: string; edge: TableEdge; x: number; y: number; t: number }

const oppositeEdge = (e: TableEdge): TableEdge => (e === 'top' ? 'bottom' : e === 'bottom' ? 'top' : e === 'left' ? 'right' : 'left')

const slotOrderIndices = (count: number, centerIndex: number) => {
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

const buildTableEdgeSlots = (args: {
  table: VenueElement
  edge: TableEdge
  seatPitch: number
  rowOffset0: number
  gridSize: number
}): SeatSlot[] => {
  const { table, edge, seatPitch, rowOffset0, gridSize } = args
  const edgeLen = edge === 'left' || edge === 'right' ? table.height : table.width
  const n = Math.max(1, Math.floor(edgeLen / seatPitch) + 1)
  const start = (edgeLen - (n - 1) * seatPitch) / 2
  const slots: SeatSlot[] = []
  for (let i = 0; i < n; i++) {
    const off = start + i * seatPitch
    if (edge === 'top') {
      const x = seatSnap(table.x + off, gridSize)
      const y = seatSnap(table.y - rowOffset0, gridSize)
      slots.push({ tableId: table.id, edge, x, y, t: x })
    } else if (edge === 'bottom') {
      const x = seatSnap(table.x + off, gridSize)
      const y = seatSnap(table.y + table.height + rowOffset0, gridSize)
      slots.push({ tableId: table.id, edge, x, y, t: x })
    } else if (edge === 'left') {
      const x = seatSnap(table.x - rowOffset0, gridSize)
      const y = seatSnap(table.y + off, gridSize)
      slots.push({ tableId: table.id, edge, x, y, t: y })
    } else {
      const x = seatSnap(table.x + table.width + rowOffset0, gridSize)
      const y = seatSnap(table.y + off, gridSize)
      slots.push({ tableId: table.id, edge, x, y, t: y })
    }
  }
  return slots
}

const chooseSlotsOnEdge = (slots: SeatSlot[], want: number) => {
  const n = slots.length
  if (n === 0 || want <= 0) return []
  const centerT = (slots[0]!.t + slots[n - 1]!.t) / 2
  let centerIndex = 0
  for (let i = 1; i < n; i++) {
    const d0 = Math.abs(slots[centerIndex]!.t - centerT)
    const d1 = Math.abs(slots[i]!.t - centerT)
    if (d1 < d0) centerIndex = i
  }
  const order = slotOrderIndices(n, centerIndex)
  const pickedIdx = order.slice(0, Math.min(want, n))
  return pickedIdx.map((i) => slots[i]!)
}

const rotate = (p: { x: number; y: number }, rad: number) => {
  const c = Math.cos(rad)
  const s = Math.sin(rad)
  return { x: p.x * c - p.y * s, y: p.x * s + p.y * c }
}

const elementCenter = (e: VenueElement) => ({ x: e.x + e.width / 2, y: e.y + e.height / 2 })

const isAnchor = (e: VenueElement) => e.type === 'screen' || e.type === 'entrance' || e.type === 'window'

const rectsOverlap = (a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) =>
  a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

export type RoomWall = 'left' | 'right' | 'top' | 'bottom'

export const snapAnchorToRoomWall = (args: {
  room: Room
  gridSize: number
  element: Pick<VenueElement, 'type' | 'width' | 'height'>
  pos: { x: number; y: number }
}) => {
  const { room, gridSize, element, pos } = args
  const w0 = Math.max(1, snapStep(element.width))
  const h0 = Math.max(1, snapStep(element.height))
  const longIsWidth = w0 >= h0

  const wallFor = (w: number, h: number) => {
    const minX = room.x
    const maxX = room.x + room.width - w
    const minY = room.y
    const maxY = room.y + room.height - h
    const distLeft = Math.abs(pos.x - minX)
    const distRight = Math.abs(pos.x - maxX)
    const distTop = Math.abs(pos.y - minY)
    const distBottom = Math.abs(pos.y - maxY)
    return [
      { wall: 'left' as const, d: distLeft },
      { wall: 'right' as const, d: distRight },
      { wall: 'top' as const, d: distTop },
      { wall: 'bottom' as const, d: distBottom },
    ].sort((a, b) => a.d - b.d)[0]?.wall ?? 'left'
  }

  const wall = wallFor(w0, h0)
  const wantHorizontal = wall === 'top' || wall === 'bottom'
  const w = wantHorizontal ? Math.max(w0, h0) : Math.min(w0, h0)
  const h = wantHorizontal ? Math.min(w0, h0) : Math.max(w0, h0)
  const rotated = longIsWidth !== wantHorizontal

  const minX = room.x
  const maxX = room.x + room.width - w
  const minY = room.y
  const maxY = room.y + room.height - h

  if (wall === 'left') {
    return { wall, rotated, x: minX, y: clamp(snap(pos.y, gridSize), minY, maxY), width: w, height: h }
  }
  if (wall === 'right') {
    return { wall, rotated, x: maxX, y: clamp(snap(pos.y, gridSize), minY, maxY), width: w, height: h }
  }
  if (wall === 'top') {
    return { wall, rotated, x: clamp(snap(pos.x, gridSize), minX, maxX), y: minY, width: w, height: h }
  }
  return { wall, rotated, x: clamp(snap(pos.x, gridSize), minX, maxX), y: maxY, width: w, height: h }
}

export const getDefaultRoom = (template: VenueTemplate, padding: number) => {
  const width = template.canvasWidth - padding * 2
  const height = template.canvasHeight - padding * 2
  return { x: -width / 2, y: -height / 2, width, height }
}

const resolveElementCollisions = (args: {
  room: Room
  gridSize: number
  elements: VenueElement[]
}) => {
  const { room, gridSize } = args
  const elements = args.elements.map((e) => ({ ...e }))

  const obstacles = elements.filter((e) => isAnchor(e))
  const movables = elements.filter((e) => !isAnchor(e) && e.type === 'table')

  const clampToRoom = (e: VenueElement) => {
    e.x = clamp(snap(e.x, gridSize), room.x, room.x + room.width - e.width)
    e.y = clamp(snap(e.y, gridSize), room.y, room.y + room.height - e.height)
  }

  for (let iter = 0; iter < 40; iter++) {
    let moved = false

    for (let i = 0; i < movables.length; i++) {
      const a = movables[i]
      clampToRoom(a)
      for (let j = i + 1; j < movables.length; j++) {
        const b = movables[j]
        if (!rectsOverlap(a, b)) continue
        const ax = a.x + a.width / 2
        const ay = a.y + a.height / 2
        const bx = b.x + b.width / 2
        const by = b.y + b.height / 2
        const dx = bx - ax
        const dy = by - ay
        const overlapX = a.width / 2 + b.width / 2 - Math.abs(dx)
        const overlapY = a.height / 2 + b.height / 2 - Math.abs(dy)
        if (overlapX <= 0 || overlapY <= 0) continue
        if (overlapX < overlapY) {
          b.x += (dx >= 0 ? 1 : -1) * snap(overlapX + gridSize, gridSize)
        } else {
          b.y += (dy >= 0 ? 1 : -1) * snap(overlapY + gridSize, gridSize)
        }
        clampToRoom(b)
        moved = true
      }

      for (const obs of obstacles) {
        if (!rectsOverlap(a, obs)) continue
        const ac = elementCenter(a)
        const bc = elementCenter(obs)
        const dx = ac.x - bc.x
        const dy = ac.y - bc.y
        if (Math.abs(dx) > Math.abs(dy)) a.x += (dx >= 0 ? 1 : -1) * gridSize
        else a.y += (dy >= 0 ? 1 : -1) * gridSize
        clampToRoom(a)
        moved = true
      }
    }

    if (!moved) break
  }

  const byId = new Map(elements.map((e) => [e.id, e]))
  for (const m of movables) byId.set(m.id, m)
  return elements.map((e) => byId.get(e.id) ?? e)
}

const assignSeatToTableEdge = (tables: VenueElement[], seat: Seat) => {
  const seatP = { x: seat.x, y: seat.y }
  let best: { table: VenueElement; edge: 'left' | 'right' | 'top' | 'bottom'; d: number } | null = null
  for (const t of tables) {
    const left = Math.abs(seatP.x - t.x)
    const right = Math.abs(seatP.x - (t.x + t.width))
    const top = Math.abs(seatP.y - t.y)
    const bottom = Math.abs(seatP.y - (t.y + t.height))
    const candidates = [
      { edge: 'left' as const, d: left },
      { edge: 'right' as const, d: right },
      { edge: 'top' as const, d: top },
      { edge: 'bottom' as const, d: bottom },
    ].sort((a, b) => a.d - b.d)
    const c = candidates[0]
    if (!c) continue
    if (!best || c.d < best.d) best = { table: t, edge: c.edge, d: c.d }
  }
  return best
}

const leftRightEdgesFromFacing = (facing: { x: number; y: number }): { leftEdge: 'left' | 'right' | 'top' | 'bottom'; rightEdge: 'left' | 'right' | 'top' | 'bottom' } => {
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

const rebalanceEdgesDirectional = (groups: Map<string, Seat[]>, facing: { x: number; y: number }) => {
  const keys = [...groups.keys()]
  const tables = new Set(keys.map((k) => k.split('::')[0]))
  const { leftEdge, rightEdge } = leftRightEdgesFromFacing(facing)
  for (const t of tables) {
    const highKey = `${t}::${leftEdge}`
    const lowKey = `${t}::${rightEdge}`
    const high = groups.get(highKey) ?? []
    const low = groups.get(lowKey) ?? []
    if (low.length >= high.length) continue
    const moveCount = Math.ceil((high.length - low.length) / 2)
    const moved = high.splice(high.length - moveCount, moveCount)
    groups.set(highKey, high)
    groups.set(lowKey, [...low, ...moved])
  }
}

type DoorClearance = { x: number; y: number; width: number; height: number; wall: RoomWall }

const inferWall = (room: Room, el: VenueElement, eps = 0.001): RoomWall => {
  const rightX = room.x + room.width - el.width
  const bottomY = room.y + room.height - el.height
  if (Math.abs(el.x - room.x) <= eps) return 'left'
  if (Math.abs(el.x - rightX) <= eps) return 'right'
  if (Math.abs(el.y - room.y) <= eps) return 'top'
  if (Math.abs(el.y - bottomY) <= eps) return 'bottom'
  return 'bottom'
}

const buildDoorClearances = (args: { room: Room; gridSize: number; entrances: VenueElement[]; depth: number; pad: number }): DoorClearance[] => {
  const { room, gridSize } = args
  const depth = args.depth
  const pad = args.pad
  const out: DoorClearance[] = []
  for (const e of args.entrances) {
    const wall = inferWall(room, e)
    if (wall === 'top' || wall === 'bottom') {
      const x = clamp(e.x - pad, room.x, room.x + room.width)
      const w = clamp(e.width + pad * 2, gridSize, room.x + room.width - x)
      const y = wall === 'top' ? room.y : room.y + room.height - depth
      out.push({ wall, x, y, width: w, height: depth })
    } else {
      const y = clamp(e.y - pad, room.y, room.y + room.height)
      const h = clamp(e.height + pad * 2, gridSize, room.y + room.height - y)
      const x = wall === 'left' ? room.x : room.x + room.width - depth
      out.push({ wall, x, y, width: depth, height: h })
    }
  }
  return out
}

const layoutSeatsOnTables = (args: {
  room: Room
  gridSize: number
  tables: VenueElement[]
  seats: Seat[]
  facing: { x: number; y: number }
  doorClearances: DoorClearance[]
}) => {
  const { room, gridSize, tables, doorClearances, facing } = args
  if (tables.length === 0) return args.seats

  const seatDiameter = metersToPx(defaultVenueRules.seat.diameterM)
  const seatRadius = seatDiameter / 2
  const minGap = metersToPx(defaultVenueRules.seat.minGapM)
  const seatPitch = seatDiameter + minGap
  const minDist = seatPitch
  const wallMargin = metersToPx(defaultVenueRules.wallMarginM)
  const tableGap = metersToPx(defaultVenueRules.seat.tableGapM)
  const rowOffset0 = tableGap + seatRadius
  const minX = room.x + seatRadius + wallMargin
  const maxX = room.x + room.width - seatRadius - wallMargin
  const minY = room.y + seatRadius + wallMargin
  const maxY = room.y + room.height - seatRadius - wallMargin

  const groups = new Map<string, Seat[]>()

  for (const s of args.seats) {
    const best = assignSeatToTableEdge(tables, s)
    if (!best) continue
    const key = `${best.table.id}::${best.edge}`
    groups.set(key, [...(groups.get(key) ?? []), s])
  }

  rebalanceEdgesDirectional(groups, facing)

  const laidOut: Record<string, { x: number; y: number }> = {}
  const spill: Array<{ seat: Seat; wall: 'left' | 'right' | 'top' | 'bottom' }> = []

  for (const [key, seats] of groups.entries()) {
    const [tableId, edge] = key.split('::') as [string, 'left' | 'right' | 'top' | 'bottom']
    const table = tables.find((t) => t.id === tableId)
    if (!table) continue
    const sorted = [...seats].sort((a, b) => a.id.localeCompare(b.id))
    const n = sorted.length
    if (n === 0) continue

    const edgeSlots = buildTableEdgeSlots({ table, edge, seatPitch, rowOffset0, gridSize })
    const picked = chooseSlotsOnEdge(edgeSlots, n)
    const k = picked.length
    const remain = n - k
    for (let i = 0; i < k; i++) {
      const p = picked[i]!
      laidOut[sorted[i]!.id] = { x: clamp(p.x, minX, maxX), y: clamp(p.y, minY, maxY) }
    }
    if (remain > 0) {
      const wall: 'left' | 'right' | 'top' | 'bottom' =
        edge === 'left' ? 'left' : edge === 'right' ? 'right' : edge === 'top' ? 'top' : 'bottom'
      for (let i = k; i < n; i++) spill.push({ seat: sorted[i]!, wall })
    }
  }

  if (spill.length > 0) {
    const byWall = {
      left: spill.filter((s) => s.wall === 'left').map((s) => s.seat),
      right: spill.filter((s) => s.wall === 'right').map((s) => s.seat),
      top: spill.filter((s) => s.wall === 'top').map((s) => s.seat),
      bottom: spill.filter((s) => s.wall === 'bottom').map((s) => s.seat),
    }

    const placeAlongWall = (wall: 'left' | 'right' | 'top' | 'bottom', seats: Seat[]) => {
      if (seats.length === 0) return
      const axisLen = wall === 'left' || wall === 'right' ? room.height - 2 * (wallMargin + seatRadius) : room.width - 2 * (wallMargin + seatRadius)
      const maxPerRowWall = Math.max(1, Math.floor(axisLen / seatPitch) + 1)
      let idx = 0
      for (let r = 0; idx < seats.length && r < 40; r++) {
        const remain = seats.length - idx
        const k = Math.min(maxPerRowWall, remain)
        const start = (axisLen - (k - 1) * seatPitch) / 2
        for (let i = 0; i < k; i++) {
          const t = start + i * seatPitch
          const s = seats[idx++]!
          if (wall === 'left') {
            const x = room.x + wallMargin + seatRadius + r * seatPitch
            const y = room.y + wallMargin + seatRadius + t
            laidOut[s.id] = { x: clamp(seatSnap(x, gridSize), minX, maxX), y: clamp(seatSnap(y, gridSize), minY, maxY) }
          } else if (wall === 'right') {
            const x = room.x + room.width - wallMargin - seatRadius - r * seatPitch
            const y = room.y + wallMargin + seatRadius + t
            laidOut[s.id] = { x: clamp(seatSnap(x, gridSize), minX, maxX), y: clamp(seatSnap(y, gridSize), minY, maxY) }
          } else if (wall === 'top') {
            const x = room.x + wallMargin + seatRadius + t
            const y = room.y + wallMargin + seatRadius + r * seatPitch
            laidOut[s.id] = { x: clamp(seatSnap(x, gridSize), minX, maxX), y: clamp(seatSnap(y, gridSize), minY, maxY) }
          } else {
            const x = room.x + wallMargin + seatRadius + t
            const y = room.y + room.height - wallMargin - seatRadius - r * seatPitch
            laidOut[s.id] = { x: clamp(seatSnap(x, gridSize), minX, maxX), y: clamp(seatSnap(y, gridSize), minY, maxY) }
          }
        }
      }
    }

    placeAlongWall('left', byWall.left)
    placeAlongWall('right', byWall.right)
    placeAlongWall('top', byWall.top)
    placeAlongWall('bottom', byWall.bottom)
  }

  const avoidDoor = (p: { x: number; y: number }) => {
    const out = { ...p }
    for (let iter = 0; iter < 40; iter++) {
      const hit = doorClearances.find((d) => {
        const x0 = d.x - seatRadius
        const y0 = d.y - seatRadius
        const x1 = d.x + d.width + seatRadius
        const y1 = d.y + d.height + seatRadius
        return out.x >= x0 && out.x <= x1 && out.y >= y0 && out.y <= y1
      })
      if (!hit) break
      if (hit.wall === 'top' || hit.wall === 'bottom') {
        const doorCenter = hit.x + hit.width / 2
        out.x += (out.x >= doorCenter ? 1 : -1) * gridSize
      } else {
        const doorCenter = hit.y + hit.height / 2
        out.y += (out.y >= doorCenter ? 1 : -1) * gridSize
      }
      out.x = clamp(seatSnap(out.x, gridSize), minX, maxX)
      out.y = clamp(seatSnap(out.y, gridSize), minY, maxY)
    }
    return out
  }

  const outSeats = args.seats.map((s) => {
    const p = laidOut[s.id]
    if (!p) return s
    const safe = avoidDoor(p)
    return { ...s, x: safe.x, y: safe.y }
  })

  const circleIntersectsRect = (seat: { x: number; y: number }, rect: { x: number; y: number; width: number; height: number }) => {
    const cx = clamp(seat.x, rect.x, rect.x + rect.width)
    const cy = clamp(seat.y, rect.y, rect.y + rect.height)
    return dist2(seat, { x: cx, y: cy }) < seatRadius * seatRadius
  }

  const pushOutsideTables = (seat: { x: number; y: number }) => {
    let out = { ...seat }
    for (let iter = 0; iter < 20; iter++) {
      const hit = tables.find((t) => circleIntersectsRect(out, t))
      if (!hit) break
      const tc = { x: hit.x + hit.width / 2, y: hit.y + hit.height / 2 }
      const dx = out.x - tc.x
      const dy = out.y - tc.y
      const len = Math.hypot(dx, dy) || 1
      const nx = dx / len
      const ny = dy / len
      out = { x: out.x + nx * (gridSize / 2), y: out.y + ny * (gridSize / 2) }
      out.x = clamp(seatSnap(out.x, gridSize), minX, maxX)
      out.y = clamp(seatSnap(out.y, gridSize), minY, maxY)
    }
    return out
  }

  for (let iter = 0; iter < 40; iter++) {
    let moved = false
    const nudge = Math.max(1, Math.round(gridSize / 2))
    for (let i = 0; i < outSeats.length; i++) {
      for (let j = i + 1; j < outSeats.length; j++) {
        const a = outSeats[i]
        const b = outSeats[j]
        const d2 = dist2(a, b)
        if (d2 >= minDist * minDist) continue
        const dx = b.x - a.x
        const dy = b.y - a.y
        const signX = dx === 0 ? 1 : dx > 0 ? 1 : -1
        const signY = dy === 0 ? 1 : dy > 0 ? 1 : -1
        if (Math.abs(dx) > Math.abs(dy)) {
          outSeats[j] = { ...b, x: clamp(seatSnap(b.x + signX * nudge, gridSize), minX, maxX) }
          outSeats[i] = { ...a, x: clamp(seatSnap(a.x - signX * nudge, gridSize), minX, maxX) }
        } else {
          outSeats[j] = { ...b, y: clamp(seatSnap(b.y + signY * nudge, gridSize), minY, maxY) }
          outSeats[i] = { ...a, y: clamp(seatSnap(a.y - signY * nudge, gridSize), minY, maxY) }
        }
        moved = true
      }
    }
    if (!moved) break
  }

  return outSeats.map((s) => {
    const pushed = pushOutsideTables({ x: s.x, y: s.y })
    const safe = avoidDoor(pushed)
    return { ...s, x: safe.x, y: safe.y }
  })
}

export const buildLayoutScene = (args: {
  template: VenueTemplate
  roomPadding?: number
  gridSize?: number
  elementOverrides?: Record<string, { x: number; y: number }>
  seatOverrides?: Record<string, { x: number; y: number }>
  seatCount?: number
}): LayoutScene => {
  const { template } = args
  const gridSize = args.gridSize ?? DEFAULT_GRID_SIZE
  const roomPadding = args.roomPadding ?? DEFAULT_ROOM_PADDING
  const roomRaw = getDefaultRoom(template, roomPadding)
  const room: Room = {
    x: snap(roomRaw.x, gridSize),
    y: snap(roomRaw.y, gridSize),
    width: snap(roomRaw.width, gridSize),
    height: snap(roomRaw.height, gridSize),
  }
  const elementOverrides = args.elementOverrides ?? {}
  const seatOverrides = args.seatOverrides ?? {}

  const baseElements: VenueElement[] = template.elements.map((el) => ({ ...el }))
  const hasScreen = baseElements.some((e) => e.type === 'screen')
  const hasEntrance = baseElements.some((e) => e.type === 'entrance')
  const hasWindow = baseElements.some((e) => e.type === 'window')

  const metersPer1mPx = metersToPx(1)
  const widthM = room.width / metersPer1mPx
  const heightM = room.height / metersPer1mPx

  const allWalls: RoomWall[] = ['top', 'right', 'bottom', 'left']
  const wantedDoorWall = defaultVenueRules.door.wall
  const wantedScreenWall = defaultVenueRules.screen.wall
  const wantedWindowWall = defaultVenueRules.window.wall
  const doorWall: RoomWall = wantedDoorWall
  const screenWall: RoomWall = wantedScreenWall !== doorWall ? wantedScreenWall : allWalls.find((w) => w !== doorWall) ?? 'top'
  const windowWall: RoomWall =
    wantedWindowWall !== doorWall && wantedWindowWall !== screenWall ? wantedWindowWall : allWalls.find((w) => w !== doorWall && w !== screenWall) ?? 'bottom'

  const placeOnWall = (args: {
    id: string
    type: VenueElement['type']
    wall: RoomWall
    lengthPx: number
    thicknessPx: number
    tangentialStartPx?: number
  }): VenueElement => {
    const { id, type, wall, lengthPx, thicknessPx, tangentialStartPx } = args
    if (wall === 'top') {
      return { id, type, x: snap(room.x + (tangentialStartPx ?? (room.width - lengthPx) / 2), gridSize), y: room.y, width: lengthPx, height: thicknessPx }
    }
    if (wall === 'bottom') {
      return {
        id,
        type,
        x: snap(room.x + (tangentialStartPx ?? (room.width - lengthPx) / 2), gridSize),
        y: room.y + room.height - thicknessPx,
        width: lengthPx,
        height: thicknessPx,
      }
    }
    if (wall === 'left') {
      return { id, type, x: room.x, y: snap(room.y + (tangentialStartPx ?? (room.height - lengthPx) / 2), gridSize), width: thicknessPx, height: lengthPx }
    }
    return {
      id,
      type,
      x: room.x + room.width - thicknessPx,
      y: snap(room.y + (tangentialStartPx ?? (room.height - lengthPx) / 2), gridSize),
      width: thicknessPx,
      height: lengthPx,
    }
  }

  if (!hasScreen) {
    const screenLenPx = snapStep(metersToPx(defaultVenueRules.screen.lengthM({ widthM, heightM })))
    const screenThPx = snapStep(metersToPx(defaultVenueRules.screen.thicknessM))
    baseElements.push(placeOnWall({ id: 'auto-screen', type: 'screen', wall: screenWall, lengthPx: screenLenPx, thicknessPx: screenThPx }))
  }

  if (!hasWindow) {
    const windowLenPx = snapStep(metersToPx(defaultVenueRules.window.lengthM({ widthM, heightM })))
    const windowThPx = snapStep(metersToPx(defaultVenueRules.window.thicknessM))
    baseElements.push(placeOnWall({ id: 'auto-window', type: 'window', wall: windowWall, lengthPx: windowLenPx, thicknessPx: windowThPx }))
  }

  if (!hasEntrance) {
    const doorLenPx = snapStep(metersToPx(defaultVenueRules.door.lengthM))
    const doorThPx = snapStep(metersToPx(defaultVenueRules.door.thicknessM))
    const doorCount = defaultVenueRules.door.count
    const insetPx0 = snapStep(metersToPx(defaultVenueRules.door.cornerInsetM))
    const gapPx0 = snapStep(metersToPx(defaultVenueRules.door.minGapM))
    const wallLen = doorWall === 'top' || doorWall === 'bottom' ? room.width : room.height
    const need = doorCount * doorLenPx + Math.max(0, doorCount - 1) * gapPx0
    const inset = need <= wallLen ? Math.min(insetPx0, (wallLen - need) / 2) : 0
    const starts =
      doorCount <= 1
        ? [Math.max(0, (wallLen - doorLenPx) / 2)]
        : [inset, Math.max(inset, wallLen - inset - doorLenPx)]
    baseElements.push(placeOnWall({ id: 'auto-entrance-left', type: 'entrance', wall: doorWall, lengthPx: doorLenPx, thicknessPx: doorThPx, tangentialStartPx: starts[0] }))
    if (doorCount > 1) {
      baseElements.push(
        placeOnWall({ id: 'auto-entrance-right', type: 'entrance', wall: doorWall, lengthPx: doorLenPx, thicknessPx: doorThPx, tangentialStartPx: starts[1] }),
      )
    }
  }

  const baseById = new Map(baseElements.map((e) => [e.id, e]))

  const currentElements: VenueElement[] = baseElements.map((e) => {
    const ov = elementOverrides[e.id]
    return ov ? { ...e, x: ov.x, y: ov.y } : e
  })

  const pickAnchorId = () => {
    const preferred = [
      'auto-screen',
      'screen-1',
      'auto-window',
      'auto-entrance-right',
      'auto-entrance-left',
      'entrance-1',
    ]
    for (const id of preferred) {
      if (elementOverrides[id] && baseById.has(id)) return id
    }
    const screen = baseElements.find((e) => e.type === 'screen')
    if (screen) return screen.id
    const any = baseElements.find(isAnchor)
    return any?.id
  }

  const anchorId = pickAnchorId()
  const anchorBase = anchorId ? baseById.get(anchorId) : undefined
  const anchorCur = anchorId ? currentElements.find((e) => e.id === anchorId) : undefined

  const getAngle = (e: VenueElement | undefined) => {
    if (!e) return undefined
    const c = elementCenter(e)
    const len2 = c.x * c.x + c.y * c.y
    if (len2 < 1e-6) return undefined
    return Math.atan2(c.y, c.x)
  }

  const snapForAngle = (e: VenueElement | undefined) => {
    if (!e || !isAnchor(e)) return e
    const res = snapAnchorToRoomWall({
      room,
      gridSize,
      element: { type: e.type, width: e.width, height: e.height },
      pos: { x: e.x, y: e.y },
    })
    return { ...e, x: res.x, y: res.y, width: res.width, height: res.height }
  }

  const baseAngle = getAngle(snapForAngle(anchorBase))
  const curAngle = getAngle(snapForAngle(anchorCur))
  const delta = baseAngle !== undefined && curAngle !== undefined ? curAngle - baseAngle : 0

  const rotatedSeats: Seat[] = template.seats.map((s) => {
    const p = rotate({ x: s.x, y: s.y }, delta)
    const ov = seatOverrides[s.id]
    const base = ov ? { x: ov.x, y: ov.y } : { x: p.x, y: p.y }
    return { ...s, x: snap(base.x, gridSize), y: snap(base.y, gridSize) }
  })

  const rotatedElements: VenueElement[] = currentElements.map((e) => {
    if (isAnchor(e)) return e
    const base = baseById.get(e.id)
    const from = base ? { x: base.x, y: base.y } : { x: e.x, y: e.y }
    const p = rotate(from, delta)
    const ov = elementOverrides[e.id]
    const basePos = ov ? { x: ov.x, y: ov.y } : { x: p.x, y: p.y }
    return { ...e, x: snap(basePos.x, gridSize), y: snap(basePos.y, gridSize) }
  })

  const snappedAnchors = rotatedElements.map((e) => {
    if (!isAnchor(e)) return e
    const ov = elementOverrides[e.id]
    const x = ov ? ov.x : e.x
    const y = ov ? ov.y : e.y
    const res = snapAnchorToRoomWall({
      room,
      gridSize,
      element: { type: e.type, width: e.width, height: e.height },
      pos: { x, y },
    })
    return { ...e, x: res.x, y: res.y, width: res.width, height: res.height }
  })

  const resolveAnchorOverlaps = (elements: VenueElement[]) => {
    const gapFor = (e: VenueElement) => (e.type === 'entrance' ? metersToPx(defaultVenueRules.door.minGapM) : 0)
    const clampToWall = (wall: RoomWall, e: VenueElement, start: number) => {
      const len = wall === 'top' || wall === 'bottom' ? e.width : e.height
      const min = wall === 'top' || wall === 'bottom' ? room.x : room.y
      const max = (wall === 'top' || wall === 'bottom' ? room.x + room.width : room.y + room.height) - len
      return clamp(snap(start, gridSize), min, max)
    }
    const setStart = (wall: RoomWall, e: VenueElement, start: number) => {
      const s = clampToWall(wall, e, start)
      if (wall === 'top') return { ...e, x: s, y: room.y }
      if (wall === 'bottom') return { ...e, x: s, y: room.y + room.height - e.height }
      if (wall === 'left') return { ...e, x: room.x, y: s }
      return { ...e, x: room.x + room.width - e.width, y: s }
    }

    const anchors = elements.filter(isAnchor)
    const others = elements.filter((e) => !isAnchor(e))
    const byWall = new Map<RoomWall, VenueElement[]>()
    for (const a of anchors) {
      const wall = inferWall(room, a)
      byWall.set(wall, [...(byWall.get(wall) ?? []), a])
    }

    const resolved: VenueElement[] = []
    for (const [wall, list] of byWall.entries()) {
      const sorted = [...list].sort((a, b) => {
        const sa = wall === 'top' || wall === 'bottom' ? a.x : a.y
        const sb = wall === 'top' || wall === 'bottom' ? b.x : b.y
        return sa - sb || a.id.localeCompare(b.id)
      })
      const lenOf = (e: VenueElement) => (wall === 'top' || wall === 'bottom' ? e.width : e.height)
      const startOf = (e: VenueElement) => (wall === 'top' || wall === 'bottom' ? e.x : e.y)

      const cur = sorted.map((e) => setStart(wall, e, startOf(e)))
      for (let i = 1; i < cur.length; i++) {
        const prev = cur[i - 1]!
        const e = cur[i]!
        const need = startOf(prev) + lenOf(prev) + Math.max(gapFor(prev), gapFor(e))
        if (startOf(e) < need) cur[i] = setStart(wall, e, need)
      }
      for (let i = cur.length - 2; i >= 0; i--) {
        const next = cur[i + 1]!
        const e = cur[i]!
        const gap = Math.max(gapFor(next), gapFor(e))
        const maxEnd = startOf(next) - gap
        const end = startOf(e) + lenOf(e)
        if (end > maxEnd) cur[i] = setStart(wall, e, maxEnd - lenOf(e))
      }
      resolved.push(...cur)
    }
    return [...others, ...resolved]
  }

  const snappedAnchorResolved = resolveAnchorOverlaps(snappedAnchors)

  const snappedOthers = snappedAnchorResolved.map((e) =>
    isAnchor(e) ? e : { ...e, width: Math.max(gridSize, snap(e.width, gridSize)), height: Math.max(gridSize, snap(e.height, gridSize)) },
  )

  const collisionResolved = resolveElementCollisions({ room, gridSize, elements: snappedOthers })
  const tables = collisionResolved.filter((e) => e.type === 'table')
  const screen = collisionResolved.find((e) => e.type === 'screen')
  const mainSeat = rotatedSeats.find((s) => s.id === template.defaultMainSeatId)
  const screenC = screen ? elementCenter(screen) : { x: room.x, y: 0 }
  const mainP = mainSeat ? { x: mainSeat.x, y: mainSeat.y } : { x: 0, y: 0 }
  const facing = { x: screenC.x - mainP.x, y: screenC.y - mainP.y }
  const entrances = collisionResolved.filter((e) => e.type === 'entrance')
  const doorClearances = buildDoorClearances({
    room,
    gridSize,
    entrances,
    depth: metersToPx(defaultVenueRules.doorClearanceDepthM),
    pad: metersToPx(defaultVenueRules.wallMarginM),
  })
  const seatCount = args.seatCount
  const seedSeats = (count: number) => {
    if (tables.length === 0) return Array.from({ length: count }).map((_, i) => ({ id: `p${i + 1}`, x: 0, y: 0 }))
    const byArea = [...tables].sort((a, b) => b.width * b.height - a.width * a.height || a.id.localeCompare(b.id))
    const weights = byArea.map((t) => 2 * (t.width + t.height))
    const total = weights.reduce((a, b) => a + b, 0) || 1
    const alloc = byArea.map((t, i) => ({ t, n: Math.floor((count * weights[i]!) / total), w: weights[i]! }))
    let used = alloc.reduce((a, b) => a + b.n, 0)
    while (used < count) {
      alloc.sort((a, b) => b.w - a.w)
      alloc[0]!.n += 1
      used += 1
    }

    const seatDiameter = metersToPx(defaultVenueRules.seat.diameterM)
    const seatRadius = seatDiameter / 2
    const tableGap = metersToPx(defaultVenueRules.seat.tableGapM)
    const rowOffset0 = tableGap + seatRadius
    const seatPitch = seatDiameter + metersToPx(defaultVenueRules.seat.minGapM)
    const out: Seat[] = []
    let k = 1
    for (const a of alloc) {
      const n = a.n
      if (n <= 0) continue
      const t = a.t

      const tc = elementCenter(t)
      const sc = screen ? elementCenter(screen) : { x: tc.x, y: room.y }
      const facingLocal = { x: sc.x - tc.x, y: sc.y - tc.y }
      const dLeft = Math.abs(sc.x - t.x)
      const dRight = Math.abs(sc.x - (t.x + t.width))
      const dTop = Math.abs(sc.y - t.y)
      const dBottom = Math.abs(sc.y - (t.y + t.height))
      const startEdge: TableEdge = [
        { e: 'left' as const, d: dLeft },
        { e: 'right' as const, d: dRight },
        { e: 'top' as const, d: dTop },
        { e: 'bottom' as const, d: dBottom },
      ].sort((a, b) => a.d - b.d)[0]!.e
      const { leftEdge, rightEdge } = leftRightEdgesFromFacing(facingLocal)

      const edgeSeq = [startEdge, oppositeEdge(startEdge), leftEdge, rightEdge].filter((v, i, arr) => arr.indexOf(v) === i)
      const slotsByEdge = new Map<TableEdge, SeatSlot[]>()
      for (const e of edgeSeq) {
        const slots = buildTableEdgeSlots({ table: t, edge: e, seatPitch, rowOffset0, gridSize })
        slotsByEdge.set(e, chooseSlotsOnEdge(slots, slots.length))
      }
      const cursor = new Map<TableEdge, number>()
      const takeNext = (e: TableEdge) => {
        const slots = slotsByEdge.get(e) ?? []
        const i = cursor.get(e) ?? 0
        if (i >= slots.length) return null
        cursor.set(e, i + 1)
        return slots[i]!
      }

      let placed = 0
      while (placed < n) {
        let progressed = false
        for (const e of edgeSeq) {
          if (placed >= n) break
          const s0 = takeNext(e)
          if (!s0) continue
          out.push({ id: `p${k++}`, x: s0.x, y: s0.y })
          placed++
          progressed = true
        }
        if (!progressed) break
      }
    }
    while (out.length < count) out.push({ id: `p${k++}`, x: 0, y: 0 })
    return out.slice(0, count)
  }


  const seatsForLayout = rotatedSeats.length > 0 ? rotatedSeats : seatCount && seatCount > 0 ? seedSeats(seatCount) : []

  const laidOutSeats = layoutSeatsOnTables({ room, gridSize, tables, seats: seatsForLayout, facing, doorClearances })

  const rankedSeats =
    rotatedSeats.length > 0 || !seatCount || seatCount <= 0
      ? laidOutSeats
      : (() => {
          const mainTable =
            [...tables].sort((a, b) => b.width * b.height - a.width * a.height || a.id.localeCompare(b.id))[0] ?? null
          if (!mainTable) return laidOutSeats.map((s, i) => ({ ...s, id: String(i + 1) }))

          const sc = screen ? elementCenter(screen) : { x: mainTable.x + mainTable.width / 2, y: room.y }
          const dLeft = Math.abs(sc.x - mainTable.x)
          const dRight = Math.abs(sc.x - (mainTable.x + mainTable.width))
          const dTop = Math.abs(sc.y - mainTable.y)
          const dBottom = Math.abs(sc.y - (mainTable.y + mainTable.height))
          const startEdge = [
            { e: 'left' as const, d: dLeft },
            { e: 'right' as const, d: dRight },
            { e: 'top' as const, d: dTop },
            { e: 'bottom' as const, d: dBottom },
          ].sort((a, b) => a.d - b.d)[0]!.e

          const edgeKey = (s: Seat) => {
            const dxL = Math.abs(s.x - mainTable.x)
            const dxR = Math.abs(s.x - (mainTable.x + mainTable.width))
            const dyT = Math.abs(s.y - mainTable.y)
            const dyB = Math.abs(s.y - (mainTable.y + mainTable.height))
            return [
              { e: 'left' as const, d: dxL },
              { e: 'right' as const, d: dxR },
              { e: 'top' as const, d: dyT },
              { e: 'bottom' as const, d: dyB },
            ].sort((a, b) => a.d - b.d)[0]!.e
          }

          const perimeterT = (s: Seat) => {
            const e = edgeKey(s)
            const x0 = mainTable.x
            const x1 = mainTable.x + mainTable.width
            const y0 = mainTable.y
            const y1 = mainTable.y + mainTable.height

            const offset = (edge: typeof startEdge) => {
              if (startEdge === 'top') return edge === 'top' ? 0 : edge === 'right' ? 1 : edge === 'bottom' ? 2 : 3
              if (startEdge === 'right') return edge === 'right' ? 0 : edge === 'bottom' ? 1 : edge === 'left' ? 2 : 3
              if (startEdge === 'bottom') return edge === 'bottom' ? 0 : edge === 'left' ? 1 : edge === 'top' ? 2 : 3
              return edge === 'left' ? 0 : edge === 'top' ? 1 : edge === 'right' ? 2 : 3
            }

            const seg = offset(e)
            if (e === 'top' || e === 'bottom') {
              const t = (s.x - x0) / Math.max(1, x1 - x0)
              return seg + t
            }
            const t = (s.y - y0) / Math.max(1, y1 - y0)
            return seg + t
          }

          const sorted = [...laidOutSeats].sort((a, b) => perimeterT(a) - perimeterT(b) || a.id.localeCompare(b.id))
          return sorted.map((s, i) => ({ ...s, id: String(i + 1) }))
        })()

  return { room, elements: collisionResolved, seats: rankedSeats }
}
