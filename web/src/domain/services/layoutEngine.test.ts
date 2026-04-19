import { describe, expect, it } from 'vitest'

import type { VenueTemplate } from '@/domain/models'
import { buildLayoutScene } from '@/domain/services/layoutEngine'

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
})

