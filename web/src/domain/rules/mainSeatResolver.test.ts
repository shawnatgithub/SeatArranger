import { describe, expect, it } from 'vitest'

import type { VenueTemplate } from '@/domain/models'
import { resolveMainSeatId } from '@/domain/rules/mainSeatResolver'

describe('resolveMainSeatId', () => {
  it('uses userMainSeatId when exists', () => {
    const template: VenueTemplate = {
      id: 't',
      name: 't',
      canvasWidth: 100,
      canvasHeight: 100,
      elements: [],
      seats: [
        { id: 'a', x: 10, y: 10 },
        { id: 'b', x: 20, y: 20 },
      ],
    }

    const res = resolveMainSeatId(template, 'b')
    expect(res.mainSeatId).toBe('b')
    expect(res.warnings).toHaveLength(0)
  })

  it('falls back to hostSeatAnchor nearest seat', () => {
    const template: VenueTemplate = {
      id: 't',
      name: 't',
      canvasWidth: 100,
      canvasHeight: 100,
      elements: [{ id: 'a', type: 'hostSeatAnchor', x: 12, y: 12, width: 1, height: 1 }],
      seats: [
        { id: 's1', x: 10, y: 10 },
        { id: 's2', x: 90, y: 90 },
      ],
    }

    const res = resolveMainSeatId(template)
    expect(res.mainSeatId).toBe('s1')
  })
})

