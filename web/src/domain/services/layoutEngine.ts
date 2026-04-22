import type { Seat, VenueElement, VenueTemplate } from '@/domain/models'

export type Room = { x: number; y: number; width: number; height: number }

export type LayoutScene = {
  room: Room
  elements: VenueElement[]
  seats: Seat[]
}

export const DEFAULT_GRID_SIZE = 20
export const DEFAULT_ROOM_PADDING = 60
export const DEFAULT_SEAT_RADIUS = 10

const snap = (v: number, grid: number) => Math.round(v / grid) * grid
const dist2 = (a: { x: number; y: number }, b: { x: number; y: number }) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2

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
  const w0 = Math.max(gridSize, snap(element.width, gridSize))
  const h0 = Math.max(gridSize, snap(element.height, gridSize))
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
  const depth = snap(args.depth, gridSize)
  const pad = snap(args.pad, gridSize)
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

  const seatRadius = DEFAULT_SEAT_RADIUS
  const minGap = snap(8, gridSize)
  const minDist = snap(seatRadius * 2 + minGap, gridSize)
  const wallMargin = snap(gridSize, gridSize)
  const offset = Math.max(gridSize * 2, snap(seatRadius * 2, gridSize))
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

  for (const [key, seats] of groups.entries()) {
    const [tableId, edge] = key.split('::') as [string, 'left' | 'right' | 'top' | 'bottom']
    const table = tables.find((t) => t.id === tableId)
    if (!table) continue
    const sorted = [...seats].sort((a, b) => a.id.localeCompare(b.id))
    const n = sorted.length
    if (n === 0) continue

    const edgeLength = edge === 'left' || edge === 'right' ? table.height : table.width
    const maxPerRow = Math.max(1, Math.floor(edgeLength / minDist) - 1)
    const rows = Math.max(1, Math.ceil(n / maxPerRow))
    let idx = 0

    for (let r = 0; r < rows; r++) {
      const remain = n - idx
      const k = Math.min(maxPerRow, remain)
      const rowOffset = offset + r * minDist
      if (edge === 'left' || edge === 'right') {
        const x = edge === 'left' ? table.x - rowOffset : table.x + table.width + rowOffset
        for (let i = 0; i < k; i++) {
          const y = table.y + ((i + 1) * table.height) / (k + 1)
          laidOut[sorted[idx]!.id] = { x: clamp(snap(x, gridSize), minX, maxX), y: clamp(snap(y, gridSize), minY, maxY) }
          idx++
        }
      } else {
        const y = edge === 'top' ? table.y - rowOffset : table.y + table.height + rowOffset
        for (let i = 0; i < k; i++) {
          const x = table.x + ((i + 1) * table.width) / (k + 1)
          laidOut[sorted[idx]!.id] = { x: clamp(snap(x, gridSize), minX, maxX), y: clamp(snap(y, gridSize), minY, maxY) }
          idx++
        }
      }
    }
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
      out.x = clamp(snap(out.x, gridSize), minX, maxX)
      out.y = clamp(snap(out.y, gridSize), minY, maxY)
    }
    return out
  }

  const outSeats = args.seats.map((s) => {
    const p = laidOut[s.id]
    if (!p) return s
    const safe = avoidDoor(p)
    return { ...s, x: safe.x, y: safe.y }
  })

  for (let iter = 0; iter < 40; iter++) {
    let moved = false
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
          outSeats[j] = { ...b, x: clamp(snap(b.x + signX * gridSize, gridSize), minX, maxX) }
          outSeats[i] = { ...a, x: clamp(snap(a.x - signX * gridSize, gridSize), minX, maxX) }
        } else {
          outSeats[j] = { ...b, y: clamp(snap(b.y + signY * gridSize, gridSize), minY, maxY) }
          outSeats[i] = { ...a, y: clamp(snap(a.y - signY * gridSize, gridSize), minY, maxY) }
        }
        moved = true
      }
    }
    if (!moved) break
  }

  return outSeats
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

  if (!hasScreen) {
    const h = snap(Math.max(120, room.height * 0.3), gridSize)
    const w = snap(20, gridSize)
    baseElements.push({
      id: 'auto-screen',
      type: 'screen',
      x: room.x + snap(10, gridSize),
      y: snap(-h / 2, gridSize),
      width: w,
      height: h,
    })
  }

  if (!hasEntrance) {
    const w = snap(56, gridSize)
    const h = snap(18, gridSize)
    baseElements.push({
      id: 'auto-entrance-left',
      type: 'entrance',
      x: room.x + snap(40, gridSize),
      y: room.y + room.height - h - snap(8, gridSize),
      width: w,
      height: h,
    })
    baseElements.push({
      id: 'auto-entrance-right',
      type: 'entrance',
      x: room.x + room.width - w - snap(40, gridSize),
      y: room.y + room.height - h - snap(8, gridSize),
      width: w,
      height: h,
    })
  }

  const windowW = snap(room.width * 0.5, gridSize)
  const windowH = snap(12, gridSize)
  baseElements.push({
    id: 'auto-window',
    type: 'window',
    x: snap(-windowW / 2, gridSize),
    y: room.y + snap(10, gridSize),
    width: windowW,
    height: windowH,
  })

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

  const snappedOthers = snappedAnchors.map((e) =>
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
  const doorClearances = buildDoorClearances({ room, gridSize, entrances, depth: gridSize * 6, pad: gridSize })
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

    const seatRadius = DEFAULT_SEAT_RADIUS
    const offset = Math.max(gridSize * 2, snap(seatRadius * 2, gridSize))
    const out: Seat[] = []
    let k = 1
    for (const a of alloc) {
      const n = a.n
      if (n <= 0) continue
      const t = a.t
      const perEdge = Math.ceil(n / 4)
      const edges: Array<'top' | 'right' | 'bottom' | 'left'> = ['top', 'right', 'bottom', 'left']
      let idx = 0
      for (const e of edges) {
        const m = Math.min(perEdge, n - idx)
        if (m <= 0) break
        for (let i = 0; i < m; i++) {
          if (e === 'top') {
            const x = t.x + ((i + 1) * t.width) / (m + 1)
            out.push({ id: `p${k++}`, x: snap(x, gridSize), y: snap(t.y - offset, gridSize) })
          } else if (e === 'bottom') {
            const x = t.x + ((i + 1) * t.width) / (m + 1)
            out.push({ id: `p${k++}`, x: snap(x, gridSize), y: snap(t.y + t.height + offset, gridSize) })
          } else if (e === 'left') {
            const y = t.y + ((i + 1) * t.height) / (m + 1)
            out.push({ id: `p${k++}`, x: snap(t.x - offset, gridSize), y: snap(y, gridSize) })
          } else {
            const y = t.y + ((i + 1) * t.height) / (m + 1)
            out.push({ id: `p${k++}`, x: snap(t.x + t.width + offset, gridSize), y: snap(y, gridSize) })
          }
        }
        idx += m
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
