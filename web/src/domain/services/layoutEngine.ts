import type { Seat, VenueElement, VenueTemplate } from '@/domain/models'

export type Room = { x: number; y: number; width: number; height: number }

export type LayoutScene = {
  room: Room
  elements: VenueElement[]
  seats: Seat[]
}

export const DEFAULT_GRID_SIZE = 20
export const DEFAULT_ROOM_PADDING = 60

const snap = (v: number, grid: number) => Math.round(v / grid) * grid

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

export const snapAnchorToRoomWall = (args: {
  room: Room
  gridSize: number
  element: Pick<VenueElement, 'type' | 'width' | 'height'>
  pos: { x: number; y: number }
}) => {
  const { room, gridSize, element, pos } = args
  const minX = room.x
  const maxX = room.x + room.width - element.width
  const minY = room.y
  const maxY = room.y + room.height - element.height

  const distLeft = Math.abs(pos.x - minX)
  const distRight = Math.abs(pos.x - maxX)
  const distTop = Math.abs(pos.y - minY)
  const distBottom = Math.abs(pos.y - maxY)

  const best = [
    { wall: 'left', d: distLeft },
    { wall: 'right', d: distRight },
    { wall: 'top', d: distTop },
    { wall: 'bottom', d: distBottom },
  ].sort((a, b) => a.d - b.d)[0]?.wall

  if (best === 'left') {
    return { x: minX, y: clamp(snap(pos.y, gridSize), minY, maxY) }
  }
  if (best === 'right') {
    return { x: maxX, y: clamp(snap(pos.y, gridSize), minY, maxY) }
  }
  if (best === 'top') {
    return { x: clamp(snap(pos.x, gridSize), minX, maxX), y: minY }
  }
  return { x: clamp(snap(pos.x, gridSize), minX, maxX), y: maxY }
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

const rebalanceEdges = (groups: Map<string, Seat[]>) => {
  const keys = [...groups.keys()]
  const tables = new Set(keys.map((k) => k.split('::')[0]))
  for (const t of tables) {
    const leftKey = `${t}::left`
    const rightKey = `${t}::right`
    const left = groups.get(leftKey) ?? []
    const right = groups.get(rightKey) ?? []
    if (left.length > right.length) {
      const moveCount = Math.ceil((left.length - right.length) / 2)
      const moved = left.splice(left.length - moveCount, moveCount)
      groups.set(leftKey, left)
      groups.set(rightKey, [...right, ...moved])
    }
  }
}

const layoutSeatsOnTables = (args: {
  room: Room
  gridSize: number
  tables: VenueElement[]
  seats: Seat[]
}) => {
  const { room, gridSize, tables } = args
  if (tables.length === 0) return args.seats

  const seatRadius = 18
  const offset = Math.max(gridSize * 2, snap(seatRadius * 2, gridSize))
  const minX = room.x + seatRadius
  const maxX = room.x + room.width - seatRadius
  const minY = room.y + seatRadius
  const maxY = room.y + room.height - seatRadius

  const groups = new Map<string, Seat[]>()
  const seatMeta = new Map<string, { tableId: string; edge: 'left' | 'right' | 'top' | 'bottom' }>()

  for (const s of args.seats) {
    const best = assignSeatToTableEdge(tables, s)
    if (!best) continue
    const key = `${best.table.id}::${best.edge}`
    groups.set(key, [...(groups.get(key) ?? []), s])
    seatMeta.set(s.id, { tableId: best.table.id, edge: best.edge })
  }

  rebalanceEdges(groups)

  const laidOut: Record<string, { x: number; y: number }> = {}

  for (const [key, seats] of groups.entries()) {
    const [tableId, edge] = key.split('::') as [string, 'left' | 'right' | 'top' | 'bottom']
    const table = tables.find((t) => t.id === tableId)
    if (!table) continue
    const sorted = [...seats].sort((a, b) => a.id.localeCompare(b.id))
    const n = sorted.length
    if (n === 0) continue

    if (edge === 'left' || edge === 'right') {
      const x = edge === 'left' ? table.x - offset : table.x + table.width + offset
      for (let i = 0; i < n; i++) {
        const y = table.y + ((i + 1) * table.height) / (n + 1)
        laidOut[sorted[i].id] = { x: clamp(snap(x, gridSize), minX, maxX), y: clamp(snap(y, gridSize), minY, maxY) }
      }
    } else {
      const y = edge === 'top' ? table.y - offset : table.y + table.height + offset
      for (let i = 0; i < n; i++) {
        const x = table.x + ((i + 1) * table.width) / (n + 1)
        laidOut[sorted[i].id] = { x: clamp(snap(x, gridSize), minX, maxX), y: clamp(snap(y, gridSize), minY, maxY) }
      }
    }
  }

  return args.seats.map((s) => {
    const p = laidOut[s.id]
    return p ? { ...s, x: p.x, y: p.y } : s
  })
}

export const buildLayoutScene = (args: {
  template: VenueTemplate
  roomPadding?: number
  gridSize?: number
  elementOverrides?: Record<string, { x: number; y: number }>
  seatOverrides?: Record<string, { x: number; y: number }>
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

  const baseAngle = getAngle(anchorBase)
  const curAngle = getAngle(anchorCur)
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
    const snapped = {
      ...e,
      width: Math.max(gridSize, snap(e.width, gridSize)),
      height: Math.max(gridSize, snap(e.height, gridSize)),
    }
    const pos = snapAnchorToRoomWall({
      room,
      gridSize,
      element: snapped,
      pos: { x, y },
    })
    return { ...snapped, x: pos.x, y: pos.y }
  })

  const snappedOthers = snappedAnchors.map((e) =>
    isAnchor(e) ? e : { ...e, width: Math.max(gridSize, snap(e.width, gridSize)), height: Math.max(gridSize, snap(e.height, gridSize)) },
  )

  const collisionResolved = resolveElementCollisions({ room, gridSize, elements: snappedOthers })
  const tables = collisionResolved.filter((e) => e.type === 'table')
  const laidOutSeats = layoutSeatsOnTables({ room, gridSize, tables, seats: rotatedSeats })
  return { room, elements: collisionResolved, seats: laidOutSeats }
}
