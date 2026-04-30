export type VenueRoomShape = 'square' | 'rect'

export type Wall = 'left' | 'right' | 'top' | 'bottom'

export type VenueRules = {
  metersPerCell: number
  gridSizePx: number
  snapStepM: number

  areaPerPersonM2: number
  rectAspect: number
  minRoomWidthM: number
  minRoomHeightM: number

  wallMarginM: number
  doorClearanceDepthM: number
  tableWallGapM: number
  tableTableGapM: number

  door: {
    count: number
    lengthM: number
    thicknessM: number
    wall: Wall
    cornerInsetM: number
    minGapM: number
  }

  window: {
    thicknessM: number
    wall: Wall
    lengthM: (room: { widthM: number; heightM: number }) => number
  }

  screen: {
    thicknessM: number
    wall: Wall
    lengthM: (room: { widthM: number; heightM: number }) => number
  }

  tableModule: {
    lengthM: number
    widthM: number
  }

  seat: {
    diameterM: number
    minGapM: number
    tableGapM: number
  }
}

export const defaultVenueRules: VenueRules = {
  metersPerCell: 0.2,
  gridSizePx: 20,
  snapStepM: 0.2,

  areaPerPersonM2: 1.5,
  rectAspect: 4 / 3,
  minRoomWidthM: 4,
  minRoomHeightM: 4,

  wallMarginM: 0.3,
  doorClearanceDepthM: 1.2,
  tableWallGapM: 0.6,
  tableTableGapM: 0.8,

  door: {
    count: 2,
    lengthM: 1.0,
    thicknessM: 0.2,
    wall: 'right',
    cornerInsetM: 0.4,
    minGapM: 0.2,
  },

  window: {
    thicknessM: 0.2,
    wall: 'bottom',
    lengthM: (room) => {
      const w = room.widthM
      return Math.max(2, Math.min(w - 1, Math.round(w * 0.5)))
    },
  },

  screen: {
    thicknessM: 0.2,
    wall: 'top',
    lengthM: (room) => {
      const w = room.widthM
      return Math.max(2, Math.min(w - 1, Math.round(w * 0.6)))
    },
  },

  tableModule: {
    lengthM: 1.2,
    widthM: 0.6,
  },

  seat: {
    diameterM: 0.6,
    minGapM: 0.1,
    tableGapM: 0.2,
  },
}

export const metersToPx = (m: number, rules = defaultVenueRules) => m * (rules.gridSizePx / rules.metersPerCell)

export const snapPx = (px: number, stepPx: number) => Math.round(px / stepPx) * stepPx
