import type { VenueElement, VenueTemplate } from '@/domain/models'
import { defaultVenueRules, metersToPx, snapPx } from '@/domain/config/venueRules'

export type RoomShape = 'square' | 'rect'

export type LayoutId = 'long_table_two_sides' | 'double_rows_screen' | 'u_shape'

export const GRID_SIZE = defaultVenueRules.gridSizePx
export const METERS_PER_CELL = defaultVenueRules.metersPerCell
export const ROOM_PADDING = 60

const snapMajor = (v: number) => Math.round(v / GRID_SIZE) * GRID_SIZE
const snapStep = (v: number) => {
  const stepPx = metersToPx(defaultVenueRules.snapStepM)
  return snapPx(v, stepPx)
}

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
  const area = Math.ceil(n * defaultVenueRules.areaPerPersonM2)

  if (shape === 'square') {
    const side = Math.ceil(Math.sqrt(area))
    const w = Math.max(defaultVenueRules.minRoomWidthM, side)
    const h = Math.max(defaultVenueRules.minRoomHeightM, side)
    return { widthM: w, heightM: h, areaM2: area }
  }

  const ratio = defaultVenueRules.rectAspect
  const w0 = Math.ceil(Math.sqrt(area * ratio))
  const h0 = Math.ceil(w0 / ratio)
  const fixed = ensureArea(w0, h0, area)
  const w = Math.max(defaultVenueRules.minRoomWidthM, fixed.w)
  const h = Math.max(defaultVenueRules.minRoomHeightM, fixed.h)
  return { widthM: w, heightM: h, areaM2: area }
}

const buildAnchors = (args: { roomW: number; roomH: number; widthM: number; heightM: number }): VenueElement[] => {
  const roomX = -args.roomW / 2
  const roomY = -args.roomH / 2
  const room = { x: roomX, y: roomY, width: args.roomW, height: args.roomH }

  const wallMarginPx = metersToPx(defaultVenueRules.wallMarginM)

  const screenLenM = defaultVenueRules.screen.lengthM({ widthM: args.widthM, heightM: args.heightM })
  const screenLenPx = snapStep(metersToPx(screenLenM))
  const screenThPx = snapStep(metersToPx(defaultVenueRules.screen.thicknessM))

  const windowLenM = defaultVenueRules.window.lengthM({ widthM: args.widthM, heightM: args.heightM })
  const windowLenPx = snapStep(metersToPx(windowLenM))
  const windowThPx = snapStep(metersToPx(defaultVenueRules.window.thicknessM))

  const doorLenPx = snapStep(metersToPx(defaultVenueRules.door.lengthM))
  const doorThPx = snapStep(metersToPx(defaultVenueRules.door.thicknessM))
  const doorCornerPx = metersToPx(defaultVenueRules.door.cornerMarginM)

  const screenWall = defaultVenueRules.screen.wall
  const doorWall = defaultVenueRules.door.wall
  const wantedWindowWall = defaultVenueRules.window.wall
  const windowWall =
    wantedWindowWall !== doorWall
      ? wantedWindowWall
      : (['bottom', 'left', 'right', 'top'] as const).find((w) => w !== doorWall && w !== screenWall) ??
        (['bottom', 'left', 'right', 'top'] as const).find((w) => w !== doorWall) ??
        'bottom'

  const placeOnWall = (args: {
    id: string
    type: VenueElement['type']
    wall: typeof doorWall
    lengthPx: number
    thicknessPx: number
    cornerBias?: { cornerMarginPx: number; toward: 'start' | 'end' }
  }): VenueElement => {
    const { id, type, wall, lengthPx, thicknessPx, cornerBias } = args
    if (wall === 'top') {
      const x = snapMajor(room.x + (room.width - lengthPx) / 2)
      const y = room.y + wallMarginPx
      return { id, type, x, y, width: lengthPx, height: thicknessPx }
    }
    if (wall === 'bottom') {
      const x = snapMajor(room.x + (room.width - lengthPx) / 2)
      const y = room.y + room.height - thicknessPx - wallMarginPx
      return { id, type, x, y, width: lengthPx, height: thicknessPx }
    }
    if (wall === 'left') {
      const x = room.x + wallMarginPx
      const y = snapMajor(room.y + (room.height - lengthPx) / 2)
      if (cornerBias) {
        const base = cornerBias.toward === 'end' ? room.y + room.height - lengthPx - cornerBias.cornerMarginPx : room.y + cornerBias.cornerMarginPx
        return { id, type, x, y: snapMajor(base), width: thicknessPx, height: lengthPx }
      }
      return { id, type, x, y, width: thicknessPx, height: lengthPx }
    }
    const x = room.x + room.width - thicknessPx - wallMarginPx
    const y = snapMajor(room.y + (room.height - lengthPx) / 2)
    if (cornerBias) {
      const base = cornerBias.toward === 'end' ? room.y + room.height - lengthPx - cornerBias.cornerMarginPx : room.y + cornerBias.cornerMarginPx
      return { id, type, x, y: snapMajor(base), width: thicknessPx, height: lengthPx }
    }
    return { id, type, x, y, width: thicknessPx, height: lengthPx }
  }

  const screen = placeOnWall({ id: 'screen-1', type: 'screen', wall: screenWall, lengthPx: screenLenPx, thicknessPx: screenThPx })
  const window = placeOnWall({ id: 'window-1', type: 'window', wall: windowWall, lengthPx: windowLenPx, thicknessPx: windowThPx })

  const door =
    doorWall === 'left' || doorWall === 'right'
      ? placeOnWall({
          id: 'entrance-1',
          type: 'entrance',
          wall: doorWall,
          lengthPx: doorLenPx,
          thicknessPx: doorThPx,
          cornerBias: { cornerMarginPx: doorCornerPx, toward: 'end' },
        })
      : placeOnWall({ id: 'entrance-1', type: 'entrance', wall: doorWall, lengthPx: doorLenPx, thicknessPx: doorThPx })

  return [screen, window, door]
}

export const buildRoomTemplate = (args: { peopleCount: number; shape: RoomShape }): VenueTemplate => {
  const { widthM, heightM, areaM2 } = computeRoomMeters(args.peopleCount, args.shape)
  const roomW = metersToPx(widthM)
  const roomH = metersToPx(heightM)

  return {
    id: `room_${args.shape}_${widthM}x${heightM}_${areaM2}`,
    name: `房间 ${widthM}×${heightM}m（${areaM2}㎡）`,
    canvasWidth: roomW + ROOM_PADDING * 2,
    canvasHeight: roomH + ROOM_PADDING * 2,
    elements: buildAnchors({ roomW, roomH, widthM, heightM }),
    seats: [],
  }
}

export const generateTablesForLayout = (args: {
  layoutId: LayoutId
  room: { x: number; y: number; width: number; height: number }
  peopleCount: number
}): VenueElement[] => {
  const { room } = args
  const cx = room.x + room.width / 2
  const cy = room.y + room.height / 2
  const wallGap = metersToPx(defaultVenueRules.tableWallGapM)
  const aisle = metersToPx(defaultVenueRules.tableTableGapM)
  const moduleL = metersToPx(defaultVenueRules.tableModule.lengthM)
  const moduleW = metersToPx(defaultVenueRules.tableModule.widthM)

  if (args.layoutId === 'long_table_two_sides') {
    const modules = Math.max(2, Math.ceil(args.peopleCount / 4))
    const w = Math.min(room.width - wallGap * 2, moduleL * modules)
    const h = Math.min(room.height - wallGap * 2, moduleW * 2)
    return [
      {
        id: 'table-1',
        type: 'table' as const,
        x: snapMajor(cx - w / 2),
        y: snapMajor(cy - h / 2),
        width: Math.max(moduleL, snapStep(w)),
        height: Math.max(moduleW, snapStep(h)),
      },
    ]
  }

  if (args.layoutId === 'double_rows_screen') {
    const modules = Math.max(2, Math.ceil(args.peopleCount / 6))
    const w = Math.min((room.width - wallGap * 2 - aisle) / 2, moduleL * modules)
    const h = Math.min(room.height - wallGap * 2, moduleW * 2)
    const gap = Math.max(aisle, metersToPx(1.2))
    return [
      {
        id: 'table-1',
        type: 'table' as const,
        x: snapMajor(cx - gap / 2 - w),
        y: snapMajor(cy - h / 2),
        width: Math.max(moduleL, snapStep(w)),
        height: Math.max(moduleW, snapStep(h)),
      },
      {
        id: 'table-2',
        type: 'table' as const,
        x: snapMajor(cx + gap / 2),
        y: snapMajor(cy - h / 2),
        width: Math.max(moduleL, snapStep(w)),
        height: Math.max(moduleW, snapStep(h)),
      },
    ]
  }

  const arm = Math.min(room.height - wallGap * 2, moduleL * Math.max(2, Math.ceil(args.peopleCount / 6)))
  const thickness = moduleW * 2
  const innerW = Math.min(room.width - wallGap * 2 - thickness * 2, moduleL * Math.max(2, Math.ceil(args.peopleCount / 8)))
  const innerH = Math.min(room.height - wallGap * 2 - thickness * 2, moduleL * 2)
  const leftX = snapMajor(cx - innerW / 2 - thickness)
  const rightX = snapMajor(cx + innerW / 2)
  const topY = snapMajor(cy - innerH / 2 - thickness)
  const bottomY = snapMajor(cy + innerH / 2)

  return [
    { id: 'table-left', type: 'table' as const, x: leftX, y: snapMajor(cy - arm / 2), width: snapStep(thickness), height: snapStep(arm) },
    { id: 'table-right', type: 'table' as const, x: rightX, y: snapMajor(cy - arm / 2), width: snapStep(thickness), height: snapStep(arm) },
    { id: 'table-bottom', type: 'table' as const, x: snapMajor(cx - innerW / 2), y: bottomY, width: snapStep(innerW), height: snapStep(thickness) },
    { id: 'table-top', type: 'table' as const, x: snapMajor(cx - innerW / 2), y: topY, width: snapStep(innerW), height: snapStep(thickness) },
  ].map((t) => ({ ...t, width: Math.max(moduleL, t.width), height: Math.max(moduleW, t.height) }))
}
