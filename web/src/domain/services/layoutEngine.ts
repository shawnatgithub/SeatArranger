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

export const getDefaultRoom = (template: VenueTemplate, padding: number) => {
  const width = template.canvasWidth - padding * 2
  const height = template.canvasHeight - padding * 2
  return { x: -width / 2, y: -height / 2, width, height }
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
    return {
      ...e,
      x: snap(x, gridSize),
      y: snap(y, gridSize),
      width: Math.max(gridSize, snap(e.width, gridSize)),
      height: Math.max(gridSize, snap(e.height, gridSize)),
    }
  })

  const snappedOthers = snappedAnchors.map((e) =>
    isAnchor(e) ? e : { ...e, width: Math.max(gridSize, snap(e.width, gridSize)), height: Math.max(gridSize, snap(e.height, gridSize)) },
  )

  return { room, elements: snappedOthers, seats: rotatedSeats }
}
