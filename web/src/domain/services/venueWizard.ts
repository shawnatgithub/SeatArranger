import type { VenueElement, VenueTemplate } from '@/domain/models'

export type RoomShape = 'square' | 'rect'

export type LayoutId = 'long_table_two_sides' | 'double_rows_screen' | 'u_shape'

export const GRID_SIZE = 20
export const METERS_PER_CELL = 1
export const ROOM_PADDING = 60

const snap = (v: number) => Math.round(v / GRID_SIZE) * GRID_SIZE

const ensureArea = (w: number, h: number, area: number) => {
  let ww = w
  let hh = h
  while (ww * hh < area) {
    if (ww <= hh) ww += 1
    else hh += 1
  }
  return { w: ww, h: hh }
}

export const computeRoomMeters = (peopleCount: number, shape: RoomShape) => {
  const n = Math.max(1, Math.floor(peopleCount))
  const area = Math.ceil(n * 1.5)

  if (shape === 'square') {
    const side = Math.ceil(Math.sqrt(area))
    return { widthM: side, heightM: side, areaM2: area }
  }

  const ratio = 4 / 3
  const w0 = Math.ceil(Math.sqrt(area * ratio))
  const h0 = Math.ceil(w0 / ratio)
  const fixed = ensureArea(w0, h0, area)
  return { widthM: fixed.w, heightM: fixed.h, areaM2: area }
}

export const buildRoomTemplate = (args: { peopleCount: number; shape: RoomShape }): VenueTemplate => {
  const { widthM, heightM, areaM2 } = computeRoomMeters(args.peopleCount, args.shape)
  const roomW = widthM * GRID_SIZE
  const roomH = heightM * GRID_SIZE

  return {
    id: `room_${args.shape}_${widthM}x${heightM}_${areaM2}`,
    name: `房间 ${widthM}×${heightM}m（${areaM2}㎡）`,
    canvasWidth: roomW + ROOM_PADDING * 2,
    canvasHeight: roomH + ROOM_PADDING * 2,
    elements: [],
    seats: [],
  }
}

export const generateTablesForLayout = (args: {
  layoutId: LayoutId
  room: { x: number; y: number; width: number; height: number }
}): VenueElement[] => {
  const { room } = args
  const cx = room.x + room.width / 2
  const cy = room.y + room.height / 2

  if (args.layoutId === 'long_table_two_sides') {
    const w = snap(room.width * 0.55)
    const h = snap(room.height * 0.28)
    return [
      {
        id: 'table-1',
        type: 'table' as const,
        x: snap(cx - w / 2),
        y: snap(cy - h / 2),
        width: Math.max(GRID_SIZE, w),
        height: Math.max(GRID_SIZE, h),
      },
    ]
  }

  if (args.layoutId === 'double_rows_screen') {
    const w = snap(room.width * 0.38)
    const h = snap(room.height * 0.22)
    const gap = snap(room.width * 0.08)
    return [
      {
        id: 'table-1',
        type: 'table' as const,
        x: snap(cx - gap / 2 - w),
        y: snap(cy - h / 2),
        width: Math.max(GRID_SIZE, w),
        height: Math.max(GRID_SIZE, h),
      },
      {
        id: 'table-2',
        type: 'table' as const,
        x: snap(cx + gap / 2),
        y: snap(cy - h / 2),
        width: Math.max(GRID_SIZE, w),
        height: Math.max(GRID_SIZE, h),
      },
    ]
  }

  const arm = snap(Math.min(room.width, room.height) * 0.22)
  const thickness = snap(Math.min(room.width, room.height) * 0.16)
  const innerW = snap(room.width * 0.45)
  const innerH = snap(room.height * 0.35)
  const leftX = snap(cx - innerW / 2 - thickness)
  const rightX = snap(cx + innerW / 2)
  const topY = snap(cy - innerH / 2 - thickness)
  const bottomY = snap(cy + innerH / 2)

  return [
    { id: 'table-left', type: 'table' as const, x: leftX, y: snap(cy - arm / 2), width: thickness, height: arm },
    { id: 'table-right', type: 'table' as const, x: rightX, y: snap(cy - arm / 2), width: thickness, height: arm },
    { id: 'table-bottom', type: 'table' as const, x: snap(cx - innerW / 2), y: bottomY, width: innerW, height: thickness },
    { id: 'table-top', type: 'table' as const, x: snap(cx - innerW / 2), y: topY, width: innerW, height: thickness },
  ].map((t) => ({ ...t, width: Math.max(GRID_SIZE, t.width), height: Math.max(GRID_SIZE, t.height) }))
}
