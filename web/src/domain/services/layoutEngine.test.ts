import { describe, expect, it } from 'vitest'

import type { VenueTemplate } from '@/domain/models'
import { DEFAULT_GRID_SIZE, buildLayoutScene } from '@/domain/services/layoutEngine'

describe('buildLayoutScene', () => {
  it('rotates seats when screen anchor is moved', () => {
    const t: VenueTemplate = {
      id: 't',
      name: 't',
      canvasWidth: 900,
      canvasHeight: 600,
      elements: [{ id: 'table-1', type: 'table', x: 0, y: 0, width: 200, height: 80 }],
      seats: [{ id: 's1', x: 120, y: 0, zone: 'neutral' }],
      defaultMainSeatId: 's1',
    }

    const base = buildLayoutScene({ template: t })
    const rotated = buildLayoutScene({
      template: t,
      elementOverrides: { 'auto-screen': { x: 200, y: 0 } },
    })

    const sBase = base.seats.find((s) => s.id === 's1')!
    const sRot = rotated.seats.find((s) => s.id === 's1')!
    expect(Math.abs(sRot.x - sBase.x) + Math.abs(sRot.y - sBase.y)).toBeGreaterThan(1)
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
})
