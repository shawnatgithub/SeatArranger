import { describe, expect, it } from 'vitest'

import type { VenueTemplate } from '@/domain/models'
import { DEFAULT_GRID_SIZE, buildLayoutScene } from '@/domain/services/layoutEngine'

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

    expect(mod(out.room.x)).toBe(0)
    expect(mod(out.room.y)).toBe(0)
    expect(mod(out.room.width)).toBe(0)
    expect(mod(out.room.height)).toBe(0)

    for (const e of out.elements) {
      expect(mod(e.x)).toBe(0)
      expect(mod(e.y)).toBe(0)
      expect(mod(e.width)).toBe(0)
      expect(mod(e.height)).toBe(0)
    }

    for (const s of out.seats) {
      expect(mod(s.x)).toBe(0)
      expect(mod(s.y)).toBe(0)
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

    const leftX = left[0]!.x
    const rightX = right[0]!.x
    expect(left.every((s) => s.x === leftX)).toBe(true)
    expect(right.every((s) => s.x === rightX)).toBe(true)

    expect(leftX).toBeLessThan(table.x)
    expect(rightX).toBeGreaterThan(table.x + table.width)

    const d1 = left[1]!.y - left[0]!.y
    const d2 = left[2]!.y - left[1]!.y
    expect(Math.abs(d1 - d2)).toBeLessThanOrEqual(DEFAULT_GRID_SIZE)
  })
})
