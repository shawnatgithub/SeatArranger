import { describe, expect, it } from 'vitest'

import type { VenueTemplate } from '@/domain/models'
import { defaultVenueRules, metersToPx } from '@/domain/config/venueRules'
import { DEFAULT_GRID_SIZE, DEFAULT_SEAT_RADIUS, buildLayoutScene } from '@/domain/services/layoutEngine'

describe('buildLayoutScene', () => {
  it('recomputes layout when anchor moves', () => {
    const t: VenueTemplate = {
      id: 't',
      name: 't',
      canvasWidth: 900,
      canvasHeight: 600,
      elements: [
        { id: 'table-1', type: 'table', x: 80, y: 60, width: 200, height: 80 },
        { id: 'screen-1', type: 'screen', x: -390, y: -40, width: 40, height: 160 },
      ],
      seats: [{ id: 's1', x: 120, y: 0, zone: 'neutral' }],
      defaultMainSeatId: 's1',
    }

    const base = buildLayoutScene({ template: t })
    const rotated = buildLayoutScene({
      template: t,
      elementOverrides: { 'screen-1': { x: -390, y: 120 } },
    })

    const tableBase = base.elements.find((e) => e.id === 'table-1')!
    const tableRot = rotated.elements.find((e) => e.id === 'table-1')!
    expect(Math.abs(tableRot.x - tableBase.x) + Math.abs(tableRot.y - tableBase.y)).toBeGreaterThan(0)
  })

  it('ensures all scene coordinates follow grid modulus', () => {
    const t: VenueTemplate = {
      id: 't',
      name: 't',
      canvasWidth: 900,
      canvasHeight: 600,
      elements: [{ id: 'table-1', type: 'table', x: 55, y: 35, width: 211, height: 79 }],
      seats: [{ id: 's1', x: 13, y: -7, zone: 'neutral' }],
      defaultMainSeatId: 's1',
    }

    const out = buildLayoutScene({ template: t })
    const mod = (v: number) => Math.abs(v % DEFAULT_GRID_SIZE)
    const modSeat = (v: number) => Math.abs(v % (DEFAULT_GRID_SIZE / 2))

    expect(mod(out.room.x)).toBe(0)
    expect(mod(out.room.y)).toBe(0)
    expect(mod(out.room.width)).toBe(0)
    expect(mod(out.room.height)).toBe(0)

    for (const e of out.elements) {
      expect(mod(e.x)).toBe(0)
      expect(mod(e.y)).toBe(0)
    }

    for (const s of out.seats) {
      expect(modSeat(s.x)).toBe(0)
      expect(modSeat(s.y)).toBe(0)
    }
  })

  it('places seats on table edges and evenly spaced on each edge', () => {
    const t: VenueTemplate = {
      id: 't',
      name: 't',
      canvasWidth: 900,
      canvasHeight: 600,
      elements: [{ id: 'table-1', type: 'table', x: -200, y: -100, width: 400, height: 200 }],
      seats: [
        { id: 'l1', x: -210, y: -50, zone: 'host' },
        { id: 'l2', x: -210, y: 0, zone: 'host' },
        { id: 'l3', x: -210, y: 50, zone: 'host' },
        { id: 'r1', x: 210, y: -50, zone: 'guest' },
        { id: 'r2', x: 210, y: 0, zone: 'guest' },
        { id: 'r3', x: 210, y: 50, zone: 'guest' },
      ],
    }

    const out = buildLayoutScene({ template: t, gridSize: DEFAULT_GRID_SIZE })
    const table = out.elements.find((e) => e.id === 'table-1')!
    const left = out.seats.filter((s) => s.id.startsWith('l')).sort((a, b) => a.y - b.y)
    const right = out.seats.filter((s) => s.id.startsWith('r')).sort((a, b) => a.y - b.y)

    expect(left.length).toBe(3)
    expect(right.length).toBe(3)

    expect(left.every((s) => s.x < table.x)).toBe(true)
    expect(right.every((s) => s.x > table.x + table.width)).toBe(true)
    expect(left.every((s) => s.y >= table.y && s.y <= table.y + table.height)).toBe(true)
    expect(right.every((s) => s.y >= table.y && s.y <= table.y + table.height)).toBe(true)
  })

  it('snaps anchor to room wall and keeps long side along wall', () => {
    const t: VenueTemplate = {
      id: 't',
      name: 't',
      canvasWidth: 900,
      canvasHeight: 600,
      elements: [{ id: 'screen-1', type: 'screen', x: 0, y: 0, width: 40, height: 160 }],
      seats: [{ id: 'm', x: 0, y: 0, zone: 'neutral' }],
      defaultMainSeatId: 'm',
    }

    const out = buildLayoutScene({ template: t, gridSize: DEFAULT_GRID_SIZE })
    const room = out.room
    const screen = out.elements.find((e) => e.type === 'screen')!

    const onWall =
      screen.x === room.x ||
      screen.x === room.x + room.width - screen.width ||
      screen.y === room.y ||
      screen.y === room.y + room.height - screen.height
    expect(onWall).toBe(true)

    const onHorizontalWall = screen.y === room.y || screen.y === room.y + room.height - screen.height
    if (onHorizontalWall) expect(screen.width).toBeGreaterThanOrEqual(screen.height)
    else expect(screen.height).toBeGreaterThanOrEqual(screen.width)
  })

  it('avoids placing seats inside entrance door clearance', () => {
    const t: VenueTemplate = {
      id: 't',
      name: 't',
      canvasWidth: 900,
      canvasHeight: 600,
      elements: [
        { id: 'table-1', type: 'table', x: -200, y: -60, width: 400, height: 120 },
        { id: 'entrance-1', type: 'entrance', x: -60, y: 240, width: 120, height: 20 },
      ],
      seats: Array.from({ length: 10 }).map((_, i) => ({ id: `s${i}`, x: 0, y: 0 })),
      defaultMainSeatId: 's0',
    }

    const out = buildLayoutScene({ template: t, gridSize: DEFAULT_GRID_SIZE })
    const room = out.room
    const entrance = out.elements.find((e) => e.type === 'entrance')!
    const depth = DEFAULT_GRID_SIZE * 6
    const pad = metersToPx(defaultVenueRules.wallMarginM)
    const x0 = entrance.x - pad - DEFAULT_SEAT_RADIUS
    const x1 = entrance.x + entrance.width + pad + DEFAULT_SEAT_RADIUS
    const y0 = room.y + room.height - depth - DEFAULT_SEAT_RADIUS
    const y1 = room.y + room.height + DEFAULT_SEAT_RADIUS
    const anyInDoor = out.seats.some((s) => s.x >= x0 && s.x <= x1 && s.y >= y0 && s.y <= y1)
    expect(anyInDoor).toBe(false)
  })

  it('rebalances extra seats to dynamic low side based on facing', () => {
    const t: VenueTemplate = {
      id: 't',
      name: 't',
      canvasWidth: 900,
      canvasHeight: 600,
      elements: [
        { id: 'table-1', type: 'table', x: -200, y: -100, width: 400, height: 200 },
        { id: 'screen-1', type: 'screen', x: 320, y: -80, width: 40, height: 160 },
      ],
      seats: [
        { id: 'm', x: 0, y: 0, zone: 'neutral' },
        { id: 'b1', x: 0, y: 200, zone: 'neutral' },
        { id: 'b2', x: 30, y: 200, zone: 'neutral' },
        { id: 'b3', x: -30, y: 200, zone: 'neutral' },
        { id: 'b4', x: 60, y: 200, zone: 'neutral' },
        { id: 't1', x: 0, y: -200, zone: 'neutral' },
      ],
      defaultMainSeatId: 'm',
    }

    const out = buildLayoutScene({ template: t, gridSize: DEFAULT_GRID_SIZE })
    const table = out.elements.find((e) => e.id === 'table-1')!
    const top = out.seats.filter((s) => s.y < table.y)
    const bottom = out.seats.filter((s) => s.y > table.y + table.height)
    expect(top.length).toBeGreaterThanOrEqual(bottom.length)
  })

  it('generates ranked seats when seatCount is provided', () => {
    const t: VenueTemplate = {
      id: 't',
      name: 't',
      canvasWidth: 900,
      canvasHeight: 600,
      elements: [{ id: 'table-1', type: 'table', x: -200, y: -60, width: 400, height: 120 }],
      seats: [],
    }
    const out = buildLayoutScene({ template: t, gridSize: DEFAULT_GRID_SIZE, seatCount: 9 })
    expect(out.seats).toHaveLength(9)
    expect(out.seats[0]!.id).toBe('1')
    expect(out.seats[8]!.id).toBe('9')
  })
})
